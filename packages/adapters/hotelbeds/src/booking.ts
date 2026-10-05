// Hotelbeds Hotels — CheckRate, Booking, Cancellation, Rate comments.
//
// Certified workflow (Hotelbeds certification §2):
//   Availability (/hotels) → CheckRate (/checkrates, ONLY when rateType=RECHECK)
//   → Booking (/bookings). Availability is never repeated between those steps.
//
// Booking and cancellation are NOT idempotent: they are never retried, and they
// get the 60s response timeout Hotelbeds requires (§3.11).

import { hbCall, HotelbedsHttpError } from './client';
import { getRates, toInrPaiseWith } from './fx';
import type { HotelbedsCancellationPolicy } from './types';

const BOOKING_TIMEOUT_MS = 60_000;

// ── CheckRate ────────────────────────────────────────────────────────────────

export interface CheckedRate {
  rateKey: string;              // may be replaced by CheckRate — always book with this one
  rateType: 'BOOKABLE' | 'RECHECK';
  netAmount: number;
  currency: string;
  netPaise: number;
  rateComments?: string;
  cancellationPolicies: HotelbedsCancellationPolicy[];
  boardName?: string;
}

interface RawCheckRate {
  hotel?: {
    currency?: string;
    rooms?: Array<{ rates?: Array<{ rateKey?: string; rateType?: string; net?: string; rateComments?: string; boardName?: string; cancellationPolicies?: Array<{ amount: string; from?: string }> }> }>;
  };
}

/** CheckRate for RECHECK rates (call ONLY for rateType=RECHECK). One call covers every rateKey of a booking. */
export async function checkRates(rateKeys: string[]): Promise<CheckedRate[]> {
  const res = await hbCall<RawCheckRate>('/hotel-api/1.0/checkrates', { rooms: rateKeys.map((rateKey) => ({ rateKey })) }, { timeoutMs: 20_000 });
  const currency = res.hotel?.currency ?? 'EUR';
  const fx = await getRates();
  const out: CheckedRate[] = [];
  for (const room of res.hotel?.rooms ?? []) for (const r of room.rates ?? []) {
    if (!r.rateKey) continue;
    const net = parseFloat(r.net ?? '0');
    out.push({
      rateKey: r.rateKey,
      rateType: r.rateType === 'RECHECK' ? 'RECHECK' : 'BOOKABLE',
      netAmount: net,
      currency,
      netPaise: toInrPaiseWith(fx, net, currency),
      rateComments: r.rateComments || undefined,
      boardName: r.boardName,
      cancellationPolicies: (r.cancellationPolicies ?? [])
        .map((c) => ({ from: c.from ?? '', amount: parseFloat(c.amount), currency, amountPaise: toInrPaiseWith(fx, parseFloat(c.amount), currency) }))
        .filter((c) => c.from && Number.isFinite(c.amount)),
    });
  }
  return out;
}

// ── Rate comments (Content API) ──────────────────────────────────────────────

const commentCache = new Map<string, { at: number; text: string }>();

/**
 * Rate comments for a BOOKABLE rate (RECHECK rates get them from CheckRate).
 * Must be shown to the agent before confirmation (certification §3.9).
 * `date` = check-in date; comments are date-dependent.
 */
export async function getRateComments(rateCommentsId: string, date: string): Promise<string | undefined> {
  if (!rateCommentsId) return undefined;
  const key = `${rateCommentsId}@${date}`;
  const hit = commentCache.get(key);
  if (hit && Date.now() - hit.at < 12 * 3600_000) return hit.text || undefined;
  const path = `/hotel-content-api/1.0/types/ratecommentdetails?date=${encodeURIComponent(date)}&code=${encodeURIComponent(rateCommentsId)}&fields=all&language=ENG`;
  const res = await hbCall<unknown>(path, undefined, { method: 'GET', timeoutMs: 8_000 });
  // Response nesting varies between API versions — collect every description string.
  const texts: string[] = [];
  const walk = (v: unknown) => {
    if (!v || typeof v !== 'object') return;
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      if (k === 'description' && typeof x === 'string' && x.trim()) texts.push(x.trim());
      else if (k === 'description' && x && typeof x === 'object' && typeof (x as any).content === 'string') texts.push((x as any).content.trim());
      else walk(x);
    }
  };
  walk(res);
  const text = Array.from(new Set(texts)).join('\n');
  commentCache.set(key, { at: Date.now(), text });
  return text || undefined;
}

// ── Booking ──────────────────────────────────────────────────────────────────

export interface BookingPax { roomId: number; type: 'AD' | 'CH'; name: string; surname: string; age?: number }

export interface BookingRequest {
  holder: { name: string; surname: string };
  /** One entry per rateKey; paxes carry roomId 1..n within that rate. */
  rooms: Array<{ rateKey: string; paxes: BookingPax[] }>;
  clientReference: string;      // our proposal code — max 20 chars
  remark?: string;
}

export interface HotelbedsBooking {
  reference: string;
  clientReference?: string;
  status: string;               // CONFIRMED | CANCELLED | …
  creationDate?: string;
  holder: { name: string; surname: string };
  hotel: {
    code: number;
    name: string;
    categoryName?: string;
    destinationName?: string;
    zoneName?: string;
    checkIn: string;
    checkOut: string;
    rooms: Array<{
      code?: string;
      name: string;
      status?: string;
      paxes: Array<{ roomId: number; type: string; name?: string; surname?: string; age?: number }>;
      rates: Array<{ boardName?: string; rateComments?: string; net?: number; cancellationPolicies: Array<{ amount: number; from: string }> }>;
    }>;
    supplier?: { name?: string; vatNumber?: string };
  };
  totalNet: number;
  currency: string;
  cancellationReference?: string;
}

