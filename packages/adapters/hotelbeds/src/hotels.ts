// Hotelbeds Hotels API — availability search.
//
// Endpoint: POST /hotel-api/1.0/hotels
// Docs:     https://developer.hotelbeds.com/documentation/hotels/
//
// We translate our app's request shape → Hotelbeds shape, fire the call,
// then normalize the response back into our Hotel type so the rest of the
// app doesn't care which inventory provider returned the data.

import { hbCall, isLive } from './client';
import { toHotelbedsDestination } from './destinations';
import { fetchHotelImages } from './content';
import { getRates, toInrPaiseWith } from './fx';
import type {
  AvailabilitySearchInput,
  AvailabilitySearchResult,
  HotelbedsHotel,
  HotelbedsRoomOption,
  StarRating,
} from './types';

// In-memory cache so React strict-mode double-renders / quick refreshes
// don't hammer Hotelbeds. 90s matches our Tripjack cache.
const CACHE_MS = 90_000;
type CachedEntry = { at: number; promise: Promise<AvailabilitySearchResult> };
const cache = new Map<string, CachedEntry>();

function cacheKey(input: AvailabilitySearchInput): string {
  const rooms = input.rooms.map((r) => `${r.adults}-${r.children ?? 0}`).join(',');
  return `${input.cityCode}|${input.checkIn}|${input.checkOut}|${rooms}|${input.minStars ?? ''}|${input.maxStars ?? ''}`;
}

export async function searchHotels(input: AvailabilitySearchInput): Promise<AvailabilitySearchResult> {
  // Cache lookup
  const key = cacheKey(input);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.promise;

  const promise = (async (): Promise<AvailabilitySearchResult> => {
    if (!isLive()) {
      return { hotels: [], source: 'mock', warning: 'HOTELBEDS_API_KEY not set' };
    }

    const destinationCode = toHotelbedsDestination(input.cityCode);
    if (!destinationCode) {
      return {
        hotels: [],
        source: 'unsupported-city',
        warning: `No Hotelbeds destinationCode mapped for ${input.cityCode}. Add it in packages/adapters/hotelbeds/src/destinations.ts to enable live search for this city.`,
      };
    }

    const body = {
      stay: { checkIn: input.checkIn, checkOut: input.checkOut },
      occupancies: input.rooms.map((r) => ({
        rooms: 1,
        adults: r.adults,
        children: r.children ?? 0,
      })),
      destination: { code: destinationCode },
      filter: input.minStars || input.maxStars ? {
        minCategory: input.minStars,
        maxCategory: input.maxStars,
      } : undefined,
    };

    const [res, rates] = await Promise.all([
      hbCall<HbAvailResponse>('/hotel-api/1.0/hotels', body, { retries: 1 }),
      getRates(),
    ]);
    const nights = Math.max(1, Math.round((new Date(input.checkOut).getTime() - new Date(input.checkIn).getTime()) / 86_400_000));
    const hotels = normalizeHotels(res, input.cityCode, rates, nights);

    // Fan out the Content API call for photos. Cached aggressively (24h per
    // hotel code), so repeat searches of the same city are free.
    // ── Defensive: photo enrichment must NEVER break the search response.
    //    Wrap in its own try/catch with a 5s deadline so a slow or failing
    //    Content API doesn't crash the /hotels page or take down the modal.
    try {
      const topCodes = hotels.slice(0, 60).map((h) => parseInt(h.id.replace('HB-', ''), 10)).filter(Number.isFinite);
      if (topCodes.length > 0) {
        const images = await Promise.race([
          fetchHotelImages(topCodes),
          new Promise<Map<number, never>>((_, reject) => setTimeout(() => reject(new Error('content-timeout')), 5000)),
        ]);
        for (const h of hotels) {
          const code = parseInt(h.id.replace('HB-', ''), 10);
          const content = images.get(code) as { thumb?: string; allImages?: string[] } | undefined;
          if (content?.thumb) h.thumb = content.thumb;
          if (content?.allImages) h.allImages = content.allImages;
        }
      }
    } catch (e) {
      // Photo enrichment failed — log and continue with text-only results.
      console.warn('[hotelbeds] photo enrichment skipped:', (e as Error)?.message ?? e);
    }

    return { hotels, source: 'live' };
  })();

  cache.set(key, { at: Date.now(), promise });
  // Don't poison the cache with rejected promises — if this call fails,
  // the next caller should retry instead of getting the cached failure.
  promise.catch(() => cache.delete(key));
  return promise;
}

