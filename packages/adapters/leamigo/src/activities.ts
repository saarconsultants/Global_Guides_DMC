// Leamigo activities (partner endpoints /v1/activities*).
//
// Search: city (from the catalogue's own index) → every activity → each activity's options. We pick, per activity,
// the cheapest option + ticket that fits the group, so the itinerary carries a
// real price for this party size.
// Booking: availability (date) → reserve (prebooking, ~30 min hold) → book.
// Leamigo's platform fee for activities is only known after booking.

import { lmCall, isLive, LeamigoError } from './client';
import { inrRates, minorToInrPaise } from './fx';

const BOOKING_TIMEOUT_MS = 60_000;
const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'VND', 'IDR', 'CLP', 'ISK', 'HUF', 'TWD', 'UGX']);
const precisionOf = (cur: string) => (ZERO_DECIMAL.has(cur.toUpperCase()) ? 0 : 2);

export interface LeamigoActivity {
  id: string;                  // "LMA-<activityId>:<optionId>:<ticketId>"
  activityId: number;
  optionId: number;
  ticketId: string;
  title: string;
  optionName: string;
  city: string;
  durationMin: number;
  quantity: number;            // tickets to buy for this party
  pricePaise: number;          // supplier net for the whole party, INR (Leamigo fee excluded)
  perPersonPaise: number;      // one guest (per-person products) or the whole group (per-group products)
  priceBasis: 'person' | 'group';
  thumb?: string;
  description?: string;
  bookingType: 'date_required' | 'date_time_required' | 'open_dated';
  instantConfirmation: boolean;
  freeCancellation: boolean;
  cancellationRules: Array<{ hoursBefore: number; chargePct: number }>;
}

// ── small caches (catalogue data changes slowly) ────────────────────────────
const TTL = 10 * 60_000;
const cityCache = new Map<string, { at: number; id: number | null }>();
const optCache = new Map<number, { at: number; v: any }>();
const detCache = new Map<number, { at: number; v: any }>();

async function cityId(name: string, countryCode?: string): Promise<number | null> {
  const cc = countryCode?.toUpperCase();
  const k = name.trim().toLowerCase() + (cc ? `|${cc}` : '');
  const hit = cityCache.get(k);
  if (hit && Date.now() - hit.at < TTL) return hit.id;
  const res = await lmCall<any>('/v1/activities/cities', { query: { search: name, limit: '20' } });
  const rows: any[] = res?.data ?? [];
  const wanted = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const named = rows.filter((r) => String(r.city).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() === wanted);
  // Same city name exists in several countries (Paris FR / CA / US) — prefer ours.
  const exact = (cc ? named.find((r) => String(r.country_code).toUpperCase() === cc) : undefined) ?? (cc ? null : named[0] ?? null);
  const id = exact ? Number(exact.id) : null;
  cityCache.set(k, { at: Date.now(), id });
  return id;
}

async function cached(cache: Map<number, { at: number; v: any }>, id: number, path: string) {
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < TTL) return hit.v;
  const v = await lmCall<any>(path, { timeoutMs: 8_000 });
  cache.set(id, { at: Date.now(), v });
  return v;
}

function durationMin(d: any): number {
  const v = Number(d?.value ?? 0);
  if (!v) return 0;   // unknown — UI hides it
  const u = String(d?.unit ?? 'hours').toLowerCase();
  return Math.round(u.startsWith('min') ? v : u.startsWith('day') ? v * 480 : v * 60);
}

