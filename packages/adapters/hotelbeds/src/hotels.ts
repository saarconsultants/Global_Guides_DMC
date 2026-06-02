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
import type {
  AvailabilitySearchInput,
  AvailabilitySearchResult,
  HotelbedsHotel,
  StarRating,
} from './types';

// Currency conversion: Hotelbeds returns prices in the supplier currency
// (usually EUR or USD). For now we use a static fallback rate; production
// should query a live FX rate. Stored in env for easy override.
function eurToInr(): number {
  return parseFloat(process.env.HOTELBEDS_FX_EUR_INR ?? '92');
}
function usdToInr(): number {
  return parseFloat(process.env.HOTELBEDS_FX_USD_INR ?? '85');
}

function toInrPaise(amount: number, currency: string): number {
  const rate =
    currency === 'EUR' ? eurToInr() :
    currency === 'USD' ? usdToInr() :
    currency === 'INR' ? 1 :
    eurToInr(); // unknown currency → assume EUR. Safer to overestimate than undercharge.
  return Math.round(amount * rate * 100);
}

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

    const res = await hbCall<HbAvailResponse>('/hotel-api/1.0/hotels', body);
    const hotels = normalizeHotels(res, input.cityCode);

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

function normalizeHotels(res: HbAvailResponse, cityCode: string): HotelbedsHotel[] {
  const hotels = res.hotels?.hotels ?? [];
  return hotels.map((h): HotelbedsHotel => {
    // Pick the cheapest rate from the first room as the "from" price.
    const firstRoom = h.rooms?.[0];
    const cheapestRate = firstRoom?.rates?.reduce<HbRate | undefined>((best, r) => {
      const n = parseFloat(r.net ?? '0');
      const b = parseFloat(best?.net ?? '999999');
      return n > 0 && n < b ? r : best;
    }, undefined);

    const net = parseFloat(cheapestRate?.net ?? h.minRate ?? '0');
    const currency = h.currency ?? 'EUR';
    const stars = parseStars(h.categoryName);
    const refundable = cheapestRate?.rateClass === 'NOR';
    const mealPlan = cleanBoard(cheapestRate?.boardName);

    return {
      id: `HB-${h.code}`,
      name: h.name,
      stars,
      address: h.address?.content ?? `${h.zoneName ?? ''}, ${h.destinationName ?? cityCode}`.replace(/^,\s*/, ''),
      cityCode,
      refundable,
      mealPlan,
      pricePerNightPaise: toInrPaise(net, currency),
      room: { name: firstRoom?.name ?? 'Standard Room', bedConfig: '1 Double' },
      rateKey: cheapestRate?.rateKey,
      currency,
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
