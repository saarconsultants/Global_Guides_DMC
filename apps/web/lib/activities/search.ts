// Server-only: one activity search across every supplier (Hotelbeds + Leamigo).
// Used by the Activities page and the builder's Add activity modal so both
// show the same inventory. Sample (mock) activities are only returned when no
// supplier has live results — never mixed in with live ones.

import { searchActivities, isLive as hotelbedsLive, type HotelbedsActivity } from '@gg/hotelbeds';
import { unstable_cache } from 'next/cache';
import { searchLeamigoActivities, isLive as leamigoLive, type LeamigoActivity, type LeamigoListing } from '@gg/leamigo';
import { activitiesForCity, cityInfo } from '@/lib/itinerary/mock-inventory';
import type { Activity } from '@/lib/itinerary/types';

// Leamigo pricing means a call per activity, seconds in a big city. Vercel's data
// cache is shared by every server instance, so one agent's search makes the next
// instant. Prices and availability are rechecked at booking.
const SEARCH_CACHE_S = 15 * 60;

type LeamigoResult = Awaited<ReturnType<typeof searchLeamigoActivities>>;
class IncompleteSearch extends Error { constructor(readonly result: LeamigoResult) { super('incomplete'); } }

const cachedSearch = unstable_cache(async (input: { cityId?: number; cityName?: string; countryCode?: string; adults: number; children: number; optionsBudgetMs?: number }) => {
  const result = await searchLeamigoActivities(input);
  // A big city can't all be checked in one go, and that's kept: unchecked rows are checked when opened.
  // Only a search that found nothing because Leamigo failed isn't kept.
  if (result.partial && !result.activities.length && !result.listOnly.length) throw new IncompleteSearch(result);
  return result;
}, ['leamigo-activity-search-v6'], { revalidate: SEARCH_CACHE_S });

async function leamigoSearch(input: { cityId?: number; cityName?: string; countryCode?: string; adults: number; children: number; optionsBudgetMs?: number }): Promise<LeamigoResult> {
  try {
    return await cachedSearch(input);
  } catch (e) {
    if (e instanceof IncompleteSearch) return e.result;
    console.error('[activities] leamigo', (e as Error)?.message ?? e);
    return { activities: [], listOnly: [], partial: true };
  }
}

export interface ActivitySearch {
  cityCode: string;
  fromDate: string;
  toDate: string;
  adults: number;
  children?: number;
  /** Also return products the supplier lists but we can't sell yet. Browsing only; never for building a trip automatically. */
  includeListOnly?: boolean;
  /** How long to spend checking options, for callers that can't wait for the usual time. */
  optionsBudgetMs?: number;
}

export interface ActivitySearchResult {
  activities: Activity[];
  source: 'live' | 'mock' | 'unsupported-city';
  /** Shown to agents only when nothing live came back. Plain wording. */
  warning?: string;
  /** hotelbeds + leamigo can be booked; listOnly can only be looked at. */
  counts: { hotelbeds: number; leamigo: number; listOnly: number };
  /** Display name of the searched city. */
  cityName: string;
  /** The supplier had more than could be priced in time. */
  partial?: boolean;
}

