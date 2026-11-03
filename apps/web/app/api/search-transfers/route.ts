// POST /api/search-transfers — see comment in search-activities/route.ts for why this isn't a server action.
//
// Two suppliers, searched in parallel and merged:
//   • Hotelbeds — needs the airport IATA + the Hotelbeds hotel code (ATLAS).
//   • Leamigo   — needs coordinates for both ends: the airport's from
//                 lib/airport-coords, the hotel's from the supplier.
// Each runs only when it has what it needs; one failing never blocks the other.

import { NextResponse } from 'next/server';
import { searchTransfers, isLive as hotelbedsIsLive, type HotelbedsTransfer } from '@gg/hotelbeds';
import type { Transfer, TransferVehicle } from '@/lib/itinerary/types';
import { airportPlace } from '@/lib/airport-coords';
import { quoteLeamigoLeg, hotelPoint, cityPoint, pickDefault, leamigoIsLive } from '@/lib/transfers/leamigo';
import { cityInfo } from '@/lib/itinerary/mock-inventory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Body {
  kind: 'arrival' | 'departure' | 'inter-city';
  airportCode?: string;
  airportName?: string;
  cityCode?: string;                       // the day's city: its centre stands in for a hotel with no coordinates
  fromCityCode?: string;                   // inter-city only
  hotelAtlasCode?: string;                 // Hotelbeds hotel code (without HB-)
  hotel?: { name: string; address?: string; latitude?: number; longitude?: number };
  pickupDate: string;                      // YYYY-MM-DD
  pickupTime?: string;                     // HH:mm, from the attached flight when known
  adults: number;
  children?: number;
}

const respond = (all: Transfer[], live: boolean, warnings: Array<string | undefined>) => NextResponse.json({
  ok: true,
  transfer: pickDefault(all),
  alternatives: all,
  source: live ? 'live' : 'mock',
  warning: warnings.filter(Boolean).join(' ') || (!hotelbedsIsLive('transfers') && !leamigoIsLive() ? 'No transfer supplier keys are set.' : undefined),
});

export async function POST(req: Request) {
  let input: Body;
  try { input = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 }); }
  const interCity = input?.kind === 'inter-city';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input?.pickupDate ?? '') || !['arrival', 'departure', 'inter-city'].includes(input?.kind)
    || (interCity ? !input.fromCityCode || !input.cityCode : !input.airportCode)) {
    return NextResponse.json({ ok: false, error: 'Missing route, date or transfer kind.' }, { status: 400 });
  }
  const pax = (input.adults || 1) + (input.children ?? 0);

  if (interCity) {
    const [from, to] = await Promise.all([cityPoint(input.fromCityCode), cityPoint(input.cityCode)]);
    if (!from || !to) return respond([], false, []);
    const res = await quoteLeamigoLeg({
      kind: 'inter-city', from, to, fromName: `${cityInfo(input.fromCityCode!).name} (City)`, toName: `${cityInfo(input.cityCode!).name} (City)`,
      pickupDate: input.pickupDate, pickupTime: input.pickupTime, passengers: pax,
    });
    return respond([...res.transfers].sort((a, b) => a.pricePaise - b.pricePaise), res.live, [res.warning]);
  }

  const hotelName = input.hotel?.name || `${input.cityCode ? cityInfo(input.cityCode).name : 'City'} centre`;
  const arrival = input.kind === 'arrival';
  const airportName = input.airportName ?? input.airportCode!;
  const fromName = arrival ? airportName : hotelName;
  const toName = arrival ? hotelName : airportName;

  const hbTask = (async (): Promise<{ transfers: Transfer[]; live: boolean; warning?: string }> => {
    if (!input.hotelAtlasCode) return { transfers: [], live: false };
    const res = await searchTransfers({
      fromType: arrival ? 'IATA' : 'ATLAS', fromCode: arrival ? input.airportCode! : input.hotelAtlasCode,
      toType: arrival ? 'ATLAS' : 'IATA', toCode: arrival ? input.hotelAtlasCode : input.airportCode!,
      pickupDate: input.pickupDate, adults: input.adults || 1, children: input.children ?? 0, infants: 0,
    });
    return { transfers: res.transfers.map((t) => hbToApp(t, input.kind, fromName, toName)), live: res.source === 'live', warning: res.source === 'live' ? res.warning : undefined };
  })();

  const lmTask = (async () => {
    const airport = airportPlace(input.airportCode!);
    const hotel = (input.hotel ? hotelPoint({ ...input.hotel, name: hotelName }) : null) ?? await cityPoint(input.cityCode);
    if (!airport || !hotel) return { transfers: [] as Transfer[], live: false, warning: leamigoIsLive() && !hotel ? 'Leamigo skipped: this hotel has no coordinates from its supplier.' : undefined };
    return quoteLeamigoLeg({
      kind: input.kind, from: arrival ? airport : hotel, to: arrival ? hotel : airport,
      fromName, toName, pickupDate: input.pickupDate, pickupTime: input.pickupTime, passengers: pax,
    });
  })();

  const [hb, lm] = await Promise.allSettled([hbTask, lmTask]);
  const parts = [hb, lm].map((r) => (r.status === 'fulfilled' ? r.value : { transfers: [] as Transfer[], live: false, warning: String((r as PromiseRejectedResult).reason?.message ?? r.reason) }));
  const all = parts.flatMap((p) => p.transfers).sort((a, b) => a.pricePaise - b.pricePaise);
  return respond(all, parts.some((p) => p.live), parts.map((p) => p.warning));
}

function hbToApp(t: HotelbedsTransfer, kind: Transfer['kind'], fromName: string, toName: string): Transfer {
  const v: TransferVehicle =
    t.vehicleKind === 'PRIVATE_PREMIUM' || t.vehicleKind === 'LUXURY' ? 'PRIVATE_PREMIUM' :
    t.vehicleKind === 'PRIVATE' || t.vehicleKind === 'MINIBUS' ? 'PRIVATE' : 'SHARED';
  return {
    id: t.id, kind, fromName, toName, vehicle: v,
    bagsAllowed: t.maxPax >= 4 ? 4 : t.maxPax,
    pricePaise: t.pricePaise,
    description: `Hotelbeds · ${t.vehicleName}`,
  };
}
