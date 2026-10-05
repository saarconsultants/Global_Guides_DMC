export { searchHotels, buildOccupancies, childAgesFor } from './hotels';
export { checkRates, getRateComments, createBooking, simulateCancellation, cancelBooking, toInrPaise, HotelbedsBookingError } from './booking';
export type { CheckedRate, BookingPax, BookingRequest, HotelbedsBooking } from './booking';
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
  HotelbedsCancellationPolicy,
  AvailabilitySearchInput,
  AvailabilitySearchResult,
  StarRating,
} from './types';
export type { HotelbedsActivity, ActivitiesSearchInput, ActivitiesSearchResult } from './activities';
export type { HotelbedsTransfer, TransferSearchInput, TransferSearchResult, TransferVehicleKind } from './transfers';
export type { HotelContent } from './content';
