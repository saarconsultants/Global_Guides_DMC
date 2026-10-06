// POST /api/search-rentals — Leamigo hourly car-with-driver from the hotel.
// Body: { hotel: { name, address?, latitude, longitude }, pickupDate, pickupTime, hours, passengers }

import { NextResponse } from 'next/server';
import { searchRentals, isLive } from '@gg/leamigo';
import { hotelPoint } from '@/lib/transfers/leamigo';
import type { Transfer } from '@/lib/itinerary/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const pickup = hotelPoint(b?.hotel);
  const hours = Math.round(Number(b?.hours));
  if (!pickup || !/^\d{4}-\d{2}-\d{2}$/.test(b?.pickupDate ?? '') || !/^\d{2}:\d{2}$/.test(b?.pickupTime ?? '') || !(hours >= 1 && hours <= 24)) {
    return NextResponse.json({ ok: false, error: 'Missing hotel location, date, time or hours.' }, { status: 400 });
  }
  if (!isLive()) return NextResponse.json({ ok: true, rentals: [], warning: 'Car-with-driver rentals need the Leamigo connection.' });
  const passengers = Math.max(1, Number(b.passengers) || 1);
  try {
    const res = await searchRentals({ pickup, pickupDate: b.pickupDate, pickupTime: b.pickupTime, hours, passengers });
    // One row per provider + vehicle (Leamigo repeats identical offers).
    const seen = new Set<string>();
    const rentals: Transfer[] = [];
    for (const r of res.rentals) {
      const k = `${r.providerId}|${r.vehicleName}`;
      if (seen.has(k) || (r.maxPax && r.maxPax < passengers)) continue;
      seen.add(k);
      rentals.push({
        id: r.id,
        kind: 'rental',
        fromName: b.hotel.name,
        toName: `${r.hours} hours at disposal`,
        vehicle: 'PRIVATE',
        bagsAllowed: r.maxLuggage,
        pricePaise: r.pricePaise,
        description: [`Leamigo · ${r.vehicleName}`, `${r.hours}h`, r.kmsIncluded ? `${r.kmsIncluded} km included` : '', r.cityRadiusOnly ? 'within city' : '', r.tollsAndParkingIncluded ? 'tolls & parking included' : 'tolls & parking extra', r.freeCancellation ? 'free cancellation' : ''].filter(Boolean).join(' · '),
        leamigoRental: { pickup, pickupDate: b.pickupDate, pickupTime: b.pickupTime, hours, passengers, providerId: r.providerId, vehicleName: r.vehicleName },
      });
    }
    return NextResponse.json({ ok: true, rentals, warning: res.warning });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Rental search failed.' });
  }
}
