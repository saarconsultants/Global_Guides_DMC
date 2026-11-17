// Server-only: every live hotel supplier for one city and stay, in the app's Hotel shape.
// Hotelbeds (when switched on) and Unifystays (when its key is set) are asked in
// parallel; one failing never hides the other.

import { searchHotels as hotelbedsSearch, isLive as hotelbedsLive, type HotelbedsHotel } from '@gg/hotelbeds';
import { searchUnifyHotels, unifyIsLive } from '@/lib/hotels/unifystays';
import type { Hotel, Room, StarRating } from '@/lib/itinerary/types';

export const anyHotelSupplierLive = () => hotelbedsLive('hotels') || unifyIsLive();

export function hotelbedsToApp(h: HotelbedsHotel): Hotel {
  return {
    id: h.id, name: h.name, stars: h.stars, address: h.address, cityCode: h.cityCode,
    thumb: h.thumb, rating: h.rating, refundable: h.refundable, mealPlan: h.mealPlan,
    pricePerNightPaise: h.pricePerNightPaise, room: h.room, allImages: h.allImages, latitude: h.latitude, longitude: h.longitude,
    // Kept with the trip: booking uses these rates rather than searching again.
    roomOptions: h.roomOptions, rateKey: h.rateKey,
  };
}

export async function searchLiveHotels(input: {
  cityCode: string; checkIn: string; checkOut: string; rooms: Room[];
  /** Country of residence (Hotelbeds source market) and nationality (Unifystays), ISO alpha-2. */
  market?: string; nationality?: string; minStars?: StarRating;
  /** For callers with a tight time limit (trip composer, AI planner): fewer pages, shorter price wait. */
  fast?: boolean;
}): Promise<{ hotels: Hotel[]; source: 'live' | 'mock' | 'unsupported-city'; warning?: string }> {
  const [hb, us] = await Promise.allSettled([
    hotelbedsLive('hotels')
      ? hotelbedsSearch({ cityCode: input.cityCode, checkIn: input.checkIn, checkOut: input.checkOut, rooms: input.rooms, minStars: input.minStars, ...(input.market ? { sourceMarket: input.market } : {}) })
      : Promise.resolve(null),
    unifyIsLive()
      ? searchUnifyHotels({ cityCode: input.cityCode, checkIn: input.checkIn, checkOut: input.checkOut, rooms: input.rooms, nationality: input.nationality ?? input.market, minStars: input.minStars, ...(input.fast ? { maxPages: 1, waitMs: 5_000 } : {}) })
      : Promise.resolve(null),
  ]);
  const warnings: string[] = [];
  const hotels: Hotel[] = [];
  let hbSource: 'live' | 'mock' | 'unsupported-city' | null = null;
  if (hb.status === 'fulfilled' && hb.value) {
    hbSource = hb.value.source;
    if (hb.value.source === 'live') hotels.push(...hb.value.hotels.map(hotelbedsToApp));
    if (hb.value.warning) warnings.push(hb.value.warning);
  } else if (hb.status === 'rejected') warnings.push(`Hotelbeds: ${hb.reason?.message ?? 'search failed'}`);
  if (us.status === 'fulfilled' && us.value) {
    hotels.push(...us.value.hotels);
    if (us.value.warning) warnings.push(us.value.warning);
  } else if (us.status === 'rejected') warnings.push(`Unifystays: ${us.reason?.message ?? 'search failed'}`);
  if (warnings.length) console.error('[hotels] supplier warnings', warnings.join(' | '));
  return {
    hotels,
    source: hotels.length ? 'live' : hbSource === 'unsupported-city' ? 'unsupported-city' : 'mock',
    warning: warnings.join(' ') || undefined,
  };
}
