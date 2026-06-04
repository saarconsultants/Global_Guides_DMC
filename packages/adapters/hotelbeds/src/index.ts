export { searchHotels } from './hotels';
export { searchActivities } from './activities';
export { searchTransfers } from './transfers';
export { fetchHotelImages, getHotelDetail } from './content';
export type { HotelDetail } from './content';
export { isLive, probeHotelbeds } from './client';
export type { HotelbedsProbeResult } from './client';
export { toHotelbedsDestination, IATA_TO_HOTELBEDS_DESTINATION } from './destinations';

export type {
  HotelbedsHotel,
  HotelbedsRoomOption,
  AvailabilitySearchInput,
  AvailabilitySearchResult,
  StarRating,
} from './types';
export type { HotelbedsActivity, ActivitiesSearchInput, ActivitiesSearchResult } from './activities';
export type { HotelbedsTransfer, TransferSearchInput, TransferSearchResult, TransferVehicleKind } from './transfers';
export type { HotelContent } from './content';
