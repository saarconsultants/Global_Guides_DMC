// Client-safe list of cities we have live Hotelbeds coverage for.
// Mirrors packages/adapters/hotelbeds/src/destinations.ts (the server-side
// source of truth) — kept here separately so client components can import it
// without pulling the adapter's node:crypto client into the browser bundle.

export interface SupportedCity { code: string; name: string }

export const HOTEL_SEARCH_CITIES: SupportedCity[] = [
  // Europe
  { code: 'PAR', name: 'Paris' },
  { code: 'LON', name: 'London' },
  { code: 'ROM', name: 'Rome' },
  { code: 'BCN', name: 'Barcelona' },
  { code: 'AMS', name: 'Amsterdam' },
  { code: 'BER', name: 'Berlin' },
  { code: 'ZRH', name: 'Zurich' },
  { code: 'LIS', name: 'Lisbon' },
  { code: 'PRG', name: 'Prague' },
  { code: 'VIE', name: 'Vienna' },
  // Middle East
  { code: 'DXB', name: 'Dubai' },
  { code: 'AUH', name: 'Abu Dhabi' },
  { code: 'DOH', name: 'Doha' },
  // Asia
  { code: 'BKK', name: 'Bangkok' },
  { code: 'SIN', name: 'Singapore' },
  { code: 'MLE', name: 'Maldives' },
  { code: 'HKG', name: 'Hong Kong' },
  { code: 'TYO', name: 'Tokyo' },
  { code: 'KUL', name: 'Kuala Lumpur' },
  { code: 'HKT', name: 'Phuket' },
  { code: 'DPS', name: 'Bali' },
  // India
  { code: 'BOM', name: 'Mumbai' },
  { code: 'DEL', name: 'New Delhi' },
  { code: 'GOI', name: 'Goa' },
  // Americas
  { code: 'NYC', name: 'New York' },
  { code: 'LAX', name: 'Los Angeles' },
  { code: 'MIA', name: 'Miami' },
];
