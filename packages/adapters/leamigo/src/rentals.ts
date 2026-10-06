// Leamigo hourly rentals (car with driver at disposal).
// Same shape as transfers: search → prebook (GET /search/{id}/{token}) → book
// → amend / cancel. One pickup point, a duration in hours, no drop-off.

import { lmCall, isLive, LeamigoError } from './client';
import { inrRates, minorToInrPaise } from './fx';
import type { LeamigoPlace } from './transfers';

const BOOKING_TIMEOUT_MS = 60_000;

export interface LeamigoRentalSearchInput {
  pickup: LeamigoPlace;
  pickupDate: string;          // YYYY-MM-DD
  pickupTime: string;          // HH:mm
  hours: number;               // 1–24
  passengers: number;
}

export interface LeamigoRental {
  id: string;                  // "LMR-<searchId>:<bookingToken>"
  searchId: string;
  bookingToken: string;
  provider: string;
  providerId: string;
  vehicleName: string;
  vehicleModels: string[];
  maxPax: number;
  maxLuggage: number;
  hours: number;               // charged hours (≥ supplier minimum)
  kmsIncluded: number;
  pricePaise: number;          // supplier + platform fee, INR
  freeCancellation: boolean;
  cityRadiusOnly: boolean;
  tollsAndParkingIncluded: boolean;
  cancellation: { title: string; description: string; rules: Array<{ hoursBefore: number; chargePct: number }> };
}

interface RawRental {
  provider: { id: string; name: string };
  vehicle: { id: string; name: string; config?: { maxPassengers?: number; maxLuggage?: number; vehicleModels?: string[] } };
  hourly_pricing: { charged_hours?: number; booked_hours?: number; kms_included?: number };
  supplier_total: { payable_to_supplier: number; supplier_currency: string; precision: number };
  platform_fee?: { amount: number; currency: string; precision: number };
  flags?: { free_cancellation?: boolean; valid_in_city_radius_only?: boolean; includes_tolls_and_parking?: boolean };
  cancellation_policy?: { title?: string; description?: string; cancellation_rules?: any[]; rules?: any[] };
  booking_token: string;
}

const rule = (r: any) => ({ hoursBefore: Number(r.minHoursBefore ?? r.min_hours_before ?? 0), chargePct: Number(r.chargePercent ?? r.charge_percentage ?? 0) });

export async function searchRentals(input: LeamigoRentalSearchInput): Promise<{ rentals: LeamigoRental[]; warning?: string }> {
  if (!isLive()) return { rentals: [], warning: 'LEAMIGO_API_KEY not set' };
  let res: { status?: boolean; results?: RawRental[]; metadata?: { search_id: string } };
  try {
    res = await lmCall('/v1/transfers/rental/search', {
      method: 'POST', timeoutMs: 12_000,
      body: {
        pickup: input.pickup, pickup_date: input.pickupDate, pickup_time: input.pickupTime,
        duration_hours: Math.min(24, Math.max(1, Math.round(input.hours))), passengers: Math.max(1, Math.round(input.passengers)),
      },
    });
  } catch (e) {
    if (e instanceof LeamigoError && (e.status === 404 || e.status === 422)) return { rentals: [], warning: 'No Leamigo rentals for this place and time.' };
    throw e;
  }
  const rows = res?.status ? res.results ?? [] : [];
  if (!rows.length || !res.metadata) return { rentals: [], warning: 'No Leamigo rentals for this place and time.' };
  const rates = await inrRates();
  const rentals: LeamigoRental[] = [];
  for (const r of rows) {
    const s = minorToInrPaise(rates, r.supplier_total?.payable_to_supplier, r.supplier_total?.supplier_currency, r.supplier_total?.precision);
    const f = r.platform_fee ? minorToInrPaise(rates, r.platform_fee.amount, r.platform_fee.currency, r.platform_fee.precision) : 0;
    if (s === null || f === null) continue;     // never guess a price
    const rules = (r.cancellation_policy?.cancellation_rules ?? r.cancellation_policy?.rules ?? []).map(rule);
    rentals.push({
      id: `LMR-${res.metadata.search_id}:${r.booking_token}`,
      searchId: res.metadata.search_id, bookingToken: r.booking_token,
      provider: r.provider?.name ?? 'Leamigo', providerId: String(r.provider?.id ?? ''),
      vehicleName: r.vehicle?.name ?? 'Car', vehicleModels: r.vehicle?.config?.vehicleModels ?? [],
      maxPax: r.vehicle?.config?.maxPassengers ?? 0, maxLuggage: r.vehicle?.config?.maxLuggage ?? 0,
      hours: r.hourly_pricing?.charged_hours ?? r.hourly_pricing?.booked_hours ?? input.hours,
      kmsIncluded: r.hourly_pricing?.kms_included ?? 0,
      pricePaise: s + f,
      freeCancellation: !!r.flags?.free_cancellation,
      cityRadiusOnly: !!r.flags?.valid_in_city_radius_only,
      tollsAndParkingIncluded: !!r.flags?.includes_tolls_and_parking,
      cancellation: { title: r.cancellation_policy?.title ?? '', description: r.cancellation_policy?.description ?? '', rules },
    });
  }
  rentals.sort((a, b) => a.pricePaise - b.pricePaise);
  return { rentals };
}

