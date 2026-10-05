// Hotelbeds adapter — normalized types we expose to the app.
// These mirror the shapes used by the rest of the platform (apps/web/lib/itinerary/types.ts)
// so callers don't care which inventory provider returned the data.

// Match the app's StarRating (3 | 4 | 5). 1–2★ inventory is clamped to 3 in hotels.ts.
export type StarRating = 3 | 4 | 5;

// A single bookable room+rate option for a hotel (board, refundability, price).
export interface HotelbedsRoomOption {
  roomName: string;
  board: string;               // normalized: Room Only / Breakfast Included / …
  refundable: boolean;
  pricePerNightPaise: number;  // converted to INR
  totalPaise: number;          // converted to INR for the whole stay
  rateKey?: string;            // opaque, required at /checkrates and /bookings
  // ── Certification-relevant rate details ──
  rateType?: 'BOOKABLE' | 'RECHECK';  // RECHECK → must CheckRate before booking
  rateCommentsId?: string;     // resolve via Content API; must be shown before confirmation
  cancellationPolicies?: HotelbedsCancellationPolicy[];
  promotions?: Array<{ code?: string; name?: string; remark?: string }>;
  roomCode?: string;
  boardCode?: string;
  netAmount?: number;          // supplier currency, whole stay, for this rate
  currency?: string;
  /** Occupancy this rate was priced for (multi-room: one rate per occupancy group). */
  rooms?: number;
  adults?: number;
  children?: number;
  childrenAges?: string;
}

/** A cancellation fee that applies from `from` (destination-local time, ISO with offset). */
export interface HotelbedsCancellationPolicy {
  from: string;
  amount: number;              // supplier currency
  amountPaise: number;         // INR
  currency: string;
}

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
  allImages?: string[];        // Full gallery URLs from Content API (lightbox)
  roomOptions?: HotelbedsRoomOption[];  // all room+rate combos for this hotel
  latitude?: number;           // supplier coordinates (point-to-point transfer search)
  longitude?: number;
}

export interface AvailabilitySearchInput {
  cityCode: string;            // IATA-style city code; we translate to Hotelbeds destinationCode
  checkIn: string;             // YYYY-MM-DD
  checkOut: string;            // YYYY-MM-DD
  rooms: Array<{ adults: number; children?: number; childAges?: number[] }>;
  /** Search specific hotels instead of a whole destination (booking-time re-quote). Max 2000. */
  hotelCodes?: number[];
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
