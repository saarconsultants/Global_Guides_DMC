// Server-only bridge: Unifystays hotels and room offers in the app's Hotel shape.
// Unifystays search gives a price per hotel; rooms (and the booking token) come
// from a separate room search, fetched when the agent opens rooms and again at booking.

import { searchHotels, getRoomOffers, isLive, type UnifyOffer, type UnifyHotel } from '@gg/unifystays';
import { childAgesFor } from '@gg/hotelbeds';
import { cityInfo } from '@/lib/itinerary/mock-inventory';
import type { Hotel, Room, StarRating } from '@/lib/itinerary/types';

export { isLive as unifyIsLive };

export const UNIFY_PREFIX = 'US-';
/** Shown until the agent picks a room: booking then takes the cheapest offer. */
export const BEST_ROOM = 'Best available room';
export const BEST_BOARD = 'Best available rate';

const nightsOf = (checkIn: string, checkOut: string) => Math.max(1, Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86_400_000));
export const unifyRooms = (rooms: Room[]) => rooms.map((r) => ({ adults: r.adults, childAges: childAgesFor(r) }));

function toHotel(h: UnifyHotel, cityCode: string, nights: number, needsPriceCheck = false): Hotel {
  return {
    id: `${UNIFY_PREFIX}${h.hotelId}`, name: h.name, stars: Math.min(5, Math.max(3, h.stars)) as StarRating,
    address: [h.address, h.city].filter(Boolean).join(', '), cityCode,
    thumb: h.image, allImages: h.image ? [h.image] : undefined,
    refundable: !!h.refundable, mealPlan: BEST_BOARD,
    pricePerNightPaise: Math.round(h.totalPaise / nights),
    room: { name: BEST_ROOM, bedConfig: '' },
    latitude: h.latitude, longitude: h.longitude,
    ...(needsPriceCheck ? { needsPriceCheck } : {}),
  };
}

/** Live hotels for a city. Only 3★ and up, like the rest of the platform. */
export async function searchUnifyHotels(input: {
  cityCode: string; checkIn: string; checkOut: string; rooms: Room[]; nationality?: string; minStars?: number;
  maxPages?: number; waitMs?: number;
}): Promise<{ hotels: Hotel[]; unpriced: number; checkable: Hotel[]; warning?: string }> {
  if (!isLive()) return { hotels: [], unpriced: 0, checkable: [] };
  const c = cityInfo(input.cityCode);
  const res = await searchHotels({
    cityName: c.name, countryCode: c.countryCode, checkIn: input.checkIn, checkOut: input.checkOut,
    rooms: unifyRooms(input.rooms), nationality: input.nationality, minStars: Math.max(3, input.minStars ?? 3),
    maxPages: input.maxPages, waitMs: input.waitMs,
  });
  const nights = nightsOf(input.checkIn, input.checkOut);
  return {
    hotels: res.hotels.filter((h) => h.stars >= 3).map((h) => toHotel(h, input.cityCode, nights)),
    checkable: res.checkable.filter((h) => h.stars >= 3).map((h) => toHotel(h, input.cityCode, nights, true)),
    unpriced: res.unpriced, warning: res.warning,
  };
}

export const roomLabel = (o: UnifyOffer) => [...new Set(o.rooms.map((r) => r.name))].join(' + ');
export const boardLabel = (o: UnifyOffer) => o.rooms[0]?.meal.label ?? 'Room only';
export const isRefundable = (o: UnifyOffer) => o.refundability === 'REFUNDABLE' || (o.refundability === 'PARTIALLY_REFUNDABLE' && !!o.freeCancellationUntil);

/** Room offers in the shape the room picker uses. `rateKey` is the offer id: a label, never a booking key. */
export async function unifyRoomOptions(hotelId: string, input: { checkIn: string; checkOut: string; rooms: Room[]; nationality?: string }): Promise<{ options: NonNullable<Hotel['roomOptions']>; partial: boolean }> {
  const { offers, partial } = await getRoomOffers(hotelId.replace(UNIFY_PREFIX, ''), { ...input, rooms: unifyRooms(input.rooms) });
  const nights = nightsOf(input.checkIn, input.checkOut);
  return {
    partial,
    options: offers.map((o) => ({
      roomName: roomLabel(o), board: boardLabel(o), refundable: isRefundable(o),
      pricePerNightPaise: Math.round(o.payablePaise / nights), totalPaise: o.payablePaise, rateKey: o.offerId,
      cancellationPolicies: o.penalties.filter((p) => p.from && p.amountPaise !== null).map((p) => ({ from: p.from, amountPaise: p.amountPaise! })),
      promotions: o.promotions.map((name) => ({ name })),
    })),
  };
}
