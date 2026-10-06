// Leamigo Transfers — point-to-point search by coordinates.
//
// Unlike Hotelbeds (IATA + hotel code), Leamigo takes an address plus
// latitude/longitude for BOTH ends, so it can also quote routes Hotelbeds
// can't express (city ↔ city, hotel ↔ hotel, any landmark).
//
// Scope: SEARCH ONLY. Prebooking (GET /search/{session}/{ride}) and booking
// (POST /bookings) are deliberately not wired — live supplier booking is off
// platform-wide until the booking flow is signed off.

import { lmCall, isLive, LeamigoError } from './client';
import { inrRates, minorToInrPaise } from './fx';

// ── Public types ────────────────────────────────────────────────────────────

export interface LeamigoPlace {
  address: string;
  latitude: number;
  longitude: number;
}

export interface LeamigoSearchInput {
  pickup: LeamigoPlace;
  destination: LeamigoPlace;
  passengers: number;
  pickupDate: string;            // YYYY-MM-DD
  pickupTime: string;            // HH:mm, 24h
  returnDate?: string;           // set both return fields for a return journey
  returnTime?: string;
}

export interface LeamigoTransfer {
  id: string;                    // "LM-<searchId>:<bookingToken>"
  searchId: string;
  bookingToken: string;          // valid until expiresAt
  provider: string;
  providerId: string;
  vehicleName: string;           // "Sedan", "SUV", "Van"…
  vehicleModels: string[];       // indicative only, not guaranteed
  vehicleImg?: string;
  maxPax: number;
  maxLuggage: number;
  freeWaitMin: number;
  shared: boolean;
  luxury: boolean;
  /** Our cost in INR paise: supplier amount + Leamigo platform fee. */
  pricePaise: number;
  supplierCurrency: string;
  supplierAmountMinor: number;
  platformFeeMinor: number;
  platformFeeCurrency: string;
  flags: {
    freeCancellation: boolean;
    instantConfirmation: boolean;
    meetAndGreet: boolean;
    driverDetails: boolean;
    childSeat: boolean;
    amendable: boolean;
  };
  cancellation: { title: string; description: string; rules: Array<{ hoursBefore: number; chargePct: number }> };
  expiresAt: string;
}

export interface LeamigoSearchResult {
  transfers: LeamigoTransfer[];
  source: 'live' | 'mock';
  warning?: string;
}

export interface LeamigoOperator {
  id: number;
  name: string;
  countryCode: string;
  countryName: string;
  status: 'active' | 'inactive' | 'suspended';
}

// ── Raw API shapes (from the published OpenAPI spec) ─────────────────────────

interface RawRide {
  provider: { id: string; name: string };
  vehicle: {
    id: string; name: string; img?: string;
    config: { vehicleModels?: string[]; maxPassengers: number; maxLuggage: number; free_waiting_time: number };
  };
  supplier_total: { payable_to_supplier: number; supplier_currency: string; precision: number };
  platform_fee: { amount: number; currency: string; precision: number };
  priority: number;
  booking_token: string;
  flags: {
    free_cancellation: boolean; instant_confirmation: boolean; meet_and_greet: boolean;
    driver_details_available: boolean; luxury_transfer: boolean; amendment_available: boolean;
    child_seat_available: boolean; shared_transfer: boolean;
  };
  cancellation_policy?: {
    title?: string; description?: string;
    rules?: Array<{ min_hours_before: number; charge_percentage: number }>;
    cancellation_rules?: Array<{ min_hours_before: number; charge_percentage: number }>;
  };
}

interface RawSearchResponse {
  status: boolean;
  results: RawRide[];
  metadata: { search_id: string; has_all_results: boolean; requires_polling: boolean; expires_at: string; total_rides: number };
}

// ── Search ──────────────────────────────────────────────────────────────────

const CACHE_MS = 90_000;
const cache = new Map<string, { at: number; promise: Promise<LeamigoSearchResult> }>();

// Coordinates rounded to ~11m so tiny float noise still hits the cache.
const r4 = (n: number) => n.toFixed(4);
function cacheKey(i: LeamigoSearchInput): string {
  return [r4(i.pickup.latitude), r4(i.pickup.longitude), r4(i.destination.latitude), r4(i.destination.longitude),
    i.pickupDate, i.pickupTime, i.returnDate ?? '', i.returnTime ?? '', i.passengers].join('|');
}

const POLL_INTERVAL_MS = 1_200;
const MAX_POLLS = 3;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function validPlace(p: LeamigoPlace): boolean {
  return !!p?.address && Number.isFinite(p.latitude) && Number.isFinite(p.longitude)
    && Math.abs(p.latitude) <= 90 && Math.abs(p.longitude) <= 180;
}

export async function searchTransfers(input: LeamigoSearchInput): Promise<LeamigoSearchResult> {
  if (!isLive()) return { transfers: [], source: 'mock', warning: 'LEAMIGO_API_KEY not set' };
  if (!validPlace(input.pickup) || !validPlace(input.destination)) {
    return { transfers: [], source: 'live', warning: 'Pickup and drop-off both need an address and coordinates.' };
  }

  const key = cacheKey(input);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.promise;

  const promise = runSearch(input);
  cache.set(key, { at: Date.now(), promise });
  // Don't cache failures — the next call should retry.
  promise.catch(() => cache.delete(key));
  return promise;
}