export class HotelbedsBookingError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) { super(message); this.name = 'HotelbedsBookingError'; }
}

function bookingError(e: unknown): HotelbedsBookingError {
  if (e instanceof HotelbedsHttpError) {
    let code: string | undefined, msg: string | undefined;
    try { const j = JSON.parse(e.body); code = j?.error?.code; msg = j?.error?.message; } catch { /* not JSON */ }
    return new HotelbedsBookingError(msg ? `Hotelbeds: ${msg}` : e.userMessage, e.status, code);
  }
  return new HotelbedsBookingError(String((e as Error)?.message ?? e), 0);
}

function normalizeBooking(raw: any): HotelbedsBooking {
  const b = raw?.booking ?? raw;
  const h = b?.hotel ?? {};
  return {
    reference: String(b?.reference ?? ''),
    clientReference: b?.clientReference,
    status: String(b?.status ?? ''),
    creationDate: b?.creationDate,
    holder: { name: b?.holder?.name ?? '', surname: b?.holder?.surname ?? '' },
    hotel: {
      code: Number(h.code),
      name: String(h.name ?? ''),
      categoryName: h.categoryName,
      destinationName: h.destinationName,
      zoneName: h.zoneName,
      checkIn: String(h.checkIn ?? ''),
      checkOut: String(h.checkOut ?? ''),
      rooms: (h.rooms ?? []).map((r: any) => ({
        code: r.code,
        name: String(r.name ?? 'Room'),
        status: r.status,
        paxes: (r.paxes ?? []).map((p: any) => ({ roomId: Number(p.roomId), type: String(p.type), name: p.name, surname: p.surname, age: p.age !== undefined ? Number(p.age) : undefined })),
        rates: (r.rates ?? []).map((x: any) => ({
          boardName: x.boardName,
          rateComments: x.rateComments || undefined,
          net: x.net !== undefined ? parseFloat(x.net) : undefined,
          cancellationPolicies: (x.cancellationPolicies ?? []).map((c: any) => ({ amount: parseFloat(c.amount), from: String(c.from ?? '') })),
        })),
      })),
      supplier: h.supplier ? { name: h.supplier.name, vatNumber: h.supplier.vatNumber } : undefined,
    },
    totalNet: parseFloat(b?.totalNet ?? h.totalNet ?? '0'),
    currency: String(b?.currency ?? h.currency ?? 'EUR'),
    cancellationReference: b?.cancellationReference ?? h.cancellationReference,
  };
}

/** Confirm a booking. Never retried; 60s timeout. */
export async function createBooking(req: BookingRequest): Promise<HotelbedsBooking> {
  const body = {
    holder: req.holder,
    rooms: req.rooms.map((r) => ({
      rateKey: r.rateKey,
      paxes: r.paxes.map((p) => ({ roomId: p.roomId, type: p.type, name: p.name, surname: p.surname, ...(p.type === 'CH' ? { age: p.age } : {}) })),
    })),
    clientReference: req.clientReference.slice(0, 20),
    ...(req.remark ? { remark: req.remark.slice(0, 1000) } : {}),
  };
  try {
    const res = await hbCall<any>('/hotel-api/1.0/bookings', body, { timeoutMs: BOOKING_TIMEOUT_MS, retries: 0 });
    const booking = normalizeBooking(res);
    if (!booking.reference) throw new HotelbedsBookingError('Hotelbeds returned no booking reference.', 502);
    return booking;
  } catch (e) {
    throw e instanceof HotelbedsBookingError ? e : bookingError(e);
  }
}

/** Cancellation cost preview — no change is made. */
export async function simulateCancellation(reference: string): Promise<{ booking: HotelbedsBooking; feeAmount: number; currency: string }> {
  try {
    const res = await hbCall<any>(`/hotel-api/1.0/bookings/${encodeURIComponent(reference)}?cancellationFlag=SIMULATION`, undefined, { method: 'DELETE', timeoutMs: 30_000 });
    const booking = normalizeBooking(res);
    const fee = parseFloat(res?.booking?.hotel?.cancellationAmount ?? res?.booking?.cancellationAmount ?? res?.booking?.totalNet ?? '0');
    return { booking, feeAmount: Number.isFinite(fee) ? fee : 0, currency: booking.currency };
  } catch (e) { throw bookingError(e); }
}

/** Cancel for real. Never retried; 60s timeout. */
export async function cancelBooking(reference: string): Promise<HotelbedsBooking> {
  try {
    const res = await hbCall<any>(`/hotel-api/1.0/bookings/${encodeURIComponent(reference)}?cancellationFlag=CANCELLATION`, undefined, { method: 'DELETE', timeoutMs: BOOKING_TIMEOUT_MS, retries: 0 });
    return normalizeBooking(res);
  } catch (e) { throw bookingError(e); }
}

/** Convert a supplier-currency amount to INR paise (shared FX with search). */
export async function toInrPaise(amount: number, currency: string): Promise<number> {
  return toInrPaiseWith(await getRates(), amount, currency);
}
