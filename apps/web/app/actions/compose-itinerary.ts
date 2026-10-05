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
import { airportPlace } from '@/lib/airport-coords';
import { quoteLeamigoLeg, hotelPoint, pickDefault, leamigoIsLive, type PlacePoint } from '@/lib/transfers/leamigo';
import type { Hotel, IntakeForm, Itinerary, StarRating, Transfer, TransferVehicle } from '@/lib/itinerary/types';

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
          rooms: intake.rooms.map((r) => ({ adults: r.adults, children: r.children, childAges: r.childAges })),
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
  // Arrival / departure: Hotelbeds (airport IATA + hotel code) and Leamigo
  // (coordinates) are asked in parallel; the cheapest private option wins.
  // Inter-city: only Leamigo can quote hotel ↔ hotel, so it replaces the
  // placeholder price when both hotels have supplier coordinates.
  // Every quote is individually capped so a slow supplier can't push the whole
  // compose past its 9s deadline (which would discard the live hotels too).
  const hbTransfersLive = isLive('transfers');
  const lmLive = leamigoIsLive();
  if (hbTransfersLive || lmLive) {
    const adults = intake.rooms.reduce((s, r) => s + r.adults, 0) || 1;
    const pax = adults + intake.rooms.reduce((s, r) => s + (r.children ?? 0), 0);

    await Promise.allSettled(
      itinerary.days.map(async (day) => {
        try {
          const destIdx = itinerary.destinations.findIndex((x) => x.cityCode === day.cityCode);
          const hotel = itinerary.destinations[destIdx]?.stay?.hotel;
          if (!hotel) return;
          const city = cityInfo(day.cityCode);

          let kind: Transfer['kind'];
          let fromName: string, toName: string;
          let lmFrom: PlacePoint | null = null, lmTo: PlacePoint | null = null;
          let hb: { fromType: 'IATA' | 'ATLAS'; fromCode: string; toType: 'IATA' | 'ATLAS'; toCode: string } | null = null;
          const atlas = hotel.id.startsWith('HB-') ? hotel.id.replace('HB-', '') : null;

          if (day.type === 'arrival') {
            kind = 'arrival'; fromName = city.airportName; toName = hotel.name;
            lmFrom = airportPlace(city.airportCode); lmTo = hotelPoint(hotel);
            if (atlas) hb = { fromType: 'IATA', fromCode: city.airportCode, toType: 'ATLAS', toCode: atlas };
          } else if (day.type === 'departure') {
            kind = 'departure'; fromName = hotel.name; toName = city.airportName;
            lmFrom = hotelPoint(hotel); lmTo = airportPlace(city.airportCode);
            if (atlas) hb = { fromType: 'ATLAS', fromCode: atlas, toType: 'IATA', toCode: city.airportCode };
          } else if (day.type === 'transit' && destIdx > 0) {
            const prevHotel = itinerary.destinations[destIdx - 1]?.stay?.hotel;
            if (!prevHotel) return;
            kind = 'inter-city'; fromName = prevHotel.name; toName = hotel.name;
            lmFrom = hotelPoint(prevHotel); lmTo = hotelPoint(hotel);
          } else {
            return;
          }

          const candidates: Transfer[] = [];
          await Promise.allSettled([
            (async () => {
              if (!hbTransfersLive || !hb) return;
              const res = await searchTransfers({ ...hb, pickupDate: day.date, adults });
              if (res.source !== 'live') return;
              for (const t of res.transfers) candidates.push({
                id: t.id, kind, fromName, toName,
                vehicle: mapVehicle(t.vehicleKind),
                bagsAllowed: t.maxPax >= 4 ? 4 : t.maxPax,
                pricePaise: t.pricePaise,
                description: `Hotelbeds · ${t.vehicleName}`,
              });
            })(),
            (async () => {
              if (!lmLive || !lmFrom || !lmTo) return;
              const res = await quoteLeamigoLeg({ kind, from: lmFrom, to: lmTo, fromName, toName, pickupDate: day.date, passengers: pax, timeoutMs: 3_500 });
              candidates.push(...res.transfers);
            })(),
          ]);

          const best = pickDefault(candidates);
          if (!best) return;
          // Replace the placeholder transfer of the same kind with the live one.
          day.inclusions = day.inclusions.map((inc) =>
            inc.kind === 'transfer' && inc.transfer.kind === kind ? { kind: 'transfer' as const, transfer: best } : inc,
          );
        } catch (e) {
          console.warn('[compose] transfer enrichment failed for day', day.dayNo, (e as Error)?.message ?? e);
        }
      }),
    );

    // Recompute totals since transfer prices changed
    let total = 0;
    for (const d of itinerary.destinations) if (d.stay) total += d.stay.hotel.pricePerNightPaise * d.nights;
    for (const day of itinerary.days) for (const inc of day.inclusions) if (inc.kind === 'transfer') total += inc.transfer.pricePaise;
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
  latitude?: number; longitude?: number;
}): Hotel {
  return {
    id: h.id, name: h.name, stars: h.stars, address: h.address, cityCode: h.cityCode,
    thumb: h.thumb, rating: h.rating, refundable: h.refundable, mealPlan: h.mealPlan,
    pricePerNightPaise: h.pricePerNightPaise, room: h.room,
    latitude: h.latitude, longitude: h.longitude,
  };
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d); x.setDate(x.getDate() + n); return x;
}
