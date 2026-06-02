// Hotelbeds adapter — normalized types we expose to the app.
// These mirror the shapes used by the rest of the platform (apps/web/lib/itinerary/types.ts)
// so callers don't care which inventory provider returned the data.

// Match the app's StarRating (3 | 4 | 5). 1–2★ inventory is clamped to 3 in hotels.ts.
export type StarRating = 3 | 4 | 5;

export interface HotelbedsHotel {
  id: string;                  // Hotelbeds code as string, e.g. "12345"
  name: string;
  stars: StarRating;
  address: string;
  cityCode: string;            // Our IATA-style city code, e.g. "PAR"
  thumb?: string;
  rating?: { score: number; label: string; reviewCount: number };
  refundable: boolean;
  mealPlan: string;
  pricePerNightPaise: number;
  room: { name: string; bedConfig: string };
  // Hotelbeds-specific fields we keep for booking confirmation
  rateKey?: string;            // opaque, required at /checkrates and /bookings
  currency?: string;           // EUR / USD — original Hotelbeds currency before INR conversion
}

export interface AvailabilitySearchInput {
  cityCode: string;            // IATA-style city code; we translate to Hotelbeds destinationCode
  checkIn: string;             // YYYY-MM-DD
  checkOut: string;            // YYYY-MM-DD
  rooms: Array<{ adults: number; children?: number }>;
  // Optional filters
  minStars?: StarRating;
  maxStars?: StarRating;
}

export interface AvailabilitySearchResult {
  hotels: HotelbedsHotel[];
  source: 'live' | 'mock' | 'unsupported-city';
  // When source is 'unsupported-city' we couldn't translate cityCode → Hotelbeds destinationCode.
  warning?: string;
}
