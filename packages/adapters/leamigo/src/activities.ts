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
  /** Tickets to buy: adults and children can need different ones. */
  lines: ActivityTicketLine[];
  /** Every option on sale for this party, cheapest first. The fields above are the cheapest. */
  options: LeamigoActivityOption[];
  category?: string;
  supplierName?: string;
  supplierVerified?: boolean;
}

/**
 * A product Leamigo lists with no option we can sell to this party: its options
 * call came back empty or failed. Shown so agents see the whole catalogue, with
 * Leamigo's listed starting price, but it can't be booked or added to a trip.
 */
export interface LeamigoListing {
  activityId: number;
  title: string;
  city: string;
  fromPaise: number | null;
  durationMin: number;
  thumb?: string;
  description?: string;
  category?: string;
  supplierName?: string;
  supplierVerified?: boolean;
}

export interface ActivityTicketLine { ticketId: string; quantity: number; name: string }

export interface LeamigoActivityOption {
  optionId: number;
  name: string;
  description?: string;
  ticketId: string;
  quantity: number;
  lines: ActivityTicketLine[];
  pricePaise: number;
  perPersonPaise: number;
  priceBasis: 'person' | 'group';
  bookingType: LeamigoActivity['bookingType'];
  instantConfirmation: boolean;
  freeCancellation: boolean;
  cancellationRules: Array<{ hoursBefore: number; chargePct: number }>;
  confirmationType?: string;
  voucherType?: string;
  capacity?: number;
  /** The supplier's price list: one guest, or one ticket for a whole group. */
  tickets: Array<{ id: string; name: string; unitPaise: number; rangeFrom: number | null; rangeTo: number | null }>;
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
  const res = await lmCall<any>('/v1/activities/cities', { query: { search: name, limit: '100' } });
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

const GROUP_PRICING = ['per_vehicle', 'per_group'];
const CHILD_TICKET = /\b(child|children|kid|kids|infant|youth)\b/i;

const numOrNull = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v));
const fitsQty = (t: any, qty: number) => qty >= Number(t.min_purchase_qty ?? 1) && qty <= Number(t.max_purchase_qty ?? 999);
const isChildTicket = (t: any) => CHILD_TICKET.test(String(t.name ?? '')) || (numOrNull(t.range_to) !== null && numOrNull(t.range_to)! < 18);
const cheapest = (tickets: any[]) => tickets.reduce((x, y) => (Number(y.price) < Number(x.price) ? y : x));

/**
 * The tickets this party needs from one option, or null if it can't be sold to
 * them. On per-person options the ticket range is an age band (Adult 18-65,
 * Child 5-17), so adults never get a child ticket however cheap. On per-ticket
 * options the range is a head count ("Ticket for 1-5 pax").
 */
function ticketsForParty(option: any, adults: number, children: number): Array<{ ticket: any; quantity: number }> | null {
  const active = (option.tickets ?? []).filter((t: any) => t.status === 'active');
  if (!active.length) return null;
  const pax = adults + children;

  if (GROUP_PRICING.includes(String(option.pricing_type))) {
    if (option.default_capacity && pax > option.default_capacity) return null;
    const fit = active.filter((t: any) => fitsQty(t, 1));
    return fit.length ? [{ ticket: cheapest(fit), quantity: 1 }] : null;
  }

  if (String(option.pricing_type) === 'per_ticket' && active.some((t: any) => numOrNull(t.range_to) !== null)) {
    const ranged = active.filter((t: any) => numOrNull(t.range_to) !== null);
    const covering = ranged.filter((t: any) => pax >= (numOrNull(t.range_from) ?? 1) && pax <= numOrNull(t.range_to)!);
    if (covering.length) return [{ ticket: cheapest(covering), quantity: 1 }];
    const largest = ranged.reduce((x: any, y: any) => (numOrNull(y.range_to)! > numOrNull(x.range_to)! ? y : x));
    const quantity = Math.ceil(pax / numOrNull(largest.range_to)!);
    return fitsQty(largest, quantity) ? [{ ticket: largest, quantity }] : null;
  }

  const forAdults = active.filter((t: any) => !isChildTicket(t) && fitsQty(t, adults));
  if (!forAdults.length) return null;
  const adult = cheapest(forAdults);
  if (!children) return [{ ticket: adult, quantity: adults }];
  const forChildren = active.filter((t: any) => isChildTicket(t) && fitsQty(t, children));
  if (!forChildren.length) return fitsQty(adult, pax) ? [{ ticket: adult, quantity: pax }] : null;
  return [{ ticket: adult, quantity: adults }, { ticket: cheapest(forChildren), quantity: children }];
}

