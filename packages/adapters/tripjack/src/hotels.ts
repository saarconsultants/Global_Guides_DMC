import { tjPost, isLive } from './client';
import type { HotelSearchInput, HotelSearchResult } from './types';
import hotelFixture from '../fixtures/hotel-search.json';

// Path INFERRED — verify with Tripjack support before going live.
const SEARCH_PATH = '/hms/v1/hotel-search-all';

export async function searchHotels(input: HotelSearchInput): Promise<HotelSearchResult> {
  if (!isLive()) {
    const fx = JSON.parse(JSON.stringify(hotelFixture)) as HotelSearchResult;
    fx.source = 'mock';
    fx.searchedAt = new Date().toISOString();
    return fx;
  }
  const body = {
    searchQuery: {
      checkinDate: input.checkin,
      checkoutDate: input.checkout,
      roomInfo: input.rooms.map((r) => ({ numberOfAdults: r.adults, childAge: r.childAges ?? [] })),
      searchCriteria: {
        city: input.cityCode ? { code: input.cityCode } : undefined,
        nationality: input.nationality ?? 'IN',
        currency: 'INR',
      },
    },
  };
  const raw = await tjPost<any>(SEARCH_PATH, body);
  // Response shape TBD — leave normaliser as a stub until real samples arrive.
  return { searchedAt: new Date().toISOString(), options: raw?.options ?? [], source: 'live' };
}