/** Cheapest option+ticket that sells to `pax` people on a fixed date or open date. */
function pickOption(options: any[], pax: number) {
  let best: { opt: any; ticket: any; qty: number; minor: number } | null = null;
  for (const o of options ?? []) {
    if (o.status !== 'active') continue;
    // Timed products (date_time_required / timeslots) are kept: the agent picks
    // a start time in the builder before the activity is added to the day.
    if (!['date_required', 'date_time_required'].includes(o.booking_type) && !o.is_open_dated) continue;
    const perGroup = ['per_vehicle', 'per_group'].includes(String(o.pricing_type));
    for (const t of o.tickets ?? []) {
      if (t.status !== 'active') continue;
      const qty = perGroup ? 1 : pax;
      if (qty < (t.min_purchase_qty ?? 1) || qty > (t.max_purchase_qty ?? 999)) continue;
      if (perGroup && o.default_capacity && pax > o.default_capacity) continue;
      const minor = Math.round(Number(t.price) * qty);
      if (!best || minor < best.minor) best = { opt: o, ticket: t, qty, minor };
    }
  }
  return best;
}

// ── which cities actually sell activities ──────────────────────────────────
// Leamigo's city directory has ~157k rows, with duplicates (two Florences, only
// one holding the products) and local spellings (Zürich). The catalogue itself
// says which city id each product sits under, so that is what we match against.
export interface LeamigoActivityCity { id: number; name: string; country: string; count: number }

const INDEX_TTL = 6 * 60 * 60_000;
const INDEX_RETRY_TTL = 5 * 60_000;   // a partial build is retried sooner
const INDEX_WAIT_MS = 4_000;          // a search never waits longer than this for the first build
const SEARCH_BUDGET_MS = 10_000;      // the caller gives up at 12s; return what is priced by then
const MAX_PAGES = 300;
const PAGE_SIZE = 100;
const CONCURRENCY = 8;

let cityIndex: { at: number; ttl: number; cities: LeamigoActivityCity[] } | null = null;
let cityIndexBuild: Promise<LeamigoActivityCity[]> | null = null;

async function mapLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) await fn(items[next++]!);
  }));
}

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
// Names Leamigo files separately or spells differently from our city list.
const ALIASES: Record<string, string[]> = { delhi: ['new delhi'], 'new delhi': ['delhi'], seville: ['sevilla'], sevilla: ['seville'] };
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

/** Leamigo's country is a long name ("Netherlands, Kingdom of the"); ours is a code. */
function inCountry(country: string, code?: string): boolean {
  if (!code) return true;
  const ours = norm(regionNames.of(code.toUpperCase()) ?? '');
  return !!ours && norm(country).startsWith(ours);
}

export function matchesCity(c: Pick<LeamigoActivityCity, 'name' | 'country'>, name: string, countryCode?: string): boolean {
  const q = norm(name);
  return [q, ...(ALIASES[q] ?? [])].includes(norm(c.name)) && inCountry(c.country, countryCode);
}

async function buildCityIndex(): Promise<LeamigoActivityCity[]> {
  const byId = new Map<number, LeamigoActivityCity>();
  let complete = true;
  const add = (rows: any[]) => {
    for (const a of rows) {
      const id = Number(a?.city?.id);
      if (!id) continue;
      const row = byId.get(id) ?? { id, name: '', country: '', count: 0 };
      row.count++;
      if (!row.name && a.city.name) {
        const raw = String(a.city.name);
        row.name = raw === raw.toUpperCase() ? raw.charAt(0) + raw.slice(1).toLowerCase() : raw;
      }
      if (!row.country && a.city.country) row.country = String(a.city.country);
      byId.set(id, row);
    }
  };
  const first = await lmCall<any>('/v1/activities', { query: { limit: String(PAGE_SIZE), page: '1' }, timeoutMs: 15_000 });
  add(first?.data ?? []);
  const pages = Math.min(Number(first?.meta?.total_pages ?? 1), MAX_PAGES);
  if (Number(first?.meta?.total_pages ?? 1) > MAX_PAGES) complete = false;
  await mapLimit(Array.from({ length: Math.max(0, pages - 1) }, (_, i) => i + 2), 5, async (page) => {
    try {
      const res = await lmCall<any>('/v1/activities', { query: { limit: String(PAGE_SIZE), page: String(page) }, timeoutMs: 15_000 });
      add(res?.data ?? []);
    } catch { complete = false; }
  });
  const cities = [...byId.values()].filter((c) => c.name).sort((x, y) => x.name.localeCompare(y.name));
  cityIndex = { at: Date.now(), ttl: complete ? INDEX_TTL : INDEX_RETRY_TTL, cities };
  return cities;
}

