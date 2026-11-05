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
 * A product Leamigo lists with no option we can sell to this party (yet): its
 * options call came back empty, failed, or wasn't made in time. Shown so agents see the whole catalogue, with
 * Leamigo's listed starting price, but it can't be booked or added to a trip.
 */
export interface LeamigoListing {
  activityId: number;
  title: string;
  city: string;
  /** True when Leamigo answered with nothing to sell. False when we didn't get an answer yet. */
  checked: boolean;
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
const optCache = new Map<number, { at: number; v: any }>();
const detCache = new Map<number, { at: number; v: any }>();

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
      optionId: o.id, name: String(o.name ?? ''), description: plain(o.description),
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
// Never list the whole catalogue (244+ pages at once): it knocked Leamigo's activity listing over for everyone.
// Cities are found with Leamigo's own name filter or its city directory instead.
export interface LeamigoActivityCity { id: number; name: string; country: string }

const OPTIONS_BUDGET_MS = 30_000;     // from the start of the search; the rest is checked when opened
const LISTING_DETAIL_BUDGET_MS = 5_000; // duration and summary for unbookable rows are nice to have; never wait long
const SLOW_CALL_MS = 5_000;
const SUPPLIER_STRIKES = 4;
const PAGE_SIZE = 100;
const CONCURRENCY = 6;

async function mapLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) await fn(items[next++]!);
  }));
}

