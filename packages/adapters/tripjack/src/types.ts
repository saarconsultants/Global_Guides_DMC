// Public, normalized types — the rest of the app talks in these.
// Internal Tripjack abbreviation shapes stay private to this package.

export type Cabin = 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';

export interface Leg {
  fromIATA: string;        // 'DEL'
  toIATA: string;          // 'DXB'
  date: string;            // 'YYYY-MM-DD'
}

export interface FlightSearchInput {
  legs: Leg[];
  adults: number;
  children: number;
  infants: number;
  cabin: Cabin;
  directOnly?: boolean;
  preferredAirlines?: string[];
}

export interface Airport {
  code: string;
  name?: string;
  cityCode?: string;
  city?: string;
  country?: string;
  countryCode?: string;
  terminal?: string;
}

export interface Segment {
  id: string;
  airlineCode: string;
  airlineName: string;
  isLcc: boolean;
  flightNumber: string;
  equipment?: string;
  departureAirport: Airport;
  arrivalAirport: Airport;
  departureAt: string;     // ISO
  arrivalAt: string;       // ISO
  durationMin: number;
}

export interface FareBreakup {
  baseFarePaise: number;
  taxesPaise: number;
  totalPaise: number;
  currency: 'INR';
}

export interface FlightOffer {
  priceId: string;          // pass to repricing / temp-booking
  segments: Segment[];
  refundable: boolean;
  cabin: Cabin;
  fare: FareBreakup;
  baggage?: string;
  fareType: string;          // 'REGULAR' etc.
}

export interface FlightSearchResult {
  searchedAt: string;
  offers: FlightOffer[];
  source: 'live' | 'mock';
}

// Hotels (TBC with Tripjack docs)
export interface Room { adults: number; childAges?: number[] }
export interface HotelSearchInput {
  cityCode?: string;          // Tripjack city code
  hotelName?: string;
  checkin: string;            // YYYY-MM-DD
  checkout: string;
  rooms: Room[];
  nationality?: string;       // ISO-2, default 'IN'
}
export interface HotelOption {
  hotelId: string;
  name: string;
  stars: 1|2|3|4|5;
  address?: string;
  city?: string;
  rating?: { score: number; label: string; reviewCount: number };
  thumbnail?: string;
  pricePerNightPaise: number;
  totalPaise: number;
  refundable: boolean;
  mealPlan?: string;
}
export interface HotelSearchResult {
  searchedAt: string;
  options: HotelOption[];
  source: 'live' | 'mock';
}