function bookingTypeOf(o: any): LeamigoActivity['bookingType'] {
  return o.is_open_dated || o.booking_type === 'open' ? 'open_dated' : (o.booking_type === 'date_time_required' || o.has_timeslots) ? 'date_time_required' : 'date_required';
}

/** Every option this party can buy, priced in INR, cheapest first. */
function priceOptions(options: any[], adults: number, children: number, fallbackCurrency: string, rates: Awaited<ReturnType<typeof inrRates>>): LeamigoActivityOption[] {
  const toPaise = (minor: number, cur: string) => minorToInrPaise(rates, minor, cur, precisionOf(cur));
  const out: LeamigoActivityOption[] = [];
  for (const o of options ?? []) {
    if (o.status !== 'active') continue;
    if (!['date_required', 'date_time_required', 'open'].includes(o.booking_type) && !o.is_open_dated) continue;
    const picked = ticketsForParty(o, adults, children);
    if (!picked) continue;
    let total = 0;
    let priced = true;
    for (const { ticket, quantity } of picked) {
      const p = toPaise(Math.round(Number(ticket.price) * quantity), String(ticket.currency ?? fallbackCurrency));
      if (p === null) { priced = false; break; }
      total += p;
    }
    if (!priced) continue;
    const quantity = picked.reduce((sum, l) => sum + l.quantity, 0);
    const perGroup = GROUP_PRICING.includes(String(o.pricing_type)) || (String(o.pricing_type) === 'per_ticket' && numOrNull(picked[0]!.ticket.range_to) !== null);
    const lead = picked[0]!;
    const cp = o.cancellation_policy ?? {};
    out.push({
      optionId: o.id, name: String(o.name ?? ''), description: o.description ?? undefined,
      ticketId: String(lead.ticket.id), quantity,
      lines: picked.map((l) => ({ ticketId: String(l.ticket.id), quantity: l.quantity, name: String(l.ticket.name ?? '') })),
      pricePaise: total,
      perPersonPaise: perGroup ? total : (toPaise(Math.round(Number(lead.ticket.price)), String(lead.ticket.currency ?? fallbackCurrency)) ?? total),
      priceBasis: perGroup ? 'group' : 'person',
      bookingType: bookingTypeOf(o),
      instantConfirmation: !!o.is_instant_confirmation,
      confirmationType: o.confirmation_type ?? undefined, voucherType: o.voucher_type ?? undefined, capacity: o.default_capacity ?? undefined,
      freeCancellation: !!cp.free_cancellation,
      cancellationRules: (cp.rules ?? []).map((r: any) => ({ hoursBefore: Number(r.min_hours_before ?? r.minHoursBefore ?? 0), chargePct: Number(r.charge_percentage ?? r.chargePercentage ?? 0) })),
      tickets: (o.tickets ?? []).filter((t: any) => t.status === 'active').map((t: any) => ({
        id: String(t.id), name: String(t.name ?? ''),
        unitPaise: toPaise(Math.round(Number(t.price)), String(t.currency ?? fallbackCurrency)) ?? 0,
        rangeFrom: numOrNull(t.range_from), rangeTo: numOrNull(t.range_to),
      })),
    });
  }
  return out.sort((x, y) => x.pricePaise - y.pricePaise);
}

