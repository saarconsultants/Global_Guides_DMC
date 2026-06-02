// Hotelbeds Transfers API — airport ↔ hotel + intercity transfers.
//
// Endpoint: GET /transfer-api/1.0/availability/{language}/from/{fromType}/{fromCode}/to/{toType}/{toCode}/{fromDate}/{toDate}/{adults}/{children}/{infants}
// Docs:     https://developer.hotelbeds.com/documentation/transfers/

import { hbCall, isLive } from './client';

export type TransferLocationType = 'IATA' | 'ATLAS';

export interface TransferSearchInput {
  fromType: TransferLocationType;     // IATA = airport, ATLAS = Hotelbeds hotel/location code
  fromCode: string;
  toType: TransferLocationType;
  toCode: string;
  pickupDate: string;                  // YYYY-MM-DD
  adults: number;
  children?: number;
  infants?: number;
}

export type TransferVehicleKind = 'SHARED' | 'PRIVATE' | 'PRIVATE_PREMIUM' | 'MINIBUS' | 'LUXURY';

export interface HotelbedsTransfer {
  id: string;                         // "TR-<rateKey hash>"
  vehicleKind: TransferVehicleKind;
  vehicleName: string;                // e.g. "Sedan", "Minivan", "Luxury Sedan"
  category?: string;                  // PRIVATE | SHARED etc.
  maxPax: number;
  durationMin?: number;
  pricePaise: number;
  rateKey?: string;
  currency?: string;
}

export interface TransferSearchResult {
  transfers: HotelbedsTransfer[];
  source: 'live' | 'mock';
  warning?: string;
}

function eurToInr(): number { return parseFloat(process.env.HOTELBEDS_FX_EUR_INR ?? '92'); }
function usdToInr(): number { return parseFloat(process.env.HOTELBEDS_FX_USD_INR ?? '85'); }
function toInrPaise(amount: number, currency: string): number {
  const rate = currency === 'EUR' ? eurToInr() : currency === 'USD' ? usdToInr() : currency === 'INR' ? 1 : eurToInr();
  return Math.round(amount * rate * 100);
}

const CACHE_MS = 90_000;
type CachedEntry = { at: number; promise: Promise<TransferSearchResult> };
const cache = new Map<string, CachedEntry>();
function cacheKey(i: TransferSearchInput): string {
  return `${i.fromType}:${i.fromCode}|${i.toType}:${i.toCode}|${i.pickupDate}|${i.adults}-${i.children ?? 0}-${i.infants ?? 0}`;
}

export async function searchTransfers(input: TransferSearchInput): Promise<TransferSearchResult> {
  const key = cacheKey(input);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.promise;

  const promise = (async (): Promise<TransferSearchResult> => {
    if (!isLive('transfers')) return { transfers: [], source: 'mock', warning: 'HOTELBEDS_TRANSFERS_API_KEY (or fallback HOTELBEDS_API_KEY) not set' };

    const path = `/transfer-api/1.0/availability/en/from/${input.fromType}/${input.fromCode}/to/${input.toType}/${input.toCode}/${input.pickupDate}/${input.pickupDate}/${input.adults}/${input.children ?? 0}/${input.infants ?? 0}`;
    try {
      const res = await hbCall<HbTransfersResponse>(path, undefined, { method: 'GET', timeoutMs: 20_000, product: 'transfers' });
      return { transfers: normalize(res), source: 'live' };
    } catch (e: any) {
      return { transfers: [], source: 'mock', warning: `Hotelbeds Transfers error: ${e?.message ?? e}` };
    }
  })();

  cache.set(key, { at: Date.now(), promise });
  promise.catch(() => cache.delete(key));
  return promise;
}

// ── Hotelbeds Transfers response (minimal shape we use) ────────────────────
interface HbTransfersResponse {
  services?: HbTransferService[];
}
interface HbTransferService {
  id?: string;
  rateKey?: string;
  category?: { code?: string; name?: string };
  vehicle?: { code?: string; name?: string };
  transferType?: string;        // PRIVATE | SHARED | PRIVATE_PREMIUM
  pickupInformation?: { duration?: { value?: number; unit?: string } };
  maxPaxCapacity?: number;
  minPaxCapacity?: number;
  price?: { totalAmount?: number; currencyId?: string };
}

function normalize(res: HbTransfersResponse): HotelbedsTransfer[] {
  const list = res.services ?? [];
  return list.map((s, i): HotelbedsTransfer => {
    const kind = mapKind(s.transferType, s.category?.code);
    const totalAmount = s.price?.totalAmount ?? 0;
    const currency = s.price?.currencyId ?? 'EUR';
    return {
      id: `TR-${s.id ?? s.rateKey?.slice(0, 12) ?? i}`,
      vehicleKind: kind,
      vehicleName: s.vehicle?.name ?? 'Vehicle',
      category: s.category?.name,
      maxPax: s.maxPaxCapacity ?? 4,
      durationMin: s.pickupInformation?.duration?.value,
      pricePaise: toInrPaise(totalAmount, currency),
      rateKey: s.rateKey,
      currency,
    };
  });
}

function mapKind(transferType?: string, _categoryCode?: string): TransferVehicleKind {
  const t = (transferType ?? '').toUpperCase();
  if (t === 'PRIVATE_PREMIUM') return 'PRIVATE_PREMIUM';
  if (t === 'PRIVATE') return 'PRIVATE';
  if (t === 'SHARED' || t === 'SHUTTLE') return 'SHARED';
  if (t === 'LUXURY') return 'LUXURY';
  if (t === 'MINIBUS') return 'MINIBUS';
  return 'PRIVATE';
}