export async function searchAllActivities(q: ActivitySearch): Promise<ActivitySearchResult> {
  const adults = Math.max(1, q.adults || 1), children = Math.max(0, q.children ?? 0);

  // A Leamigo-only city, outside our own catalogue ("LM-<leamigo city id>").
  const lmCity = /^LM-(\d+)$/i.exec(q.cityCode);
  if (lmCity) {
    const id = Number(lmCity[1]);
    const lm = await leamigoSearch({ cityId: id, adults, children, optionsBudgetMs: q.optionsBudgetMs });
    const listed = q.includeListOnly ? lm.listOnly.map(listingToApp(q.cityCode)) : [];
    return {
      activities: [...lm.activities.map(lmToApp(q.cityCode)), ...listed], source: 'live',
      counts: { hotelbeds: 0, leamigo: lm.activities.length, listOnly: listed.length },
      cityName: lm.activities[0]?.city ?? lm.listOnly[0]?.city ?? 'this city',
      partial: lm.partial,
    };
  }

  const city = cityInfo(q.cityCode);
  const [hb, lm] = await Promise.all([
    hotelbedsLive('activities')
      ? searchActivities({ cityCode: q.cityCode, fromDate: q.fromDate, toDate: q.toDate, paxAdults: adults, paxChildren: children })
          .catch((e) => { console.error('[activities] hotelbeds', e?.message ?? e); return { activities: [] as HotelbedsActivity[], source: 'mock' as const, warning: 'error' as string | undefined }; })
      : Promise.resolve({ activities: [] as HotelbedsActivity[], source: 'mock' as const, warning: undefined as string | undefined }),
    leamigoLive()
      ? leamigoSearch({ cityName: city.name, countryCode: city.countryCode, adults, children, optionsBudgetMs: q.optionsBudgetMs })
      : Promise.resolve({ activities: [] as LeamigoActivity[], listOnly: [] as LeamigoListing[] }),
  ]);
  if (hb.warning && hb.source !== 'live') console.error('[activities] hotelbeds warning', hb.warning);

  const listed = q.includeListOnly ? lm.listOnly.map(listingToApp(q.cityCode)) : [];
  const live = [...hb.activities.map(hbToApp), ...lm.activities.map(lmToApp(q.cityCode)), ...listed];
  const counts = { hotelbeds: hb.activities.length, leamigo: lm.activities.length, listOnly: listed.length };
  if (live.length) return { activities: live, source: 'live', counts, cityName: city.name, partial: (lm as { partial?: boolean }).partial };

  return {
    activities: activitiesForCity(q.cityCode),
    source: hb.source === 'unsupported-city' ? 'unsupported-city' : 'mock',
    warning: hb.warning === 'error' ? "Live prices couldn't load. Try again in a minute." : undefined,
    counts,
    cityName: city.name,
  };
}

function hbToApp(a: HotelbedsActivity): Activity {
  return {
    id: a.id, name: a.name, category: 'tour', durationMin: a.durationMin,
    pricePaise: a.pricePaise, perPersonPaise: a.perPersonPaise, priceBasis: 'person',
    cityCode: a.cityCode, thumb: a.thumb, description: a.description,
  };
}

const listingToApp = (cityCode: string) => (a: LeamigoListing): Activity => ({
  id: `LML-${a.activityId}`,
  name: a.title,
  category: 'tour',
  durationMin: a.durationMin,
  pricePaise: a.fromPaise ?? 0,
  cityCode,
  thumb: a.thumb,
  description: a.description,
  listOnly: { activityId: a.activityId, checked: a.checked },
  supplierCategory: a.category,
  supplierName: a.supplierName,
  supplierVerified: a.supplierVerified,
});

const lmToApp = (cityCode: string) => (a: LeamigoActivity): Activity => ({
  id: a.id,
  name: a.title,
  category: 'tour',
  durationMin: a.durationMin,
  pricePaise: a.pricePaise,
  perPersonPaise: a.perPersonPaise,
  priceBasis: a.priceBasis,
  cityCode,
  thumb: a.thumb,
  // First segment is the option name — booking reads it back as the voucher sub-line.
  description: [a.optionName, a.description, a.freeCancellation ? 'Free cancellation' : 'Non-refundable'].filter(Boolean).join(' · '),
  leamigo: {
    activityId: a.activityId, optionId: a.optionId, ticketId: a.ticketId, quantity: a.quantity,
    openDated: a.bookingType === 'open_dated', freeCancellation: a.freeCancellation, cancellationRules: a.cancellationRules,
    timed: a.bookingType === 'date_time_required',
    lines: a.lines,
  },
  options: a.options,
  supplierCategory: a.category,
  supplierName: a.supplierName,
  supplierVerified: a.supplierVerified,
});
