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
  /** Minutes; 0 when Hotelbeds didn't state a duration (UI then hides it). */
  durationMin: number;
  description?: string;
  thumb?: string;
  /** Total for the searched party (adults × adult price + children × child price), INR paise. */
  pricePaise: number;
  /** One adult, INR paise — the "from, per person" figure. */
  perPersonPaise: number;
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
      hbCall<HbActivitiesResponse>('/activity-api/3.0/activities', body, { product: 'activities', retries: 1 }),
      getRates(),
    ]);
    return { activities: normalize(res, input.cityCode, rates, input.paxAdults, input.paxChildren ?? 0), source: 'live' };
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
  duration?: { value?: number; metric?: string };
  durationValue?: number;
  durationType?: string;          // 'HOURS' | 'MINUTES' | 'DAYS'
}
interface HbModality {
  code?: string;
  name?: string;
  amountsFrom?: Array<{ amount?: number; paxType?: string }>;
  duration?: { value?: number; metric?: string };
  currency?: string;
  rateKey?: string;
}

// Hotelbeds returns each photo in several sizes — pick the sharpest available
// (the first/default is often a small thumbnail that looks blurry when scaled up).
const IMG_SIZE_PRIORITY = ['XLARGE', 'LARGE', 'MEDIUM', 'SMALL'];
function pickBestImage(images?: Array<{ urls?: Array<{ resource?: string; sizeType?: string }> }>): string | undefined {
  const urls = images?.find((im) => im.urls?.length)?.urls;
  if (!urls?.length) return undefined;
  for (const size of IMG_SIZE_PRIORITY) {
    const hit = urls.find((u) => (u.sizeType ?? '').toUpperCase() === size && u.resource);
    if (hit?.resource) return hit.resource;
  }
  return urls.find((u) => u.resource)?.resource;
}

function normalize(res: HbActivitiesResponse, cityCode: string, rates: Rates, adults: number, children: number): HotelbedsActivity[] {
  const list = res.activities ?? [];
  return list.map((a): HotelbedsActivity => {
    const mod = a.modalities?.[0];
    const adultAmount = mod?.amountsFrom?.find((x) => x.paxType === 'ADULT')?.amount ?? mod?.amountsFrom?.[0]?.amount ?? 0;
    // amountsFrom are per-person prices; children fall back to the adult price.
    const childAmount = mod?.amountsFrom?.find((x) => x.paxType === 'CHILD')?.amount ?? adultAmount;
    const groupAmount = adultAmount * Math.max(1, adults) + childAmount * Math.max(0, children);
    const currency = mod?.currency ?? 'EUR';
    const imgPath = pickBestImage(a.content?.media?.images);
    const d = mod?.duration ?? a.duration;
    const durationMin = d?.value ? computeMinutes(d.value, d.metric) : a.durationValue ? computeMinutes(a.durationValue, a.durationType) : 0;
    return {
      id: `ACT-${a.code ?? Math.random().toString(36).slice(2, 8)}`,
      name: a.name ?? 'Activity',
      slot: durationMin >= 360 ? 'full-day' : durationMin >= 240 ? 'afternoon' : 'morning',   // unknown (0) → morning
      durationMin,
      description: stripHtml(a.content?.description),
      thumb: imgPath,
      pricePaise: toInrPaiseWith(rates, groupAmount, currency),
      perPersonPaise: toInrPaiseWith(rates, adultAmount, currency),
      cityCode,
      activityCode: a.code,
      modalityCode: mod?.code,
      rateKey: mod?.rateKey,
      currency,
    };
  });
}

// Hotelbeds activity descriptions arrive as HTML (e.g. "<p>Visit …</p>").
// Strip tags + decode the common entities so the UI shows clean prose.
function stripHtml(s?: string): string | undefined {
  if (!s) return undefined;
  const text = s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
  return text || undefined;
}

function computeMinutes(val?: number, type?: string): number {
  if (!val) return 0;
  const t = (type ?? 'HOURS').toUpperCase();
  if (t === 'MINUTES') return val;
  if (t === 'HOURS') return val * 60;
  if (t === 'DAYS') return val * 8 * 60; // assume 8h per "day"
  return val * 60;
}
