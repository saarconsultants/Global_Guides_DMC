// POST /api/search-hotels — see comment in search-activities/route.ts for why this isn't a server action.

import { NextResponse } from 'next/server';
import { searchHotels, type HotelbedsHotel } from '@gg/hotelbeds';
import type { Hotel } from '@/lib/itinerary/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Body {
  cityCode: string;
  checkIn: string;
  checkOut: string;
  rooms: Array<{ adults: number; children?: number }>;
}

export async function POST(req: Request) {
  let input: Body;
  try { input = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 }); }

  try {
    const res = await searchHotels(input);
    return NextResponse.json({
      ok: true,
      hotels: res.hotels.map(toApp),
      source: res.source,
      warning: res.warning,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) });
  }
}

function toApp(h: HotelbedsHotel): Hotel {
  return {
    id: h.id, name: h.name, stars: h.stars, address: h.address, cityCode: h.cityCode,
    thumb: h.thumb, rating: h.rating, refundable: h.refundable, mealPlan: h.mealPlan,
    pricePerNightPaise: h.pricePerNightPaise, room: h.room, allImages: h.allImages,
  };
}