export async function prebookRental(searchId: string, bookingToken: string): Promise<{ prebookingId: string; expiresAt: string; pricePaise: number | null }> {
  const res = await lmCall<any>(`/v1/transfers/rental/search/${encodeURIComponent(searchId)}/${encodeURIComponent(bookingToken)}`, { timeoutMs: 20_000 });
  if (!res?.prebooking_id) throw new LeamigoError('Leamigo could not hold this rental.', 409, undefined, false);
  let pricePaise: number | null = null;
  const st = res.ride?.supplier_total, pf = res.ride?.platform_fee;
  if (st) {
    const rates = await inrRates();
    const s = minorToInrPaise(rates, st.payable_to_supplier, st.supplier_currency, st.precision);
    const f = pf ? minorToInrPaise(rates, pf.amount, pf.currency, pf.precision) : 0;
    if (s !== null && f !== null) pricePaise = s + f;
  }
  return { prebookingId: res.prebooking_id, expiresAt: res.expires_at, pricePaise };
}

export async function createRentalBooking(req: {
  prebookingId: string; salutation: 'Mr' | 'Mrs' | 'Ms' | 'Miss' | 'Dr';
  firstName: string; lastName: string; email: string; phone: string; specialRequirements?: string; agentRef?: string;
}): Promise<{ reference: string; bookingId: string; status: string }> {
  const res = await lmCall<any>('/v1/transfers/rental/bookings', {
    method: 'POST', timeoutMs: BOOKING_TIMEOUT_MS,
    body: {
      prebooking_id: req.prebookingId, salutation: req.salutation, first_name: req.firstName, last_name: req.lastName,
      email: req.email, contact_number: req.phone, selected_addon_ids: [],
      ...(req.specialRequirements ? { special_requirements: req.specialRequirements.slice(0, 500) } : {}),
      ...(req.agentRef ? { agent_ref_id: req.agentRef.slice(0, 40) } : {}),
    },
  });
  const d = res?.data ?? res;
  const reference = d?.booking_ref ?? d?.booking_reference;
  if (!reference) throw new LeamigoError('Leamigo returned no rental booking reference.', 502, undefined, false);
  return { reference: String(reference), bookingId: String(d.booking_id ?? ''), status: String(d.status ?? '') };
}

export async function rentalCancellationPolicy(reference: string): Promise<{ freeCancellation: boolean; rules: Array<{ hoursBefore: number; chargePct: number }> }> {
  const res = await lmCall<any>(`/v1/transfers/rental/bookings/${encodeURIComponent(reference)}/cancellation-policy`, { timeoutMs: 15_000 });
  const p = res?.cancellation_policy ?? {};
  return { freeCancellation: !!(p.freeCancellation ?? p.free_cancellation), rules: (p.rules ?? p.cancellation_rules ?? []).map(rule) };
}

export async function cancelRentalBooking(reference: string): Promise<{ status: string; penaltyMinor: number }> {
  const res = await lmCall<any>(`/v1/transfers/rental/bookings/${encodeURIComponent(reference)}/cancel`, { method: 'POST', timeoutMs: BOOKING_TIMEOUT_MS });
  return { status: String(res?.status ?? ''), penaltyMinor: Number(res?.penalty_amount ?? 0) };
}
