'use server';
// Compose an itinerary server-side, pulling live Hotelbeds inventory for each
// destination before delegating to the (pure, sync) composeItinerary function.
//
// Strategy per city:
//   1. Hit Hotelbeds availability with the user's check-in / check-out / pax.
//   2. Filter to the requested star rating (or 3★+ if user didn't specify).
//   3. Sort by price asc, pick the median entry as a sensible default.
//      (Cheapest is often a hostel-tier room; median = solid mid-market pick.)
//   4. If Hotelbeds returns nothing for this city, leave the slot blank —
//      composeItinerary will fall back to its mock inventory automatically.

import { searchHotels, isLive } from '@gg/hotelbeds';
import { composeItinerary } from '@/lib/itinerary/compose';
import type { Hotel, IntakeForm, Itinerary, StarRating } from '@/lib/itinerary/types';

const HOTEL_CHECKIN_HOUR = 14;
const HOTEL_CHECKOUT_HOUR = 12;

export async function composeItineraryAction(intake: IntakeForm): Promise<Itinerary> {
  const overrides: Record<string, Hotel> = {};

  if (isLive()) {
    // Walk destinations, fetching Hotelbeds in parallel — but with realistic
    // check-in/out per destination based on the running day offset.
    const startDate = new Date(intake.departureDate);
    let dayOffset = 0;

    const fetches = intake.destinations.map((d) => {
      const ci = addDays(startDate, dayOffset);
      ci.setHours(HOTEL_CHECKIN_HOUR, 0, 0, 0);
      const co = addDays(ci, d.nights);
      co.setHours(HOTEL_CHECKOUT_HOUR, 0, 0, 0);
      dayOffset += d.nights;
      return {
        cityCode: d.cityCode,
        checkIn: ci.toISOString().slice(0, 10),
        checkOut: co.toISOString().slice(0, 10),
      };
    });

    const results = await Promise.allSettled(
      fetches.map((f) =>
        searchHotels({
          cityCode: f.cityCode,
          checkIn: f.checkIn,
          checkOut: f.checkOut,
          rooms: intake.rooms.map((r) => ({ adults: r.adults, children: r.children })),
          minStars: intake.starRating,
        }),
      ),
    );

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const cityCode = fetches[i]!.cityCode;
      if (!r || r.status !== 'fulfilled') continue;
      const hotels = r.value.hotels;
      if (hotels.length === 0) continue;

      const star = intake.starRating;
      // Filter to requested star tier; if no exact matches, take 4★+, then anything 3★+.
      const filtered =
        star && hotels.some((h) => h.stars === star) ? hotels.filter((h) => h.stars === star) :
        hotels.some((h) => h.stars >= 4) ? hotels.filter((h) => h.stars >= 4) :
        hotels;

      const sorted = [...filtered].sort((a, b) => a.pricePerNightPaise - b.pricePerNightPaise);
      const median = sorted[Math.floor(sorted.length / 2)]!;

      overrides[cityCode] = hotelbedsToHotel(median);
    }
  }

  return composeItinerary(intake, overrides);
}

function hotelbedsToHotel(h: {
  id: string; name: string; stars: StarRating; address: string; cityCode: string;
  thumb?: string; rating?: { score: number; label: string; reviewCount: number };
  refundable: boolean; mealPlan: string; pricePerNightPaise: number; room: { name: string; bedConfig: string };
}): Hotel {
  return {
    id: h.id, name: h.name, stars: h.stars, address: h.address, cityCode: h.cityCode,
    thumb: h.thumb, rating: h.rating, refundable: h.refundable, mealPlan: h.mealPlan,
    pricePerNightPaise: h.pricePerNightPaise, room: h.room,
  };
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d); x.setDate(x.getDate() + n); return x;
}
