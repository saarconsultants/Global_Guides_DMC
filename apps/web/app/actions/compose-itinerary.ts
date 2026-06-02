'use server';
// Compose an itinerary server-side, pulling live Hotelbeds inventory for each
// destination before delegating to the (pure, sync) composeItinerary function.
//
// Strategy:
//   Hotels  — per destination, Hotelbeds availability → pick median by price
//             matching requested star rating. Falls back to mock.
//   Transfers — after compose, for arrival/departure days try to replace the
//             mock transfer with a live Hotelbeds airport↔hotel transfer.
//             Intercity transfers stay mock (Hotelbeds doesn't natively
//             support city-to-city transfers without an airport leg).

import { searchHotels, searchTransfers, isLive } from '@gg/hotelbeds';
import { composeItinerary } from '@/lib/itinerary/compose';
import { cityInfo } from '@/lib/itinerary/mock-inventory';
import type { Hotel, IntakeForm, Itinerary, StarRating, TransferVehicle } from '@/lib/itinerary/types';

const HOTEL_CHECKIN_HOUR = 14;
const HOTEL_CHECKOUT_HOUR = 12;

export async function composeItineraryAction(intake: IntakeForm): Promise<Itinerary> {
  // Race the whole live-enrichment path against a 9s deadline. Vercel kills
  // serverless functions at 10s on Hobby — if Hotelbeds is slow, we'd rather
  // ship a mock-fallback itinerary than crash the intake page.
  try {
    return await Promise.race([
      composeWithLive(intake),
      new Promise<Itinerary>((_, reject) => setTimeout(() => reject(new Error('compose-deadline')), 9_000)),
    ]);
  } catch (e) {
    console.warn('[compose] live enrichment timed out or failed, falling back to mock:', (e as Error)?.message ?? e);
    return composeItinerary(intake);
  }
}

async function composeWithLive(intake: IntakeForm): Promise<Itinerary> {
  const overrides: Record<string, Hotel> = {};

  if (isLive('hotels')) {
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

  const itinerary = composeItinerary(intake, overrides);

  // ── Transfer enrichment ──────────────────────────────────────────────────
  // For arrival + departure days only (intercity stays mock — Hotelbeds doesn't
  // do city↔city transfers directly). Each call is wrapped so a failure leaves
  // the mock transfer in place instead of breaking the whole compose.
  if (isLive('transfers')) {
    const startDate = new Date(intake.departureDate);
    let dayOffset = 0;

    await Promise.allSettled(
      itinerary.days.map(async (day) => {
        try {
          const dest = itinerary.destinations.find((x) => x.cityCode === day.cityCode);
          const hotel = dest?.stay?.hotel;
          if (!hotel || !hotel.id.startsWith('HB-')) return;       // only enrich live-hotel stays
          const hotelAtlas = hotel.id.replace('HB-', '');

          const city = cityInfo(day.cityCode);
          if (!city.airportCode) return;

          const pickupDate = day.date;                              // YYYY-MM-DD
          const adults = intake.rooms.reduce((s, r) => s + r.adults, 0) || 1;

          let from: { type: 'IATA' | 'ATLAS'; code: string; name: string };
          let to:   { type: 'IATA' | 'ATLAS'; code: string; name: string };
          let kind: 'arrival' | 'departure';

          if (day.type === 'arrival') {
            from = { type: 'IATA',  code: city.airportCode, name: city.airportName };
            to   = { type: 'ATLAS', code: hotelAtlas,        name: hotel.name };
            kind = 'arrival';
          } else if (day.type === 'departure') {
            from = { type: 'ATLAS', code: hotelAtlas,        name: hotel.name };
            to   = { type: 'IATA',  code: city.airportCode, name: city.airportName };
            kind = 'departure';
          } else {
            return; // skip transit / stay days
          }

          const res = await searchTransfers({
            fromType: from.type, fromCode: from.code,
            toType:   to.type,   toCode:   to.code,
            pickupDate, adults,
          });
          if (res.source !== 'live' || res.transfers.length === 0) return;

          // Prefer cheapest private; fall back to cheapest overall
          const privateOnly = res.transfers.filter((t) => t.vehicleKind !== 'SHARED');
          const sorted = (privateOnly.length > 0 ? privateOnly : res.transfers).sort((a, b) => a.pricePaise - b.pricePaise);
          const best = sorted[0];
          if (!best) return;

          // Replace the mock transfer inclusion(s) with the live one
          const newInclusions = day.inclusions.map((inc) => {
            if (inc.kind !== 'transfer') return inc;
            if (inc.transfer.kind !== kind) return inc;
            return {
              kind: 'transfer' as const,
              transfer: {
                id: best.id,
                kind,
                fromName: from.name,
                toName:   to.name,
                vehicle: mapVehicle(best.vehicleKind),
                bagsAllowed: best.maxPax >= 4 ? 4 : best.maxPax,
                pricePaise: best.pricePaise,
              },
            };
          });
          day.inclusions = newInclusions;
        } catch (e) {
          console.warn('[compose] transfer enrichment failed for day', day.dayNo, (e as Error)?.message ?? e);
        }
      }),
    );

    // Recompute totals since transfer prices changed
    let total = 0;
    for (const d of itinerary.destinations) if (d.stay) total += d.stay.hotel.pricePerNightPaise * d.nights;
    for (const day of itinerary.days) for (const inc of day.inclusions) if (inc.kind === 'transfer') total += inc.transfer.pricePaise;
    const adults = intake.rooms.reduce((s, r) => s + r.adults, 0) || 1;
    itinerary.pricePaise = total;
    itinerary.pricePerAdultPaise = Math.round(total / adults);
  }

  return itinerary;
}

function mapVehicle(kind: string): TransferVehicle {
  if (kind === 'PRIVATE_PREMIUM' || kind === 'LUXURY') return 'PRIVATE_PREMIUM';
  if (kind === 'PRIVATE' || kind === 'MINIBUS') return 'PRIVATE';
  return 'SHARED';
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
