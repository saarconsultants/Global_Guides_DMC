// Leamigo activities (partner endpoints /v1/activities*).
//
// Search: city → activities → each activity's options. We pick, per activity,
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
  thumb?: string;
  description?: string;
  bookingType: 'date_required' | 'open_dated';
  instantConfirmation: boolean;
  freeCancellation: boolean;
  cancellationRules: Array<{ hoursBefore: number; chargePct: number }>;
}

// ── small caches (catalogue data changes slowly) ────────────────────────────
const TTL = 10 * 60_000;
const cityCache = new Map<string, { at: number; id: number | null }>();
const optCache = new Map<number, { at: number; v: any }>();
const detCache = new Map<number, { at: number; v: any }>();

async function cityId(name: string): Promise<number | null> {
  const k = name.trim().toLowerCase();
  const hit = cityCache.get(k);
  if (hit && Date.now() - hit.at < TTL) return hit.id;
  const res = await lmCall<any>('/v1/activities/cities', { query: { search: name, limit: '20' } });
  const rows: any[] = res?.data ?? [];
  const exact = rows.find((r) => String(r.city).toLowerCase() === k) ?? null;
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
  if (!v) return 180;
  const u = String(d?.unit ?? 'hours').toLowerCase();
  return Math.round(u.startsWith('min') ? v : u.startsWith('day') ? v * 480 : v * 60);
}

/** Cheapest option+ticket that sells to `pax` people on a fixed date or open date. */
function pickOption(options: any[], pax: number) {
  let best: { opt: any; ticket: any; qty: number; minor: number } | null = null;
  for (const o of options ?? []) {
    if (o.status !== 'active' || o.has_timeslots) continue;           // timeslot products need a slot picker
    if (o.booking_type !== 'date_required' && !o.is_open_dated) continue;
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

export async function searchLeamigoActivities(input: { cityName: string; pax: number; limit?: number }): Promise<{ activities: LeamigoActivity[]; warning?: string }> {
  if (!isLive()) return { activities: [] };
  const cid = await cityId(input.cityName);
  if (!cid) return { activities: [], warning: `Leamigo has no activities in ${input.cityName}.` };
  const list = await lmCall<any>('/v1/activities', { query: { city_id: String(cid), limit: String(input.limit ?? 20), page: '1' }, timeoutMs: 10_000 });
  const rates = await inrRates();
  const out: LeamigoActivity[] = [];
  await Promise.all((list?.data ?? []).map(async (a: any) => {
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
        title: a.title, optionName: p.opt.name, city: a.city?.name ?? input.cityName,
        durationMin: durationMin(det?.duration), quantity: p.qty, pricePaise: paise,
        thumb: a.media?.cover_image_url, description: det?.short_description ?? det?.full_description?.slice(0, 400),
        bookingType: p.opt.is_open_dated ? 'open_dated' : 'date_required',
        instantConfirmation: !!p.opt.is_instant_confirmation,
        freeCancellation: !!cp.free_cancellation,
        cancellationRules: (cp.rules ?? []).map((r: any) => ({ hoursBefore: Number(r.min_hours_before ?? r.minHoursBefore ?? 0), chargePct: Number(r.charge_percentage ?? r.chargePercent ?? 0) })),
      });
    } catch { /* skip one bad product, keep the rest */ }
  }));
  out.sort((x, y) => x.pricePaise - y.pricePaise);
  return { activities: out };
}

export async function activityAvailability(activityId: number, optionId: number, date: string): Promise<{ available: boolean; capacity: number | null; requiredFields: Array<{ id: string; level: string; required: boolean }> }> {
  const res = await lmCall<any>(`/v1/activities/${activityId}/options/${optionId}/availability`, { query: { date }, timeoutMs: 15_000 });
  return {
    available: !!res?.is_available,
    capacity: res?.is_unlimited ? null : Number(res?.available_capacity ?? 0),
    requiredFields: (res?.requiredInputFields ?? []).map((f: any) => ({ id: String(f.id), level: String(f.level ?? 'BOOKING'), required: !!f.required })),
  };
}

export interface ActivityReserveRequest {
  activityId: number; optionId: number; ticketId: string; quantity: number;
  visitDate?: string;
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