/** Some suppliers (Headout) send HTML. Agents and vouchers need plain text. */
function plain(v: unknown): string | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  const text = String(v)
    .replace(/<\s*li[^>]*>/gi, '\n• ')
    .replace(/<\s*br\s*\/?>|<\/\s*(p|div|ul|ol|h[1-6]|li)\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return text || undefined;
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

const namesFor = (name: string) => { const q = norm(name); return [name.trim(), ...(ALIASES[q] ?? [])]; };

export function matchesCity(c: Pick<LeamigoActivityCity, 'name' | 'country'>, name: string, countryCode?: string): boolean {
  const q = norm(name);
  return [q, ...(ALIASES[q] ?? [])].includes(norm(c.name)) && inCountry(c.country, countryCode);
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

/** Every listed product for a filter. One bad page is retried; if it still fails, keep what came back. */
async function listActivities(filter: Record<string, string>): Promise<{ rows: any[]; complete: boolean }> {
  const rows: any[] = [];
  const fetchPage = (page: number) => lmCall<any>('/v1/activities', { query: { ...filter, limit: String(PAGE_SIZE), page: String(page) }, timeoutMs: 12_000 });
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

export async function searchLeamigoActivities(input: { cityName?: string; countryCode?: string; cityId?: number; adults: number; children?: number; optionsBudgetMs?: number }): Promise<{ activities: LeamigoActivity[]; listOnly: LeamigoListing[]; warning?: string; partial?: boolean }> {
  if (!isLive()) return { activities: [], listOnly: [] };
  const startedAt = Date.now();
  const adults = Math.max(1, input.adults), children = Math.max(0, input.children ?? 0);
  // By name: one city can sit under several ids (two Florences, only one holding the products).
  const names = input.cityId ? [] : namesFor(input.cityName ?? '');
  const lists = input.cityId
    ? [await listActivities({ city_id: String(input.cityId) })]
    : await Promise.all(names.map((city) => listActivities({ city })));
  let rows = lists.flatMap((l) => l.rows);
  if (!input.cityId) {
    // The filter also finds other cities with the same name; prefer the searched country.
    const named = rows.filter((a) => a.city && matchesCity({ name: String(a.city.name ?? ''), country: '' }, input.cityName ?? ''));
    const here = named.filter((a) => matchesCity({ name: String(a.city.name ?? ''), country: String(a.city.country ?? '') }, input.cityName ?? '', input.countryCode));
    rows = here.length ? here : named;
  }
  if (!rows.length) return { activities: [], listOnly: [], warning: `Leamigo has no activities in ${input.cityName}.`, partial: lists.some((l) => !l.complete) };
  const list = [...new Map(rows.map((a) => [a.id, a])).values()];
  const rates = await inrRates();
  const out: LeamigoActivity[] = [];
  const sellable = new Set<number>();
  const checked = new Set<number>();
  // Some suppliers answer options calls live and slowly. Leave them alone once they struggle:
  // those calls have knocked Leamigo's whole API over. What isn't checked here is checked when an agent opens it.
  const strikes = new Map<string, number>();
  const strike = (supplier: string) => strikes.set(supplier, (strikes.get(supplier) ?? 0) + 1);
  const budget = input.optionsBudgetMs ?? OPTIONS_BUDGET_MS;
  const optionsUntil = startedAt + budget;
  const work = mapLimit(list, CONCURRENCY, async (a: any) => {
    const supplier = String(a.supplier?.name ?? '');
    if (Date.now() > optionsUntil || (strikes.get(supplier) ?? 0) >= SUPPLIER_STRIKES) return;
    const t0 = Date.now();
    try {
      const opts = await cached(optCache, a.id, `/v1/activities/${a.id}/options`);
      if (Date.now() - t0 > SLOW_CALL_MS) strike(supplier);
      checked.add(a.id);
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
        thumb: a.media?.cover_image_url, description: plain(det?.short_description) ?? a.title,
        bookingType: best.bookingType, instantConfirmation: best.instantConfirmation,
        freeCancellation: best.freeCancellation, cancellationRules: best.cancellationRules,
        lines: best.lines, options,
        category: a.category?.name ?? undefined, supplierName: a.supplier?.name ?? undefined, supplierVerified: !!a.supplier?.is_verified,
      });
    } catch { strike(supplier); }
  });
  await Promise.race([work, new Promise((r) => setTimeout(r, budget - Math.min(budget, Date.now() - startedAt)))]);
  const activities = [...out].sort((x, y) => x.pricePaise - y.pricePaise);

  // Everything else stays visible, as a listing. Its details are best effort.
  const rest = list.filter((a: any) => !sellable.has(a.id));
  const details = new Map<number, any>();
  const detailsUntil = Date.now() + LISTING_DETAIL_BUDGET_MS;
  await Promise.race([
    mapLimit(rest.filter((a: any) => (strikes.get(String(a.supplier?.name ?? '')) ?? 0) < SUPPLIER_STRIKES), CONCURRENCY, async (a: any) => {
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
      checked: checked.has(a.id),
      fromPaise: from > 0 ? minorToInrPaise(rates, from, cur, precisionOf(cur)) : null,
      durationMin: durationMin(det?.duration),
      thumb: a.media?.cover_image_url,
      description: plain(det?.short_description)?.slice(0, 200),
      category: a.category?.name ?? undefined, supplierName: a.supplier?.name ?? undefined, supplierVerified: !!a.supplier?.is_verified,
    };
  });
  return { activities, listOnly, partial: list.length > checked.size || lists.some((l) => !l.complete) };
}

/** One activity's options for this party, checked live when an agent opens a listing. */
export async function leamigoActivityOptions(activityId: number, adults: number, children = 0): Promise<LeamigoActivityOption[]> {
  if (!isLive()) return [];
  const opts = await cached(optCache, activityId, `/v1/activities/${activityId}/options`);
  return priceOptions(opts?.options ?? [], Math.max(1, adults), Math.max(0, children), String(opts?.currency ?? 'USD'), await inrRates());
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
  .map((x: any) => plain(x) ?? '').filter(Boolean);

/** Everything Leamigo publishes about one activity, for the details view. */
export async function leamigoActivityInfo(activityId: number): Promise<LeamigoActivityInfo> {
  const [d, o] = await Promise.all([
    cached(detCache, activityId, `/v1/activities/${activityId}`),
    // A supplier that can't answer on options still has a description worth showing.
    cached(optCache, activityId, `/v1/activities/${activityId}/options`).catch(() => null),
  ]);
  const media = d?.media ?? [];
  const images = (Array.isArray(media) ? media : [media.cover_image_url, ...(media.images ?? []), ...(media.gallery ?? [])])
    .filter((m: any) => typeof m === 'string' || !m?.type || m.type === 'image')
    .map((m: any) => (typeof m === 'string' ? m : m?.url ?? m?.image_url)).filter(Boolean);
  return {
    description: plain(d?.full_description) ?? plain(d?.short_description),
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
    ticketUsage: plain(d?.ticket_usage_instructions),
    meetingPoint: d?.location?.meeting_point ?? undefined,
    meetingInstructions: plain(d?.location?.meeting_instructions),
    options: (o?.options ?? []).map((x: any) => ({
      id: x.id, name: String(x.name ?? ''),
      minTravellers: Math.min(...(x.tickets ?? []).map((t: any) => Number(t.min_purchase_qty ?? 1)).filter((n: number) => n > 0)),
      maxTravellers: Math.max(...(x.tickets ?? []).map((t: any) => Number(t.max_purchase_qty ?? 0))),
      terms: plain(x.terms_and_conditions), howToUse: plain(x.how_to_use),
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
