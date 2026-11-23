// Hotel search: city → place_id (autocomplete), then search + price polling.
// Prices are for the whole stay and all rooms, in INR (we ask for it on every call).

import { usCall } from './client';

export interface UnifyRoomRequest { adults: number; childAges: number[] }

export interface UnifyHotel {
  hotelId: string;
  name: string;
  stars: number;
  address: string;
  city: string;
  countryCode: string;
  latitude?: number;
  longitude?: number;
  image?: string;
  facilities: string[];
  /** Whole stay, all rooms, INR paise. */
  totalPaise: number;
  refundable: boolean | null;
  freeCancellationUntil: string | null;
  supplier: string | null;
}

export interface UnifySearchResult {
  hotels: UnifyHotel[];
  /** Hotels the search listed that ended with no price (sold out, unmapped, supplier error). */
  unpriced: number;
  placeName?: string;
  warning?: string;
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const placeCache = new Map<string, { at: number; id: number | null; name?: string }>();
const PLACE_TTL = 48 * 3600_000;   // the docs' advice for autocomplete
const POLL_MS = 2_000;

/** The place_id for a city: exact name in the right country first, then the biggest place in that country. */
export async function resolvePlace(cityName: string, countryCode?: string): Promise<{ id: number; name: string } | null> {
  const key = `${norm(cityName)}|${countryCode ?? ''}`;
  const hit = placeCache.get(key);
  if (hit && Date.now() - hit.at < PLACE_TTL) return hit.id ? { id: hit.id, name: hit.name ?? cityName } : null;
  const r = await usCall<any>('/destinations/autocomplete', { query: { q: cityName, types: 'place', limit: '10' } });
  const places: any[] = (r?.data?.results ?? []).filter((p: any) => p.type === 'place' && p.place_id);
  const inCountry = countryCode ? places.filter((p) => String(p.country_code).toUpperCase() === countryCode.toUpperCase()) : places;
  const pool = inCountry.length ? inCountry : places;
  const pick = pool.find((p) => norm(p.display_name) === norm(cityName)) ?? [...pool].sort((a, b) => (b.hotel_count ?? 0) - (a.hotel_count ?? 0))[0];
  placeCache.set(key, { at: Date.now(), id: pick ? Number(pick.place_id) : null, name: pick?.display_name });
  return pick ? { id: Number(pick.place_id), name: String(pick.display_name) } : null;
}

const priced = (p: any) => (p?.status === 'live' || p?.status === 'recent') && Number.isFinite(p?.amount);

function toHotel(h: any): UnifyHotel | null {
  const p = h.price;
  if (!priced(p) || p.currency !== 'INR') return null;   // never show a guessed or unconverted price
  return {
    hotelId: String(h.hotel_id), name: String(h.hotel_name ?? ''), stars: Number(h.stars) || 0,
    address: String(h.address ?? ''), city: String(h.city ?? ''), countryCode: String(h.country ?? ''),
    latitude: Number.isFinite(h.latitude) ? h.latitude : undefined, longitude: Number.isFinite(h.longitude) ? h.longitude : undefined,
    image: h.main_image_url ?? undefined, facilities: Array.isArray(h.facilities) ? h.facilities : [],
    totalPaise: Number(p.amount), refundable: p.is_refundable ?? null, freeCancellationUntil: p.free_cancellation_until ?? null,
    supplier: p.supplier_code ?? null,
  };
}

/** One page of search, then poll its prices until complete or `waitMs` runs out. */
async function searchPage(body: any, waitMs: number): Promise<{ cards: Map<string, any>; nextCursor: string | null }> {
  const r = await usCall<any>('/hotels/search', { method: 'POST', body });
  const cards = new Map<string, any>((r?.data?.hotels ?? []).map((h: any) => [String(h.hotel_id), h]));
  const searchId: string | undefined = r?.data?.search_id;
  let status: string = r?.data?.refresh_status ?? 'COMPLETE';
  const until = Date.now() + waitMs;
  while (searchId && (status === 'PENDING' || status === 'REFRESHING') && Date.now() < until) {
    await new Promise((res) => setTimeout(res, POLL_MS));
    try {
      const u = await usCall<any>(`/hotels/search/${encodeURIComponent(searchId)}/prices`);
      for (const h of u?.data?.hotels ?? []) {
        const card = cards.get(String(h.hotel_id));
        if (card) { card.price = h.price; card.supplier_prices = h.supplier_prices; }   // replace, never merge
      }
      status = u?.data?.status ?? 'COMPLETE';
    } catch { break; }   // an expired search keeps what it already priced
  }
  return { cards, nextCursor: r?.data?.next_cursor ?? null };
}

export async function searchHotels(input: {
  cityName: string; countryCode?: string; checkIn: string; checkOut: string;
  rooms: UnifyRoomRequest[]; nationality?: string; minStars?: number;
  /** Pages of 100 hotels. Each page is one request against the per-minute limit. */
  maxPages?: number; waitMs?: number;
}): Promise<UnifySearchResult> {
  const place = await resolvePlace(input.cityName, input.countryCode);
  if (!place) return { hotels: [], unpriced: 0, warning: `Unifystays has no destination called ${input.cityName}.` };
  const body: any = {
    destination: { type: 'place', id: place.id },
    check_in: input.checkIn, check_out: input.checkOut,
    nationality: (input.nationality ?? 'IN').toUpperCase(),
    rooms: input.rooms.map((r) => ({ adults: Math.min(5, Math.max(1, r.adults)), child_ages: r.childAges })),
    limit: 100, pricing_mode: 'instant', sort: 'recommended',
    ...(input.minStars ? { star_ratings: [1, 2, 3, 4, 5].filter((s) => s >= input.minStars!) } : {}),
  };
  const waitMs = input.waitMs ?? 12_000;
  const all = new Map<string, any>();
  let cursor: string | null = null;
  for (let page = 0; page < (input.maxPages ?? 2); page++) {
    const r: { cards: Map<string, any>; nextCursor: string | null } = await searchPage(cursor ? { ...body, cursor } : body, waitMs);
    for (const [k, v] of r.cards) all.set(k, v);
    cursor = r.nextCursor;
    if (!cursor) break;
  }
  const hotels = [...all.values()].map(toHotel).filter((h): h is UnifyHotel => !!h);
  let warning: string | undefined;
  if (!all.size) warning = `Unifystays found no hotels in ${place.name} for these dates.`;
  else if (!hotels.length) {
    // Say why every card was dropped (no live price, or not in INR) so an empty result is explainable.
    const why = new Map<string, number>();
    for (const h of all.values()) { const k = `${h.price?.status ?? 'no price'}${h.price?.currency && h.price.currency !== 'INR' ? ' ' + h.price.currency : ''}`; why.set(k, (why.get(k) ?? 0) + 1); }
    warning = `Unifystays found ${all.size} hotels in ${place.name} but none had a bookable INR price (${[...why].map(([k, n]) => `${n} ${k}`).join(', ')}).`;
  }
  if (warning) console.error('[unifystays]', warning);
  return { hotels, unpriced: all.size - hotels.length, placeName: place.name, warning };
}