// ── Hotelbeds response shape (minimal — we only use what we need) ──────────
interface HbAvailResponse {
  hotels?: {
    hotels?: HbHotel[];
  };
}

interface HbHotel {
  code: number;
  name: string;
  categoryName?: string;       // "4 STARS"
  destinationName?: string;
  zoneName?: string;
  address?: { content?: string };
  rooms?: HbRoom[];
  currency?: string;
  minRate?: string;
  maxRate?: string;
}

interface HbRoom {
  code?: string;
  name?: string;
  rates?: HbRate[];
}

interface HbRate {
  rateKey?: string;
  rateClass?: string;          // NOR (refundable) | NRF (non-refundable)
  net?: string;
  boardName?: string;          // "ROOM ONLY" | "BED & BREAKFAST"
  paymentType?: string;
  cancellationPolicies?: Array<{ amount: string; from?: string }>;
  rooms?: number;
  adults?: number;
  children?: number;
}

function normalizeHotels(res: HbAvailResponse, cityCode: string, rates: { eurInr: number; usdInr: number }, nights: number): HotelbedsHotel[] {
  const hotels = res.hotels?.hotels ?? [];
  return hotels.map((h): HotelbedsHotel => {
    const currency = h.currency ?? 'EUR';

    // Build the full room+rate option list across all rooms.
    const roomOptions: HotelbedsRoomOption[] = [];
    for (const room of h.rooms ?? []) {
      for (const r of room.rates ?? []) {
        const total = parseFloat(r.net ?? '0');
        if (!(total > 0)) continue;
        roomOptions.push({
          roomName: room.name ?? 'Room',
          board: cleanBoard(r.boardName),
          refundable: r.rateClass === 'NOR',
          totalPaise: toInrPaiseWith(rates, total, currency),
          // Hotelbeds net is the total for the stay; per-night = /nights.
          pricePerNightPaise: toInrPaiseWith(rates, total / nights, currency),
          rateKey: r.rateKey,
        });
      }
    }
    roomOptions.sort((a, b) => a.totalPaise - b.totalPaise);

    // "From" = cheapest option (or hotel minRate as a fallback).
    const cheapest = roomOptions[0];
    const fromPerNight = cheapest
      ? cheapest.pricePerNightPaise
      : toInrPaiseWith(rates, parseFloat(h.minRate ?? '0') / nights, currency);
    const firstRoom = h.rooms?.[0];

    return {
      id: `HB-${h.code}`,
      name: h.name,
      stars: parseStars(h.categoryName),
      address: h.address?.content ?? `${h.zoneName ?? ''}, ${h.destinationName ?? cityCode}`.replace(/^,\s*/, ''),
      cityCode,
      refundable: cheapest?.refundable ?? false,
      mealPlan: cheapest?.board ?? 'Room Only',
      pricePerNightPaise: fromPerNight,
      room: { name: cheapest?.roomName ?? firstRoom?.name ?? 'Standard Room', bedConfig: '1 Double' },
      rateKey: cheapest?.rateKey,
      currency,
      roomOptions: roomOptions.slice(0, 20),
    };
  });
}

function parseStars(category?: string): StarRating {
  if (!category) return 3;
  const match = category.match(/(\d)/);
  const n = match ? parseInt(match[1]!, 10) : 3;
  // App only supports 3/4/5★ hotels — clamp 1/2★ up to 3, anything else also 3.
  if (n >= 3 && n <= 5) return n as StarRating;
  return 3;
}

function cleanBoard(board?: string): string {
  if (!board) return 'Room Only';
  const lower = board.toLowerCase();
  if (lower.includes('room only')) return 'Room Only';
  if (lower.includes('bed') && lower.includes('breakfast')) return 'Breakfast Included';
  if (lower.includes('half board')) return 'Half Board';
  if (lower.includes('full board')) return 'Full Board';
  if (lower.includes('all incl')) return 'All Inclusive';
  // Title-case fallback: "BED & BREAKFAST" → "Bed & Breakfast"
  return board
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