/** Every city with at least one Leamigo activity. */
export async function leamigoActivityCities(): Promise<LeamigoActivityCity[]> {
  if (!isLive()) return [];
  if (cityIndex && Date.now() - cityIndex.at < cityIndex.ttl) return cityIndex.cities;
  cityIndexBuild ??= buildCityIndex().finally(() => { cityIndexBuild = null; });
  return cityIndexBuild;
}

async function cityIdsFor(name: string, countryCode?: string): Promise<number[]> {
  const cities = await Promise.race([
    leamigoActivityCities().catch(() => null),
    new Promise<null>((r) => setTimeout(() => r(null), INDEX_WAIT_MS)),
  ]);
  const hits = (cities ?? []).filter((c) => matchesCity(c, name, countryCode)).map((c) => c.id);
  if (hits.length) return hits;
  const id = await cityId(name, countryCode);
  return id ? [id] : [];
}

async function listCityActivities(cid: number): Promise<any[]> {
  const rows: any[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await lmCall<any>('/v1/activities', { query: { city_id: String(cid), limit: String(PAGE_SIZE), page: String(page) }, timeoutMs: 10_000 });
    rows.push(...(res?.data ?? []));
    if (!res?.meta?.has_next_page) break;
  }
  return rows;
}

export async function searchLeamigoActivities(input: { cityName?: string; countryCode?: string; cityId?: number; pax: number }): Promise<{ activities: LeamigoActivity[]; warning?: string; partial?: boolean }> {
  if (!isLive()) return { activities: [] };
  const startedAt = Date.now();
  const ids = input.cityId ? [input.cityId] : await cityIdsFor(input.cityName ?? '', input.countryCode);
  if (!ids.length) return { activities: [], warning: `Leamigo has no activities in ${input.cityName}.` };
  const lists = await Promise.all(ids.map(listCityActivities));
  const list = [...new Map(lists.flat().map((a) => [a.id, a])).values()];
  const rates = await inrRates();
  const out: LeamigoActivity[] = [];
  let priced = 0;
  const work = mapLimit(list, CONCURRENCY, async (a: any) => {
    try {
      const [opts, det] = await Promise.all([
        cached(optCache, a.id, `/v1/activities/${a.id}/options`),
        cached(detCache, a.id, `/v1/activities/${a.id}`),
      ]);
      const cur = String(opts?.currency ?? a.pricing?.currency ?? 'USD');
      const p = pickOption(opts?.options ?? [], Math.max(1, input.pax));
      if (!p) return;
      const paise = minorToInrPaise(rates, p.minor, p.ticket.currency ?? cur, precisionOf(p.ticket.currency ?? cur));
      if (paise === null) return;
      const cp = p.opt.cancellation_policy ?? {};
      out.push({
        id: `LMA-${a.id}:${p.opt.id}:${p.ticket.id}`,
        activityId: a.id, optionId: p.opt.id, ticketId: String(p.ticket.id),
        title: a.title, optionName: p.opt.name, city: a.city?.name ?? input.cityName ?? '',
        durationMin: durationMin(det?.duration), quantity: p.qty, pricePaise: paise,
        perPersonPaise: p.qty > 1 ? Math.round(paise / p.qty) : paise,
        priceBasis: ['per_vehicle', 'per_group'].includes(String(p.opt.pricing_type)) ? 'group' : 'person',
        thumb: a.media?.cover_image_url, description: det?.short_description ?? det?.full_description?.slice(0, 400),
        bookingType: p.opt.is_open_dated ? 'open_dated' : (p.opt.booking_type === 'date_time_required' || p.opt.has_timeslots) ? 'date_time_required' : 'date_required',
        instantConfirmation: !!p.opt.is_instant_confirmation,
        freeCancellation: !!cp.free_cancellation,
        cancellationRules: (cp.rules ?? []).map((r: any) => ({ hoursBefore: Number(r.min_hours_before ?? r.minHoursBefore ?? 0), chargePct: Number(r.charge_percentage ?? r.chargePercent ?? 0) })),
      });
    } catch { /* skip one bad product, keep the rest */ }
    finally { priced++; }
  });
  // Large cities can outrun the budget: keep what is priced rather than lose it all.
  await Promise.race([work, new Promise((r) => setTimeout(r, Math.max(0, SEARCH_BUDGET_MS - (Date.now() - startedAt))))]);
  const activities = [...out].sort((x, y) => x.pricePaise - y.pricePaise);
  return { activities, partial: priced < list.length };
}

