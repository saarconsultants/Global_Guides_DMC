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
import { quoteLeamigoLeg, hotelPoint, pickDefault, leamigoIsLive } from '@/lib/transfers/leamigo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Body {
  kind: 'arrival' | 'departure';
  airportCode: string;
  airportName?: string;
  hotelAtlasCode?: string;                 // Hotelbeds hotel code (without HB-)
  hotel: { name: string; address?: string; latitude?: number; longitude?: number };
  pickupDate: string;                      // YYYY-MM-DD
  pickupTime?: string;                     // HH:mm, from the attached flight when known
  adults: number;
  children?: number;
}

export async function POST(req: Request) {
  let input: Body;
  try { input = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 }); }
  if (!input?.airportCode || !input?.hotel?.name || !/^\d{4}-\d{2}-\d{2}$/.test(input.pickupDate ?? '') || (input.kind !== 'arrival' && input.kind !== 'departure')) {
    return NextResponse.json({ ok: false, error: 'Missing airport, hotel, date or transfer kind.' }, { status: 400 });
  }

  const arrival = input.kind === 'arrival';
  const airportName = input.airportName ?? input.airportCode;
  const fromName = arrival ? airportName : input.hotel.name;
  const toName = arrival ? input.hotel.name : airportName;
  const pax = (input.adults || 1) + (input.children ?? 0);

  const hbTask = (async (): Promise<{ transfers: Transfer[]; live: boolean; warning?: string }> => {
    if (!input.hotelAtlasCode) return { transfers: [], live: false };
    const res = await searchTransfers({
      fromType: arrival ? 'IATA' : 'ATLAS', fromCode: arrival ? input.airportCode : input.hotelAtlasCode,
      toType: arrival ? 'ATLAS' : 'IATA', toCode: arrival ? input.hotelAtlasCode : input.airportCode,
      pickupDate: input.pickupDate, adults: input.adults || 1, children: input.children ?? 0, infants: 0,
    });
    return { transfers: res.transfers.map((t) => hbToApp(t, input.kind, fromName, toName)), live: res.source === 'live', warning: res.source === 'live' ? res.warning : undefined };
  })();

  const lmTask = (async () => {
    const airport = airportPlace(input.airportCode);
    const hotel = hotelPoint(input.hotel);
    if (!airport || !hotel) return { transfers: [] as Transfer[], live: false, warning: leamigoIsLive() && !hotel ? 'Leamigo skipped: this hotel has no coordinates from its supplier.' : undefined };
    return quoteLeamigoLeg({
      kind: input.kind, from: arrival ? airport : hotel, to: arrival ? hotel : airport,
      fromName, toName, pickupDate: input.pickupDate, pickupTime: input.pickupTime, passengers: pax,
    });
  })();

  const [hb, lm] = await Promise.allSettled([hbTask, lmTask]);
  const parts = [hb, lm].map((r) => (r.status === 'fulfilled' ? r.value : { transfers: [] as Transfer[], live: false, warning: String((r as PromiseRejectedResult).reason?.message ?? r.reason) }));
  const all = parts.flatMap((p) => p.transfers).sort((a, b) => a.pricePaise - b.pricePaise);
  const warnings = parts.map((p) => p.warning).filter(Boolean) as string[];

  return NextResponse.json({
    ok: true,
    transfer: pickDefault(all),
    alternatives: all,
    source: parts.some((p) => p.live) ? 'live' : 'mock',
    warning: warnings.join(' ') || (!hotelbedsIsLive('transfers') && !leamigoIsLive() ? 'No transfer supplier keys are set.' : undefined),
  });
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
