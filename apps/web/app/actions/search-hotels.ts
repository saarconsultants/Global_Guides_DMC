'use server';
// Server action to fetch hotels for a city/date range from Hotelbeds.
//
// Returns normalized Hotel rows the modal can render directly. Falls back
// gracefully to an empty list when Hotelbeds keys aren't set or the city
// isn't mapped — the caller should merge with mock inventory.

import { searchHotels, type HotelbedsHotel } from '@gg/hotelbeds';
import type { Hotel } from '@/lib/itinerary/types';

interface Input {
  cityCode: string;
  checkIn: string;
  checkOut: string;
  rooms: Array<{ adults: number; children?: number }>;
}

interface Output {
  ok: true;
  hotels: Hotel[];
  source: 'live' | 'mock' | 'unsupported-city';
  warning?: string;
}

interface ErrOutput {
  ok: false;
  error: string;
}

export async function searchHotelsAction(input: Input): Promise<Output | ErrOutput> {
  try {
    const res = await searchHotels(input);
    return {
      ok: true,
      hotels: res.hotels.map(hbHotelToAppHotel),
      source: res.source,
      warning: res.warning,
    };
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) };
  }
}

function hbHotelToAppHotel(h: HotelbedsHotel): Hotel {
  return {
    id: h.id,
    name: h.name,
    stars: h.stars,
    address: h.address,
    cityCode: h.cityCode,
    thumb: h.thumb,
    rating: h.rating,
    refundable: h.refundable,
    mealPlan: h.mealPlan,
    pricePerNightPaise: h.pricePerNightPaise,
    room: h.room,
  };
}
