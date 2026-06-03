// IATA city code → Hotelbeds destinationCode.
//
// Hotelbeds uses its own destination codes (mostly 3-letter, often matching
// IATA but not always). Covers our top 20 cities. Anything not in this table
// returns undefined and the adapter falls back to mock data for that city.
//
// To find a destination code:
//   GET https://api.test.hotelbeds.com/hotel-content-api/1.0/locations/destinations?countryCodes=FR
// Then look for the city name in the response.

export const IATA_TO_HOTELBEDS_DESTINATION: Record<string, string> = {
  // Europe
  PAR: 'PAR',  // Paris
  LON: 'LON',  // London
  ROM: 'ROM',  // Rome
  BCN: 'BCN',  // Barcelona
  AMS: 'AMS',  // Amsterdam
  BER: 'BER',  // Berlin
  ZRH: 'ZRH',  // Zurich
  LIS: 'LIS',  // Lisbon
  PRG: 'PRG',  // Prague
  VIE: 'VIE',  // Vienna

  // Middle East
  DXB: 'DXB',  // Dubai
  AUH: 'AUH',  // Abu Dhabi
  DOH: 'DOH',  // Doha

  // Asia
  BKK: 'BKK',  // Bangkok
  SIN: 'SIN',  // Singapore
  MLE: 'MLE',  // Male, Maldives
  HKG: 'HKG',  // Hong Kong
  TYO: 'TYO',  // Tokyo
  KUL: 'KUL',  // Kuala Lumpur
  HKT: 'HKT',  // Phuket
  DPS: 'BAL',  // Bali — app uses DPS (Denpasar), Hotelbeds uses BAL

  // India (Hotelbeds international inventory; for India hotels Tripjack is better)
  BOM: 'BOM',  // Mumbai
  DEL: 'DEL',  // New Delhi
  GOI: 'GOI',  // Goa

  // Americas
  NYC: 'NYC',  // New York
  LAX: 'LAX',  // Los Angeles
  MIA: 'MIA',  // Miami
};

export function toHotelbedsDestination(iataCityCode: string): string | undefined {
  return IATA_TO_HOTELBEDS_DESTINATION[iataCityCode.toUpperCase()];
}