// ── which cities actually sell activities ──────────────────────────────────
// Leamigo's city directory has ~157k rows, with duplicates (two Florences, only
// one holding the products) and local spellings (Zürich). The catalogue itself
// says which city id each product sits under, so that is what we match against.
export interface LeamigoActivityCity { id: number; name: string; country: string; count: number }

const INDEX_TTL = 6 * 60 * 60_000;
const INDEX_RETRY_TTL = 5 * 60_000;   // a partial build is retried sooner
const SEARCH_BUDGET_MS = 50_000;      // the server stops a request at 60s; return what is priced by then
const LISTING_DETAIL_BUDGET_MS = 10_000; // duration and summary for unbookable rows are nice to have; never wait long
const CITY_INDEX_WAIT_MS = 6_000;
const PAGE_SIZE = 100;
const CONCURRENCY = 12;

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
  const pages = Number(first?.meta?.total_pages ?? 1);
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

/** Leamigo's full city directory (~157k), searched by name. Most have no activities yet. */
export async function searchLeamigoCityDirectory(query: string): Promise<Array<{ id: number; name: string; country: string }>> {
  if (!isLive() || query.trim().length < 2) return [];
  const res = await lmCall<any>('/v1/activities/cities', { query: { search: query.trim(), limit: '100' } });
  return (res?.data ?? []).map((r: any) => ({ id: Number(r.id), name: String(r.city), country: String(r.country_name ?? '') }));
}