async function runSearch(input: LeamigoSearchInput): Promise<LeamigoSearchResult> {
  const isReturn = !!(input.returnDate && input.returnTime);
  const body = {
    pickup: input.pickup,
    destination: input.destination,
    passengers: Math.max(1, Math.round(input.passengers)),
    pickup_date: input.pickupDate,
    pickup_time: input.pickupTime,
    journey_type: isReturn ? 'return' : 'oneway',
    ...(isReturn ? { return_date: input.returnDate, return_time: input.returnTime } : {}),
  };

  let res: RawSearchResponse;
  try {
    res = await lmCall<RawSearchResponse>('/v1/transfers/search', { method: 'POST', body });
  } catch (e) {
    if (e instanceof LeamigoError && !e.fatal) {
      // Documented "nothing here" answers are results, not failures.
      if (e.status === 404) return { transfers: [], source: 'live', warning: 'No Leamigo rides for this route and time.' };
      if (e.status === 422) return { transfers: [], source: 'live', warning: 'Leamigo does not serve this pickup or drop-off location.' };
    }
    throw e;
  }

  // Slow suppliers: follow the polling flag, within a bounded budget.
  for (let i = 0; i < MAX_POLLS && res?.metadata?.requires_polling && !res.metadata.has_all_results; i++) {
    await sleep(POLL_INTERVAL_MS);
    try {
      res = await lmCall<RawSearchResponse>(`/v1/transfers/search/${encodeURIComponent(res.metadata.search_id)}`, { timeoutMs: 5_000 });
    } catch {
      break; // keep what we already have
    }
  }

  const rides = res?.status ? (res.results ?? []) : [];
  if (rides.length === 0) return { transfers: [], source: 'live', warning: 'No Leamigo rides for this route and time.' };

  const rates = await inrRates();
  const transfers: LeamigoTransfer[] = [];
  let unpriced = 0;
  for (const r of [...rides].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))) {
    const t = normalize(r, res.metadata, rates);
    if (t) transfers.push(t); else unpriced++;
  }

  return {
    transfers,
    source: 'live',
    warning: unpriced ? `${unpriced} option${unpriced !== 1 ? 's' : ''} skipped: quoted in a currency we cannot convert to INR.` : undefined,
  };
}

function normalize(r: RawRide, meta: RawSearchResponse['metadata'], rates: Record<string, number>): LeamigoTransfer | null {
  const supplier = minorToInrPaise(rates, r.supplier_total?.payable_to_supplier, r.supplier_total?.supplier_currency, r.supplier_total?.precision);
  const fee = r.platform_fee
    ? minorToInrPaise(rates, r.platform_fee.amount, r.platform_fee.currency, r.platform_fee.precision)
    : 0;
  if (supplier === null || fee === null) return null;   // never guess a price

  const rules = r.cancellation_policy?.rules ?? r.cancellation_policy?.cancellation_rules ?? [];
  return {
    id: `LM-${meta.search_id}:${r.booking_token}`,
    searchId: meta.search_id,
    bookingToken: r.booking_token,
    provider: r.provider?.name ?? 'Leamigo',
    providerId: String(r.provider?.id ?? ''),
    vehicleName: r.vehicle?.name ?? 'Car',
    vehicleModels: r.vehicle?.config?.vehicleModels ?? [],
    vehicleImg: r.vehicle?.img || undefined,
    maxPax: r.vehicle?.config?.maxPassengers ?? 0,
    maxLuggage: r.vehicle?.config?.maxLuggage ?? 0,
    freeWaitMin: r.vehicle?.config?.free_waiting_time ?? 0,
    shared: !!r.flags?.shared_transfer,
    luxury: !!r.flags?.luxury_transfer,
    pricePaise: supplier + fee,
    supplierCurrency: r.supplier_total.supplier_currency,
    supplierAmountMinor: r.supplier_total.payable_to_supplier,
    platformFeeMinor: r.platform_fee?.amount ?? 0,
    platformFeeCurrency: r.platform_fee?.currency ?? r.supplier_total.supplier_currency,
    flags: {
      freeCancellation: !!r.flags?.free_cancellation,
      instantConfirmation: !!r.flags?.instant_confirmation,
      meetAndGreet: !!r.flags?.meet_and_greet,
      driverDetails: !!r.flags?.driver_details_available,
      childSeat: !!r.flags?.child_seat_available,
      amendable: !!r.flags?.amendment_available,
    },
    cancellation: {
      title: r.cancellation_policy?.title ?? '',
      description: r.cancellation_policy?.description ?? '',
      rules: rules.map((x) => ({ hoursBefore: x.min_hours_before, chargePct: x.charge_percentage })),
    },
    expiresAt: meta.expires_at,
  };
}

// ── Operators (coverage) ────────────────────────────────────────────────────

export async function listOperators(): Promise<LeamigoOperator[]> {
  const res = await lmCall<{ data?: Array<{ id: number; name: string; country_code: string; country_name: string; status: LeamigoOperator['status'] }> }>(
    '/v1/transfers/search/operators',
  );
  return (res?.data ?? []).map((o) => ({ id: o.id, name: o.name, countryCode: o.country_code, countryName: o.country_name, status: o.status }));
}
