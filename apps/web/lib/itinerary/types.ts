// Itinerary domain types. Mirrors discovery/02-itinerary-builder.md §State.

export type StarRating = 3 | 4 | 5;
export type CabinClass = 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';
export type DayType = 'arrival' | 'stay' | 'transit' | 'departure';
export type TransferVehicle = 'PRIVATE_PREMIUM' | 'PRIVATE' | 'SHARED';
export type Currency = 'INR';

export interface Room {
  adults: number;
  children: number;
  childAges?: number[];
}

export interface DestinationConfig {
  cityCode: string;
  cityName: string;
  countryCode: string;
  nights: number;
}

export interface IntakeForm {
  destinations: DestinationConfig[];
  leavingFromCode: string;
  leavingFromName: string;
  nationality: string;     // ISO-2
  departureDate: string;   // YYYY-MM-DD
  rooms: Room[];
  starRating?: StarRating; // undefined = Any
  addTransfers: boolean;
}

export interface Hotel {
  id: string;
  name: string;
  stars: StarRating;
  address: string;
  cityCode: string;
  thumb?: string;
  rating?: { score: number; label: string; reviewCount: number };
  refundable: boolean;
  mealPlan: string;          // 'Room Only' | 'Breakfast Included' | etc.
  pricePerNightPaise: number;
  room: { name: string; bedConfig: string };
}

export interface Stay {
  hotel: Hotel;
  checkIn: string;             // ISO datetime
  checkOut: string;
}

export interface Transfer {
  id: string;
  kind: 'arrival' | 'departure' | 'inter-city';
  fromName: string;            // e.g. 'Paris Orly Airport (ORY)'
  toName: string;              // e.g. 'Hotel (Central Paris)'
  vehicle: TransferVehicle;
  bagsAllowed: number;
  pricePaise: number;
  description?: string;
}

export interface Activity {
  id: string;
  cityCode: string;
  name: string;
  durationMin: number;
  pricePaise: number;
  thumb?: string;
  category: 'sightseeing' | 'museum' | 'tour' | 'experience';
}

export type DayInclusion =
  | { kind: 'transfer'; transfer: Transfer }
  | { kind: 'note'; text: string };

export interface Day {
  dayNo: number;
  date: string;                // YYYY-MM-DD
  type: DayType;
  cityCode: string;
  cityName: string;
  fromCityCode?: string;       // for transit days
  fromCityName?: string;
  narrative: string;
  morning?: Activity;
  afternoon?: Activity;
  evening?: Activity;
  inclusions: DayInclusion[];
  overnightAtHotelId?: string;
  arrivalDetails?: { flightNumber: string; arrivalTime: string };
  departureDetails?: { flightNumber: string; departureTime: string };
}

export interface VisaItem {
  country: string;
  countryCode: string;
  description: string;
  included: boolean;
  pricePaise?: number;
}

export interface InsuranceItem {
  description: string;
  included: boolean;
  pricePaise: number;
}

export interface FlightLeg {
  segments: Array<{
    airlineCode: string;
    airlineName: string;
    flightNumber: string;
    fromIATA: string;
    toIATA: string;
    departureAt: string;
    arrivalAt: string;
  }>;
  totalPaise: number;
  cabin: CabinClass;
}

export interface FlightSelection extends FlightLeg {
  // Outbound is the base FlightLeg fields above.
  // Return is optional — populated when the agent searches & selects a
  // separate return leg for a round-trip itinerary.
  return?: FlightLeg;
}

export interface Itinerary {
  id: string;
  createdAt: string;
  intake: IntakeForm;
  destinations: Array<{
    cityCode: string;
    cityName: string;
    nights: number;
    stay?: Stay;
  }>;
  days: Day[];
  flights?: FlightSelection;
  visa: VisaItem[];
  insurance: InsuranceItem;
  pricePaise: number;
  pricePerAdultPaise: number;
  currency: Currency;
  status: 'draft' | 'saved' | 'sent' | 'accepted' | 'booked';
}
