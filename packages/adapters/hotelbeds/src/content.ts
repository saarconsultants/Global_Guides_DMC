// Hotelbeds Content API — fetches photos + descriptions for hotels.
//
// Endpoint: GET /hotel-content-api/1.0/hotels?codes=123,456&fields=name,images,description
//
// IMPORTANT: This API has its own quota separate from booking. Content
// changes rarely — we cache aggressively (24h per hotel code) so a
// repeat search of the same city is free.

import { hbCall, isLive } from './client';

const PHOTO_CDN = 'https://photos.hotelbeds.com/giata/bigger';

interface HbContentResponse {
  hotels?: HbContentHotel[];
}

interface HbContentHotel {
  code: number;
  name?: { content?: string };
  images?: Array<{
    path?: string;
    imageTypeCode?: string;
    order?: number;
    visualOrder?: number;
  }>;
}

export interface HotelContent {
  thumb?: string;            // Best image, full CDN URL
  allImages?: string[];      // All available images, ranked
}

// Cache: hotel code → content, 24h TTL.
const CACHE_MS = 24 * 60 * 60 * 1000;
type CachedEntry = { at: number; data: HotelContent };
const cache = new Map<number, CachedEntry>();

function cacheGet(code: number): HotelContent | undefined {
  const e = cache.get(code);
  if (!e) return undefined;
  if (Date.now() - e.at > CACHE_MS) {
    cache.delete(code);
    return undefined;
  }
  return e.data;
}

function cacheSet(code: number, data: HotelContent): void {
  cache.set(code, { at: Date.now(), data });
}

/**
 * Fetch images for an array of hotel codes. Returns a Map keyed by code.
 * Codes already in cache are skipped; only uncached codes hit the API.
 * Hotelbeds allows up to 200 codes per request; we batch in chunks.
 */
export async function fetchHotelImages(codes: number[]): Promise<Map<number, HotelContent>> {
  const result = new Map<number, HotelContent>();
  if (!isLive() || codes.length === 0) return result;

  // Use cache where possible
  const toFetch: number[] = [];
  for (const code of codes) {
    const cached = cacheGet(code);
    if (cached) {
      result.set(code, cached);
    } else {
      toFetch.push(code);
    }
  }
  if (toFetch.length === 0) return result;

  // Batch in chunks of 200 (Hotelbeds limit)
  const chunks: number[][] = [];
  for (let i = 0; i < toFetch.length; i += 200) chunks.push(toFetch.slice(i, i + 200));

  await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const path = `/hotel-content-api/1.0/hotels?codes=${chunk.join(',')}&fields=name,images&language=ENG&from=1&to=200&useSecondaryLanguage=false`;
        const res = await hbCall<HbContentResponse>(path, undefined, { method: 'GET', timeoutMs: 20_000 });
        const hotels = res.hotels ?? [];

        // Build a code → data map; default empty for any not returned
        const seen = new Set<number>();
        for (const h of hotels) {
          const content = normalizeContent(h);
          cacheSet(h.code, content);
          result.set(h.code, content);
          seen.add(h.code);
        }
        // Cache empty for any code we asked about but didn't get back
        for (const code of chunk) {
          if (!seen.has(code)) {
            const empty: HotelContent = {};
            cacheSet(code, empty);
            result.set(code, empty);
          }
        }
      } catch (e) {
        // Content failures shouldn't break the availability search;
        // just leave those codes unphotographed.
        console.error('[hotelbeds] content fetch failed:', e);
      }
    }),
  );

  return result;
}

function normalizeContent(h: HbContentHotel): HotelContent {
  const images = (h.images ?? [])
    .filter((i) => !!i.path)
    .sort((a, b) => (a.visualOrder ?? a.order ?? 999) - (b.visualOrder ?? b.order ?? 999))
    .map((i) => `${PHOTO_CDN}/${i.path}`);
  return {
    thumb: images[0],
    allImages: images.length > 0 ? images : undefined,
  };
}

// ── Full single-hotel detail (for the hotel detail page) ────────────────────
export interface HotelDetail {
  code: number;
  name: string;
  description?: string;
  stars?: number;
  address?: string;
  city?: string;
  countryCode?: string;
  email?: string;
  phone?: string;
  web?: string;
  latitude?: number;
  longitude?: number;
  images: string[];
  facilities: string[];   // human-readable facility group: facility names
}

interface HbDetailResponse {
  hotel?: {
    code?: number;
    name?: { content?: string };
    description?: { content?: string };
    categoryCode?: string;      // "4EST"
    address?: { content?: string };
    city?: { content?: string };
    countryCode?: string;
    email?: string;
    phones?: Array<{ phoneNumber?: string; phoneType?: string }>;
    web?: string;
    coordinates?: { latitude?: number; longitude?: number };
    images?: Array<{ path?: string; order?: number; visualOrder?: number; imageTypeCode?: string }>;
    facilities?: Array<{ description?: { content?: string }; facilityGroupCode?: number }>;
  };
}

export async function getHotelDetail(code: number): Promise<HotelDetail | null> {
  if (!isLive('hotels')) return null;
  try {
    const path = `/hotel-content-api/1.0/hotels/${code}/details?language=ENG&useSecondaryLanguage=false`;
    const res = await hbCall<HbDetailResponse>(path, undefined, { method: 'GET', timeoutMs: 8_000, product: 'hotels' });
    const h = res.hotel;
    if (!h) return null;

    const images = (h.images ?? [])
      .filter((i) => !!i.path)
      .sort((a, b) => (a.visualOrder ?? a.order ?? 999) - (b.visualOrder ?? b.order ?? 999))
      .map((i) => `${PHOTO_CDN}/${i.path}`);

    const facilities = (h.facilities ?? [])
      .map((f) => f.description?.content)
      .filter((x): x is string => !!x)
      // Dedupe + cap at 40 so the UI isn't overwhelming
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .slice(0, 40);

    const starsMatch = h.categoryCode?.match(/(\d)/);

    return {
      code: h.code ?? code,
      name: h.name?.content ?? `Hotel ${code}`,
      description: h.description?.content,
      stars: starsMatch ? parseInt(starsMatch[1]!, 10) : undefined,
      address: h.address?.content,
      city: h.city?.content,
      countryCode: h.countryCode,
      email: h.email,
      phone: h.phones?.[0]?.phoneNumber,
      web: h.web,
      latitude: h.coordinates?.latitude,
      longitude: h.coordinates?.longitude,
      images,
      facilities,
    };
  } catch (e) {
    console.error('[hotelbeds] getHotelDetail failed:', (e as Error)?.message ?? e);
    return null;
  }
}