export interface ActivityTimeslot {
  start: string;               // HH:mm — send back as the reserve `timeslot`
  end?: string;
  available: boolean;
  capacity: number | null;
  priceMinor?: number;         // live per-slot price, supplier minor units
  currency?: string;
  tickets: Array<{ id: string; name: string; priceMinor?: number; currency?: string; min?: number; max?: number }>;
}

export async function activityAvailability(activityId: number, optionId: number, date: string, timeslot?: string): Promise<{ available: boolean; capacity: number | null; bookingType: string; timeslots: ActivityTimeslot[]; requiredFields: Array<{ id: string; level: string; required: boolean }> }> {
  const res = await lmCall<any>(`/v1/activities/${activityId}/options/${optionId}/availability`, { query: { date, timeslot }, timeoutMs: 15_000 });
  return {
    bookingType: String(res?.booking_type ?? ''),
    timeslots: (res?.timeslots ?? []).map((t: any): ActivityTimeslot => ({
      start: String(t.start_time ?? '').slice(0, 5), end: t.end_time ? String(t.end_time).slice(0, 5) : undefined,
      available: t.is_available !== false,
      capacity: t.available_capacity === undefined || t.available_capacity === null ? null : Number(t.available_capacity),
      priceMinor: typeof t.price === 'number' ? t.price : undefined, currency: t.currency ?? undefined,
      tickets: (t.tickets ?? []).map((k: any) => ({ id: String(k.id), name: String(k.name ?? ''), priceMinor: typeof k.price === 'number' ? k.price : undefined, currency: k.currency ?? undefined, min: k.min_purchase_qty, max: k.max_purchase_qty })),
    })).filter((t: ActivityTimeslot) => /^\d{2}:\d{2}$/.test(t.start)),
    available: !!res?.is_available,
    capacity: res?.is_unlimited ? null : Number(res?.available_capacity ?? 0),
    requiredFields: (res?.requiredInputFields ?? []).map((f: any) => ({ id: String(f.id), level: String(f.level ?? 'BOOKING'), required: !!f.required })),
  };
}

export interface ActivityReserveRequest {
  activityId: number; optionId: number; ticketId: string; quantity: number;
  visitDate?: string;
  timeslot?: string;           // HH:mm, required for date_time_required products
  leadName: string; email: string; phonePrefix: string; phoneNumber: string;
  guestNames: string[];        // length === quantity; [0] is the lead
  partnerReference?: string;
}

