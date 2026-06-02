export { searchHotels } from './hotels';
export { searchActivities } from './activities';
export { searchTransfers } from './transfers';
export { fetchHotelImages } from './content';
export { isLive } from './client';
export { toHotelbedsDestination, IATA_TO_HOTELBEDS_DESTINATION } from './destinations';

export type {
  HotelbedsHotel,
  AvailabilitySearchInput,
  AvailabilitySearchResult,
  StarRating,
} from './types';
export type { HotelbedsActivity, ActivitiesSearchInput, ActivitiesSearchResult } from './activities';
export type { HotelbedsTransfer, TransferSearchInput, TransferSearchResult, TransferVehicleKind } from './transfers';
export type { HotelContent } from './content';
