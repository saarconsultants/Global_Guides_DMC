// Hotelbeds Activities API — search excursions/tickets by destination + dates.
//
// Endpoint: POST /activity-api/3.0/activities
// Docs:     https://developer.hotelbeds.com/documentation/activities/
//
// We normalize the response into the app's existing Activity type so the
// Add Activity modal can render it without caring about the source.

import { hbCall, isLive } from './client';
import { toHotelbedsDestination } from './destinations';
import { getRates, toInrPaiseWith, type Rates } from './fx';

export interface ActivitiesSearchInput {
  cityCode: string;             // IATA-style city code, translated to Hotelbeds destinationCode
  fromDate: string;             // YYYY-MM-DD
  toDate: string;               // YYYY-MM-DD
  paxAdults: number;
  paxChildren?: number;
}

export interface HotelbedsActivity {
  id: string;                   // "ACT-<code>"
  name: string;
  slot: 'morning' | 'afternoon' | 'evening' | 'full-day';
  durationMin: number;
  description?: string;
  thumb?: string;
  pricePaise: number;           // converted to INR
  cityCode: string;
  // Hotelbeds-specific for booking confirmation
  activityCode?: string;
  modalityCode?: string;
  rateKey?: string;
  currency?: string;
}

export interface ActivitiesSearchResult {
  activities: HotelbedsActivity[];
  source: 'live' | 'mock' | 'unsupported-city';
  warning?: string;
}

const CACHE_MS = 90_000;
type CachedEntry = { at: number; promise: Promise<ActivitiesSearchResult> };
const cache = new Map<string, CachedEntry>();
function cacheKey(i: ActivitiesSearchInput): string {
  return `${i.cityCode}|${i.fromDate}|${i.toDate}|${i.paxAdults}-${i.paxChildren ?? 0}`;
}

export async function searchActivities(input: ActivitiesSearchInput): Promise<ActivitiesSearchResult> {
  const key = cacheKey(input);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.promise;

  const promise = (async (): Promise<ActivitiesSearchResult> => {
    if (!isLive('activities')) return { activities: [], source: 'mock', warning: 'HOTELBEDS_ACTIVITIES_API_KEY (or fallback HOTELBEDS_API_KEY) not set' };

    const destinationCode = toHotelbedsDestination(input.cityCode);
    if (!destinationCode) {
      return {
        activities: [],
        source: 'unsupported-city',
        warning: `${input.cityCode} not mapped in destinations.ts — add it to enable live activities.`,
      };
    }

    const body = {
      filters: [{ searchFilterItems: [{ type: 'destination', value: destinationCode }] }],
      from: input.fromDate,
      to: input.toDate,
      language: 'en',
      pagination: { itemsPerPage: 40, page: 1 },
      order: 'DEFAULT',
      paxes: [
        ...Array.from({ length: input.paxAdults }).map(() => ({ age: 30 })),
        ...Array.from({ length: input.paxChildren ?? 0 }).map(() => ({ age: 8 })),
      ],
    };

    const [res, rates] = await Promise.all([
      hbCall<HbActivitiesResponse>('/activity-api/3.0/activities', body, { product: 'activities' }),
      getRates(),
    ]);
    return { activities: normalize(res, input.cityCode, rates), source: 'live' };
  })();

  cache.set(key, { at: Date.now(), promise });
  promise.catch(() => cache.delete(key));
  return promise;
}

// ── Hotelbeds Activities response (minimal shape we use) ────────────────────
interface HbActivitiesResponse {
  activities?: HbActivity[];
}
interface HbActivity {
  code?: string;
  name?: string;
  content?: { description?: string; media?: { images?: Array<{ urls?: Array<{ resource?: string; sizeType?: string }> }> } };
  modalities?: HbModality[];
  durationValue?: number;
  durationType?: string;          // 'HOURS' | 'MINUTES' | 'DAYS'
}
interface HbModality {
  code?: string;
  name?: string;
  amountsFrom?: Array<{ amount?: number; paxType?: string }>;
  currency?: string;
  rateKey?: string;
}

function normalize(res: HbActivitiesResponse, cityCode: string, rates: Rates): HotelbedsActivity[] {
  const list = res.activities ?? [];
  return list.map((a): HotelbedsActivity => {
    const mod = a.modalities?.[0];
    const adultAmount = mod?.amountsFrom?.find((x) => x.paxType === 'ADULT')?.amount ?? mod?.amountsFrom?.[0]?.amount ?? 0;
    const currency = mod?.currency ?? 'EUR';
    const imgPath = a.content?.media?.images?.[0]?.urls?.[0]?.resource;
    const durationMin = computeMinutes(a.durationValue, a.durationType);
    return {
      id: `ACT-${a.code ?? Math.random().toString(36).slice(2, 8)}`,
      name: a.name ?? 'Activity',
      slot: durationMin >= 360 ? 'full-day' : durationMin >= 240 ? 'afternoon' : 'morning',
      durationMin,
      description: a.content?.description,
      thumb: imgPath,
      pricePaise: toInrPaiseWith(rates, adultAmount, currency),
      cityCode,
      activityCode: a.code,
      modalityCode: mod?.code,
      rateKey: mod?.rateKey,
      currency,
    };
  });
}

function computeMinutes(val?: number, type?: string): number {
  if (!val) return 120;
  const t = (type ?? 'HOURS').toUpperCase();
  if (t === 'MINUTES') return val;
  if (t === 'HOURS') return val * 60;
  if (t === 'DAYS') return val * 8 * 60; // assume 8h per "day"
  return val * 60;
}