export async function reserveActivity(req: ActivityReserveRequest): Promise<{ prebookingId: string; expiresAt: string; totalMinor: number; currency: string; priceChange: string }> {
  const customers = Array.from({ length: req.quantity }, (_, i) => ({
    ...(i === 0 ? { isPrimary: true } : {}),
    inputFields: [
      { id: 'NAME', value: req.guestNames[i] ?? req.leadName },
      ...(i === 0 ? [{ id: 'EMAIL', value: req.email }, { id: 'PHONE', value: `${req.phonePrefix}${req.phoneNumber}` }] : []),
    ],
  }));
  const res = await lmCall<any>(`/v1/activities/${req.activityId}/options/${req.optionId}/reserve`, {
    method: 'POST', timeoutMs: 30_000,
    body: {
      ...(req.visitDate ? { visitDate: req.visitDate } : {}),
      ...(req.timeslot ? { timeslot: req.timeslot } : {}),
      customerName: req.leadName, email: req.email, mobilePrefix: req.phonePrefix, mobileNumber: req.phoneNumber,
      ...(req.partnerReference ? { partnerReference: req.partnerReference.slice(0, 60) } : {}),
      ticketTypes: [{ id: req.ticketId, quantity: req.quantity, customers }],
    },
  });
  if (!res?.prebooking_id) throw new LeamigoError(res?.message ?? 'Leamigo could not hold this activity.', 409, undefined, false);
  return { prebookingId: String(res.prebooking_id), expiresAt: res.expires_at, totalMinor: Number(res.total_amount ?? 0), currency: String(res.currency ?? ''), priceChange: String(res.price_change ?? 'none') };
}

export async function bookActivity(prebookingId: string): Promise<{ reference: string; bookingId: string; status: string; supplierPayableMinor: number }> {
  const res = await lmCall<any>('/v1/activities/bookings', { method: 'POST', body: { prebooking_id: prebookingId }, timeoutMs: BOOKING_TIMEOUT_MS });
  const d = res?.data ?? res;
  const reference = d?.booking_ref ?? d?.booking_reference;
  if (!reference) throw new LeamigoError('Leamigo returned no activity booking reference.', 502, undefined, false);
  return { reference: String(reference), bookingId: String(d.booking_id ?? ''), status: String(d.status ?? ''), supplierPayableMinor: Number(d.supplier_total_payable ?? 0) };
}

export async function activityBookingDetails(reference: string): Promise<{ status: string; platformFeeMinor: number; platformCurrency: string; voucherUrl?: string; supplierRef?: string }> {
  const d = await lmCall<any>(`/v1/activities/bookings/${encodeURIComponent(reference)}`, { timeoutMs: 15_000 });
  const url = typeof d?.voucher_file_url === 'string' && d.voucher_file_url.startsWith('http') ? d.voucher_file_url : undefined;
  return { status: String(d?.status ?? ''), platformFeeMinor: Number(d?.platform_fee_amount ?? 0), platformCurrency: String(d?.platform_currency ?? 'USD'), voucherUrl: url, supplierRef: d?.supplier_booking_ref ?? undefined };
}

export async function activityCancellationPolicy(reference: string): Promise<{ rules: Array<{ hoursBefore: number; chargePct: number }> }> {
  const res = await lmCall<any>(`/v1/activities/bookings/${encodeURIComponent(reference)}/cancellation-policy`, { timeoutMs: 15_000 });
  const p = res?.cancellation_policy ?? {};
  return { rules: (p.rules ?? []).map((r: any) => ({ hoursBefore: Number(r.minHoursBefore ?? r.min_hours_before ?? 0), chargePct: Number(r.chargePercent ?? r.charge_percentage ?? 0) })) };
}

export async function cancelActivityBooking(reference: string): Promise<{ status: string; penaltyMinor: number }> {
  const res = await lmCall<any>(`/v1/activities/bookings/${encodeURIComponent(reference)}/cancel`, { method: 'POST', timeoutMs: BOOKING_TIMEOUT_MS });
  return { status: String(res?.status ?? ''), penaltyMinor: Number(res?.penalty_amount ?? 0) };
}

/** Converter for supplier minor units → INR paise (null when the currency is unknown). */
export async function inrRatesFor(): Promise<(minor: number, currency: string) => number | null> {
  const rates = await inrRates();
  return (minor, currency) => minorToInrPaise(rates, minor, currency, precisionOf(currency));
}
