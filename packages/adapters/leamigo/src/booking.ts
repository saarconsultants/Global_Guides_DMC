// Leamigo transfers — Prebook, Booking, Amend, Cancel.
//
// Flow (partner API): search → prebook (GET /search/{search_id}/{booking_token},
// freezes price + policy, short expiry) → book (POST /bookings) → amend / cancel.
// Booking and cancellation are not idempotent: never retried.

import { lmCall, LeamigoError } from './client';
import { inrRates, minorToInrPaise } from './fx';

const BOOKING_TIMEOUT_MS = 60_000;

export interface LeamigoPrebooking {
  prebookingId: string;
  expiresAt: string;
  rideAvailable: boolean;
  priceChanged: boolean;
  /** Supplier amount + platform fee, INR paise; null when the prebook didn't restate the price. */
  pricePaise: number | null;
  pickupDate: string;
  pickupTime: string;
}

interface RawPrebook {
  status: boolean; prebooking_id: string; expires_at: string; pickup_date: string; pickup_time: string;
  ride_available: boolean; price_changed: boolean;
  ride?: { supplier_total?: { payable_to_supplier: number; supplier_currency: string; precision: number }; platform_fee?: { amount: number; currency: string; precision: number } };
}

/** Lock a searched ride. `pickupTime` optionally overrides the searched time. */
export async function prebookTransfer(searchId: string, bookingToken: string, pickupTime?: string): Promise<LeamigoPrebooking> {
  const res = await lmCall<RawPrebook>(`/v1/transfers/search/${encodeURIComponent(searchId)}/${encodeURIComponent(bookingToken)}`, {
    query: { pickup_time: pickupTime }, timeoutMs: 20_000,
  });
  let pricePaise: number | null = null;
  const st = res.ride?.supplier_total, pf = res.ride?.platform_fee;
  if (st) {
    const rates = await inrRates();
    const s = minorToInrPaise(rates, st.payable_to_supplier, st.supplier_currency, st.precision);
    const f = pf ? minorToInrPaise(rates, pf.amount, pf.currency, pf.precision) : 0;
    if (s !== null && f !== null) pricePaise = s + f;
  }
  return {
    prebookingId: res.prebooking_id, expiresAt: res.expires_at,
    rideAvailable: res.ride_available !== false && res.status !== false, priceChanged: !!res.price_changed,
    pricePaise, pickupDate: res.pickup_date, pickupTime: res.pickup_time,
  };
}

export interface LeamigoBookingRequest {
  prebookingId: string;
  salutation: 'Mr' | 'Mrs' | 'Ms' | 'Miss' | 'Dr';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;               // E.164, e.g. +919876543210
  flightNumber?: string;
  specialRequirements?: string;
  agentRef?: string;
}

export interface LeamigoBooking {
  bookingId: string;
  reference: string;           // e.g. TAL01190125
  status: string;
  supplierPayableMinor: number;
  supplierContact?: { email?: string; emergency?: string; contact247?: string };
}

export async function createTransferBooking(req: LeamigoBookingRequest): Promise<LeamigoBooking> {
  const res = await lmCall<any>('/v1/transfers/bookings', {
    method: 'POST', timeoutMs: BOOKING_TIMEOUT_MS,
    body: {
      prebooking_id: req.prebookingId, salutation: req.salutation,
      first_name: req.firstName, last_name: req.lastName, email: req.email, contact_number: req.phone,
      selected_addon_ids: [],
      ...(req.flightNumber ? { flight_number: req.flightNumber } : {}),
      ...(req.specialRequirements ? { special_requirements: req.specialRequirements.slice(0, 500) } : {}),
      ...(req.agentRef ? { agent_ref_id: req.agentRef.slice(0, 40) } : {}),
    },
  });
  const d = res?.data ?? res;
  const reference = d?.booking_ref ?? d?.booking_reference;
  if (!reference) throw new LeamigoError('Leamigo returned no booking reference.', 502, undefined, false);
  const c = d?.supplier_contact_details;
  return {
    bookingId: String(d.booking_id ?? ''), reference: String(reference), status: String(d.status ?? ''),
    supplierPayableMinor: Number(d.supplier_total_payable ?? 0),
    supplierContact: c ? { email: c.reservation_contact ?? c.email, emergency: c.emergency_number, contact247: c.contact_24_7 } : undefined,
  };
}

export interface LeamigoAmendment {
  salutation?: LeamigoBookingRequest['salutation'];
  firstName?: string; lastName?: string; email?: string; phone?: string;
  flightNumber?: string; specialRequirements?: string;
  pickupDate?: string; pickupTime?: string;
}

export async function amendTransferBooking(reference: string, a: LeamigoAmendment): Promise<{ amended: string[] }> {
  const body: Record<string, string> = {};
  if (a.salutation) body.salutation = a.salutation;
  if (a.firstName) body.first_name = a.firstName;
  if (a.lastName) body.last_name = a.lastName;
  if (a.email) body.email = a.email;
  if (a.phone) body.contact_number = a.phone;
  if (a.flightNumber) body.flight_number = a.flightNumber;
  if (a.specialRequirements) body.special_requirements = a.specialRequirements;
  if (a.pickupDate) body.pickup_date = a.pickupDate;
  if (a.pickupTime) body.pickup_time = a.pickupTime;
  const res = await lmCall<any>(`/v1/transfers/bookings/${encodeURIComponent(reference)}/amend`, { method: 'PATCH', body, timeoutMs: 30_000 });
  const f = res?.data?.amended_fields ?? {};
  return { amended: [...(f.booking ?? []), ...(f.transfer ?? [])] };
}

export interface LeamigoCancelPolicy { freeCancellation: boolean; rules: Array<{ hoursBefore: number; chargePct: number }> }

export async function transferCancellationPolicy(reference: string): Promise<LeamigoCancelPolicy> {
  const res = await lmCall<any>(`/v1/transfers/bookings/${encodeURIComponent(reference)}/cancellation-policy`, { timeoutMs: 15_000 });
  const p = res?.cancellation_policy ?? {};
  return {
    freeCancellation: !!p.freeCancellation,
    rules: (p.rules ?? []).map((r: any) => ({ hoursBefore: Number(r.minHoursBefore ?? r.min_hours_before ?? 0), chargePct: Number(r.chargePercent ?? r.charge_percentage ?? 0) })),
  };
}

/** Charge % that applies if cancelled now, from the policy rules and pickup time. */
export function chargePctNow(policy: LeamigoCancelPolicy, pickupAt: Date, now = new Date()): number {
  const hours = (pickupAt.getTime() - now.getTime()) / 3_600_000;
  const applicable = policy.rules.filter((r) => hours >= r.hoursBefore).sort((a, b) => b.hoursBefore - a.hoursBefore)[0];
  return applicable ? applicable.chargePct : 100;
}

export async function cancelTransferBooking(reference: string): Promise<{ status: string; penaltyMinor: number }> {
  const res = await lmCall<any>(`/v1/transfers/bookings/${encodeURIComponent(reference)}/cancel`, { method: 'POST', timeoutMs: BOOKING_TIMEOUT_MS });
  return { status: String(res?.status ?? ''), penaltyMinor: Number(res?.penalty_amount ?? 0) };
}