/** A city's centre, for quoting a transfer when the hotel has no coordinates. */
export async function leamigoCityPoint(name: string, countryCode?: string): Promise<{ address: string; latitude: number; longitude: number } | null> {
  if (!isLive() || !name.trim()) return null;
  const res = await lmCall<any>('/v1/activities/cities', { query: { search: name.trim(), country_code: countryCode?.toUpperCase(), limit: '100' } });
  const row = (res?.data ?? []).find((r: any) => norm(String(r.city)) === norm(name));
  const latitude = Number(row?.lat), longitude = Number(row?.lng);
  if (!row || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { address: [row.city, row.country_name].filter(Boolean).join(', '), latitude, longitude };
}

async function cityIdsFor(name: string, countryCode?: string): Promise<number[]> {
  // The index crawls the whole catalogue; never let a slow Leamigo hold up the search. The directory is the fallback.
  const cities = await Promise.race([
    leamigoActivityCities().catch(() => null),
    new Promise<null>((r) => setTimeout(() => r(null), CITY_INDEX_WAIT_MS)),
  ]);
  const hits = (cities ?? []).filter((c) => matchesCity(c, name, countryCode)).map((c) => c.id);
  if (hits.length) return hits;
  const id = await cityId(name, countryCode);
  return id ? [id] : [];
}

/** Every listed product in a city. One bad page is retried; if it still fails, keep what came back. */
async function listCityActivities(cid: number): Promise<{ rows: any[]; complete: boolean }> {
  const rows: any[] = [];
  const fetchPage = (page: number) => lmCall<any>('/v1/activities', { query: { city_id: String(cid), limit: String(PAGE_SIZE), page: String(page) }, timeoutMs: 12_000 });
  for (let page = 1; ; page++) {
    let res: any;
    try {
      res = await fetchPage(page).catch(() => fetchPage(page));
    } catch (e) {
      if (!rows.length) throw e;
      return { rows, complete: false };
    }
    rows.push(...(res?.data ?? []));
    if (!res?.meta?.has_next_page) return { rows, complete: true };
  }
}

export async function searchLeamigoActivities(input: { cityName?: string; countryCode?: string; cityId?: number; cityIds?: number[]; adults: number; children?: number }): Promise<{ activities: LeamigoActivity[]; listOnly: LeamigoListing[]; warning?: string; partial?: boolean }> {
  if (!isLive()) return { activities: [], listOnly: [] };
  const startedAt = Date.now();
  const adults = Math.max(1, input.adults), children = Math.max(0, input.children ?? 0);
  const ids = input.cityId ? [input.cityId] : input.cityIds?.length ? input.cityIds : await cityIdsFor(input.cityName ?? '', input.countryCode);
  if (!ids.length) return { activities: [], listOnly: [], warning: `Leamigo has no activities in ${input.cityName}.` };
  const lists = await Promise.all(ids.map(listCityActivities));
  const list = [...new Map(lists.flatMap((l) => l.rows).map((a) => [a.id, a])).values()];
  const rates = await inrRates();
  const out: LeamigoActivity[] = [];
  const sellable = new Set<number>();
  let finished = 0, failed = 0;
  const work = mapLimit(list, CONCURRENCY, async (a: any) => {
    try {
      // One retry: a blip on one product shouldn't hide it from the agent.
      const opts = await cached(optCache, a.id, `/v1/activities/${a.id}/options`)
        .catch(() => cached(optCache, a.id, `/v1/activities/${a.id}/options`));
      const options = priceOptions(opts?.options ?? [], adults, children, String(opts?.currency ?? a.pricing?.currency ?? 'USD'), rates);
      const best = options[0];
      if (!best) return;
      const det = await cached(detCache, a.id, `/v1/activities/${a.id}`).catch(() => null);
      sellable.add(a.id);
      out.push({
        id: `LMA-${a.id}:${best.optionId}:${best.ticketId}`,
        activityId: a.id, optionId: best.optionId, ticketId: best.ticketId,
        title: a.title, optionName: best.name, city: a.city?.name ?? input.cityName ?? '',
        durationMin: durationMin(det?.duration), quantity: best.quantity, pricePaise: best.pricePaise,
        perPersonPaise: best.perPersonPaise, priceBasis: best.priceBasis,
        thumb: a.media?.cover_image_url, description: det?.short_description ?? a.title,
        bookingType: best.bookingType, instantConfirmation: best.instantConfirmation,
        freeCancellation: best.freeCancellation, cancellationRules: best.cancellationRules,
        lines: best.lines, options,
        category: a.category?.name ?? undefined, supplierName: a.supplier?.name ?? undefined, supplierVerified: !!a.supplier?.is_verified,
      });
    } catch { failed++; }
    finally { finished++; }
  });
  // Keep what is priced if a huge city would outlast the server's own time limit.
  await Promise.race([work, new Promise((r) => setTimeout(r, Math.max(0, SEARCH_BUDGET_MS - (Date.now() - startedAt))))]);
  const activities = [...out].sort((x, y) => x.pricePaise - y.pricePaise);
  const partial = finished < list.length || failed > 0 || lists.some((l) => !l.complete);

  // Everything else stays visible, as a listing. Its details are best effort.
  const rest = list.filter((a: any) => !sellable.has(a.id));
  const details = new Map<number, any>();
  const detailsUntil = Date.now() + LISTING_DETAIL_BUDGET_MS;
  await Promise.race([
    mapLimit(rest, CONCURRENCY, async (a: any) => {
      if (Date.now() > detailsUntil) return;
      const det = await cached(detCache, a.id, `/v1/activities/${a.id}`).catch(() => null);
      if (det) details.set(a.id, det);
    }),
    new Promise((r) => setTimeout(r, LISTING_DETAIL_BUDGET_MS)),
  ]);
  const listOnly: LeamigoListing[] = rest.map((a: any) => {
    const det = details.get(a.id);
    const from = Number(a.pricing?.from_price);
    const cur = String(a.pricing?.currency ?? 'USD');
    return {
      activityId: a.id, title: a.title, city: a.city?.name ?? input.cityName ?? '',
      fromPaise: from > 0 ? minorToInrPaise(rates, from, cur, precisionOf(cur)) : null,
      durationMin: durationMin(det?.duration),
      thumb: a.media?.cover_image_url,
      description: det?.short_description ? String(det.short_description).slice(0, 200) : undefined,
      category: a.category?.name ?? undefined, supplierName: a.supplier?.name ?? undefined, supplierVerified: !!a.supplier?.is_verified,
    };
  });
  return { activities, listOnly, partial };
}

export interface LeamigoActivityInfo {
  description?: string; included: string[]; excluded: string[]; knowBeforeYouGo?: string;
  operatingHours: Array<{ day: number; start: string; end: string; closed: boolean }>;
  blackoutDates: string[]; validFrom?: string; validTo?: string; productCode?: string;
  address?: string; pickupIncluded?: boolean; latitude?: number; longitude?: number;
  images: string[]; policies: string[]; highlights: string[];
  ticketUsage?: string; meetingPoint?: string; meetingInstructions?: string;
  options: Array<{ id: number; name: string; minTravellers?: number; maxTravellers?: number; terms?: string; howToUse?: string; included: string[]; excluded: string[]; eligibility: string[]; voucherType?: string }>;
}

const strings = (v: unknown): string[] => (Array.isArray(v) ? v : v ? [v] : [])
  .map((x: any) => (typeof x === 'string' ? x : x?.text ?? x?.name ?? x?.description ?? x?.title ?? ''))
  .map((x: any) => String(x).trim()).filter(Boolean);

/** Everything Leamigo publishes about one activity, for the details view. */
export async function leamigoActivityInfo(activityId: number): Promise<LeamigoActivityInfo> {
  const [d, o] = await Promise.all([
    cached(detCache, activityId, `/v1/activities/${activityId}`),
    cached(optCache, activityId, `/v1/activities/${activityId}/options`),
  ]);
  const media = d?.media ?? [];
  const images = (Array.isArray(media) ? media : [media.cover_image_url, ...(media.images ?? []), ...(media.gallery ?? [])])
    .filter((m: any) => typeof m === 'string' || !m?.type || m.type === 'image')
    .map((m: any) => (typeof m === 'string' ? m : m?.url ?? m?.image_url)).filter(Boolean);
  return {
    description: d?.full_description ?? d?.short_description ?? undefined,
    included: strings(d?.included), excluded: strings(d?.excluded),
    knowBeforeYouGo: strings(d?.know_before_you_go).join('\n') || undefined,
    operatingHours: (d?.operating_hours ?? []).map((h: any) => ({ day: Number(h.day_of_week), start: String(h.start_time ?? '').slice(0, 5), end: String(h.end_time ?? '').slice(0, 5), closed: !!h.is_closed })),
    blackoutDates: strings(d?.blackout_dates).concat((d?.blackout_dates ?? []).map((b: any) => b?.date ?? '').filter(Boolean)),
    validFrom: d?.valid_from ?? undefined, validTo: d?.valid_to ?? undefined, productCode: d?.product_code ?? undefined,
    address: [d?.location?.address, d?.location?.city, d?.location?.country].filter(Boolean).join(', ') || undefined,
    pickupIncluded: d?.location?.pickup_included ?? undefined,
    latitude: Number(d?.location?.lat) || undefined, longitude: Number(d?.location?.lng) || undefined,
    images: [...new Set<string>(images)],
    // "General: free shuttle" — the title alone when the supplier repeated it as the text.
    policies: [...new Set<string>((d?.policies ?? []).map((p: any) => (p?.description && p.description !== p.title ? `${p.title}: ${p.description}` : String(p?.title ?? p?.description ?? ''))).filter(Boolean))],
    highlights: strings(d?.highlights),
    ticketUsage: d?.ticket_usage_instructions ?? undefined,
    meetingPoint: d?.location?.meeting_point ?? undefined,
    meetingInstructions: d?.location?.meeting_instructions ?? undefined,
    options: (o?.options ?? []).map((x: any) => ({
      id: x.id, name: String(x.name ?? ''),
      minTravellers: Math.min(...(x.tickets ?? []).map((t: any) => Number(t.min_purchase_qty ?? 1)).filter((n: number) => n > 0)),
      maxTravellers: Math.max(...(x.tickets ?? []).map((t: any) => Number(t.max_purchase_qty ?? 0))),
      terms: x.terms_and_conditions ?? undefined, howToUse: x.how_to_use ?? undefined,
      included: strings(x.included), excluded: strings(x.excluded), eligibility: strings(x.eligibility),
      voucherType: x.voucher_type ?? undefined,
    })),
  };
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

export async function activityAvailability(activityId: number, optionId: number, date: string, timeslot?: string): Promise<{ available: boolean; capacity: number | null; bookingType: string; timeslots: ActivityTimeslot[]; requiredFields: Array<{ id: string; name: string; level: string; required: boolean }> }> {
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
    requiredFields: (res?.requiredInputFields ?? []).map((f: any) => ({ id: String(f.id), name: String(f.name ?? f.id), level: String(f.level ?? 'BOOKING'), required: !!f.required })),
  };
}

const STANDARD_FIELDS = new Set(['NAME', 'FULL_NAME', 'EMAIL', 'PHONE']);

export interface ActivityReserveRequest {
  activityId: number; optionId: number; lines: Array<{ ticketId: string; quantity: number }>;
  visitDate?: string;
  timeslot?: string;           // HH:mm, required for date_time_required products
  leadName: string; email: string; phonePrefix: string; phoneNumber: string;
  guestNames: string[];        // one per ticket across all lines; [0] is the lead
  partnerReference?: string;
}

export async function reserveActivity(req: ActivityReserveRequest): Promise<{ prebookingId: string; expiresAt: string; totalMinor: number; currency: string; priceChange: string }> {
  // Suppliers can ask their own questions ("Full Name", id 410); answer the ones we know.
  const date = req.visitDate ?? new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const av = await activityAvailability(req.activityId, req.optionId, date, req.timeslot).catch(() => null);
  const asked = (av?.requiredFields ?? []).filter((f) => f.required && !STANDARD_FIELDS.has(f.id.toUpperCase()));
  const phone = `${req.phonePrefix}${req.phoneNumber}`;
  const answer = (f: { id: string; name: string }, guestName: string) => {
    const label = `${f.id} ${f.name}`;
    return /e-?mail/i.test(label) ? req.email : /phone|mobile/i.test(label) ? phone : /name/i.test(label) ? guestName : '';
  };
  let guest = 0;
  const ticketTypes = req.lines.map((l) => ({
    id: l.ticketId, quantity: l.quantity,
    customers: Array.from({ length: l.quantity }, () => {
      const i = guest++;
      const name = req.guestNames[i] ?? req.leadName;
      const mine = asked.filter((f) => f.level === 'ALL_CUSTOMER' || i === 0);
      return {
        ...(i === 0 ? { isPrimary: true } : {}),
        inputFields: [
          { id: 'NAME', value: name },
          ...(i === 0 ? [{ id: 'EMAIL', value: req.email }, { id: 'PHONE', value: phone }] : []),
          ...mine.map((f) => ({ id: f.id, value: answer(f, name) })),
        ],
      };
    }),
  }));
  const res = await lmCall<any>(`/v1/activities/${req.activityId}/options/${req.optionId}/reserve`, {
    method: 'POST', timeoutMs: 30_000,
    body: {
      ...(req.visitDate ? { visitDate: req.visitDate } : {}),
      ...(req.timeslot ? { timeslot: req.timeslot } : {}),
      customerName: req.leadName, email: req.email, mobilePrefix: req.phonePrefix, mobileNumber: req.phoneNumber,
      ...(req.partnerReference ? { partnerReference: req.partnerReference.slice(0, 60) } : {}),
      ticketTypes,
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
