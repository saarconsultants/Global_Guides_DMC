// Server-only: one activity search across every supplier (Hotelbeds + Leamigo).
// Used by the Activities page and the builder's Add activity modal so both
// show the same inventory. Sample (mock) activities are only returned when no
// supplier has live results — never mixed in with live ones.

import { searchActivities, isLive as hotelbedsLive, type HotelbedsActivity } from '@gg/hotelbeds';
import { searchLeamigoActivities, leamigoActivityCities, isLive as leamigoLive, type LeamigoActivity } from '@gg/leamigo';
import { activitiesForCity, cityInfo } from '@/lib/itinerary/mock-inventory';
import type { Activity } from '@/lib/itinerary/types';

export interface ActivitySearch {
  cityCode: string;
  fromDate: string;
  toDate: string;
  adults: number;
  children?: number;
}

export interface ActivitySearchResult {
  activities: Activity[];
  source: 'live' | 'mock' | 'unsupported-city';
  /** Shown to agents only when nothing live came back. Plain wording. */
  warning?: string;
  counts: { hotelbeds: number; leamigo: number };
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
    const [lm, cities] = await Promise.all([
      searchLeamigoActivities({ cityId: id, adults, children }).catch((e) => { console.error('[activities] leamigo', e?.message ?? e); return { activities: [] as LeamigoActivity[], partial: true }; }),
      leamigoActivityCities().catch(() => []),
    ]);
    return {
      activities: lm.activities.map(lmToApp(q.cityCode)), source: 'live',
      counts: { hotelbeds: 0, leamigo: lm.activities.length },
      cityName: cities.find((c) => c.id === id)?.name ?? lm.activities[0]?.city ?? 'this city',
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
      ? searchLeamigoActivities({ cityName: city.name, countryCode: city.countryCode, adults, children })
          .catch((e) => { console.error('[activities] leamigo', e?.message ?? e); return { activities: [] as LeamigoActivity[], partial: true }; })
      : Promise.resolve({ activities: [] as LeamigoActivity[] }),
  ]);
  if (hb.warning && hb.source !== 'live') console.error('[activities] hotelbeds warning', hb.warning);

  const live = [...hb.activities.map(hbToApp), ...lm.activities.map(lmToApp(q.cityCode))];
  const counts = { hotelbeds: hb.activities.length, leamigo: lm.activities.length };
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
});
