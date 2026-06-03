// Client-safe list of cities we have live Hotelbeds coverage for.
// Mirrors packages/adapters/hotelbeds/src/destinations.ts (the server-side
// source of truth) — kept here separately so client components can import it
// without pulling the adapter's node:crypto client into the browser bundle.

export interface SupportedCity { code: string; name: string; country: string }

export const HOTEL_SEARCH_CITIES: SupportedCity[] = [
  // Europe
  { code: 'PAR', name: 'Paris', country: 'France' },
  { code: 'LON', name: 'London', country: 'United Kingdom' },
  { code: 'ROM', name: 'Rome', country: 'Italy' },
  { code: 'BCN', name: 'Barcelona', country: 'Spain' },
  { code: 'AMS', name: 'Amsterdam', country: 'Netherlands' },
  { code: 'BER', name: 'Berlin', country: 'Germany' },
  { code: 'ZRH', name: 'Zurich', country: 'Switzerland' },
  { code: 'LIS', name: 'Lisbon', country: 'Portugal' },
  { code: 'PRG', name: 'Prague', country: 'Czechia' },
  { code: 'VIE', name: 'Vienna', country: 'Austria' },
  // Middle East
  { code: 'DXB', name: 'Dubai', country: 'UAE' },
  { code: 'AUH', name: 'Abu Dhabi', country: 'UAE' },
  { code: 'DOH', name: 'Doha', country: 'Qatar' },
  // Asia
  { code: 'BKK', name: 'Bangkok', country: 'Thailand' },
  { code: 'SIN', name: 'Singapore', country: 'Singapore' },
  { code: 'MLE', name: 'Maldives', country: 'Maldives' },
  { code: 'HKG', name: 'Hong Kong', country: 'Hong Kong' },
  { code: 'TYO', name: 'Tokyo', country: 'Japan' },
  { code: 'KUL', name: 'Kuala Lumpur', country: 'Malaysia' },
  { code: 'HKT', name: 'Phuket', country: 'Thailand' },
  { code: 'DPS', name: 'Bali', country: 'Indonesia' },
  // India
  { code: 'BOM', name: 'Mumbai', country: 'India' },
  { code: 'DEL', name: 'New Delhi', country: 'India' },
  { code: 'GOI', name: 'Goa', country: 'India' },
  // Americas
  { code: 'NYC', name: 'New York', country: 'USA' },
  { code: 'LAX', name: 'Los Angeles', country: 'USA' },
  { code: 'MIA', name: 'Miami', country: 'USA' },
];

export function cityByCode(code: string): SupportedCity | undefined {
  return HOTEL_SEARCH_CITIES.find((c) => c.code === code.toUpperCase());
}

export function searchSupportedCities(query: string, limit = 8): SupportedCity[] {
  const q = query.trim().toLowerCase();
  if (!q) return HOTEL_SEARCH_CITIES;
  const starts: SupportedCity[] = [];
  const contains: SupportedCity[] = [];
  for (const c of HOTEL_SEARCH_CITIES) {
    const hay = `${c.code} ${c.name} ${c.country}`.toLowerCase();
    if (c.name.toLowerCase().startsWith(q) || c.code.toLowerCase().startsWith(q)) starts.push(c);
    else if (hay.includes(q)) contains.push(c);
  }
  return [...starts, ...contains].slice(0, limit);
}
