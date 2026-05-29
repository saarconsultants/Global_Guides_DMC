// Mock inventory bank — used until Tripjack Hotel + Tour APIs are wired.
// Per-city set of hotels, activities, and a transfer pricing function.

import type { Hotel, Activity, Transfer, StarRating, TransferVehicle } from './types';

interface CityInfo {
  name: string;
  countryCode: string;
  airportCode: string;
  airportName: string;
}

export const CITY_BANK: Record<string, CityInfo> = {
  PAR: { name: 'Paris',     countryCode: 'FR', airportCode: 'CDG', airportName: 'Charles de Gaulle (CDG)' },
  AMS: { name: 'Amsterdam', countryCode: 'NL', airportCode: 'AMS', airportName: 'Schiphol (AMS)' },
  LON: { name: 'London',    countryCode: 'GB', airportCode: 'LHR', airportName: 'Heathrow (LHR)' },
  ROM: { name: 'Rome',      countryCode: 'IT', airportCode: 'FCO', airportName: 'Fiumicino (FCO)' },
  ZRH: { name: 'Zurich',    countryCode: 'CH', airportCode: 'ZRH', airportName: 'Zurich (ZRH)' },
  DXB: { name: 'Dubai',     countryCode: 'AE', airportCode: 'DXB', airportName: 'Dubai International (DXB)' },
  BKK: { name: 'Bangkok',   countryCode: 'TH', airportCode: 'BKK', airportName: 'Suvarnabhumi (BKK)' },
  SIN: { name: 'Singapore', countryCode: 'SG', airportCode: 'SIN', airportName: 'Changi (SIN)' },
  ISL: { name: 'Istanbul',  countryCode: 'TR', airportCode: 'IST', airportName: 'Istanbul Airport (IST)' },
  MLE: { name: 'Maldives',  countryCode: 'MV', airportCode: 'MLE', airportName: 'Velana International (MLE)' },
};

export function cityInfo(code: string): CityInfo {
  if (CITY_BANK[code]) return CITY_BANK[code];
  // Fall back to the broader catalogue at lib/cities for any non-mock-supported city
  // (deferred require so the inventory file stays import-cycle-safe)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { findCity } = require('@/lib/cities');
    const c = findCity(code);
    if (c) return { name: c.name, countryCode: c.countryCode, airportCode: c.code, airportName: `${c.name} Airport (${c.code})` };
  } catch { /* ignore */ }
  return { name: code, countryCode: '', airportCode: code, airportName: `${code} Airport` };
}

// ─────────────────────────────────────────── Hotels ───────────────────────────────────────────
// Three options per city (3★ / 4★ / 5★) so star-rating filter has something to pick from.

const H = (id: string, name: string, stars: StarRating, addr: string, cityCode: string, ppn: number, score: number, refundable = true, mealPlan = 'Room Only'): Hotel => ({
  id, name, stars, address: addr, cityCode, pricePerNightPaise: ppn * 100,
  rating: { score, label: score >= 8.5 ? 'Excellent' : score >= 7.5 ? 'Very Good' : 'Good', reviewCount: 200 + Math.floor(Math.random() * 1800) },
  refundable, mealPlan,
  room: { name: stars === 5 ? 'Deluxe Room With King Bed' : stars === 4 ? 'Family Standard Room With 1 Double Bed' : 'Standard Twin Room', bedConfig: stars === 5 ? '1 King' : stars === 4 ? '1 Double + Bunk' : '2 Twins' },
});

export const HOTEL_BANK: Record<string, Hotel[]> = {
  PAR: [
    H('hb_par_3a', 'Ibis Paris Tour Eiffel Cambronne', 3, '2 Rue Cambronne, 75015 Paris', 'PAR',  8500, 7.6),
    H('hb_par_4a', 'Mercure Paris Boulogne', 4, '37 Place Rene Clair, Boulogne-Billancourt', 'PAR', 14850, 8.4),
    H('hb_par_4b', 'Novotel Paris Centre Tour Eiffel', 4, '61 Quai de Grenelle, 75015 Paris', 'PAR', 16200, 8.5, true, 'Breakfast Included'),
    H('hb_par_5a', 'Pullman Paris Tour Eiffel', 5, '18 Avenue de Suffren, 75015 Paris', 'PAR', 28900, 8.9, true, 'Breakfast Included'),
  ],
  AMS: [
    H('hb_ams_3a', 'Ibis Amsterdam Centre', 3, 'Stationsplein 49, 1012 AB Amsterdam', 'AMS',  9100, 7.7),
    H('hb_ams_4a', 'NH Amsterdam Centre', 4, 'Stadhouderskade 7, 1054 ES Amsterdam', 'AMS', 14400, 8.3, true, 'Breakfast Included'),
    H('hb_ams_5a', 'Pulitzer Amsterdam', 5, 'Prinsengracht 323, 1016 GZ Amsterdam', 'AMS', 32500, 9.1, true, 'Breakfast Included'),
  ],
  LON: [
    H('hb_lon_3a', 'Premier Inn London County Hall', 3, 'Belvedere Rd, London SE1 7PB', 'LON', 11500, 8.6),
    H('hb_lon_4a', 'Park Plaza Westminster Bridge', 4, '200 Westminster Bridge Rd, London SE1 7UT', 'LON', 17600, 8.4),
    H('hb_lon_5a', 'The Savoy', 5, 'Strand, London WC2R 0EZ', 'LON', 58000, 9.2, true, 'Breakfast Included'),
  ],
  ROM: [
    H('hb_rom_3a', 'Hotel Diana Roof Garden', 3, 'Via Principe Amedeo 4, 00185 Rome', 'ROM',  8200, 8.2),
    H('hb_rom_4a', 'Starhotels Metropole', 4, 'Via Principe Amedeo 3, 00185 Rome', 'ROM', 13900, 8.4),
    H('hb_rom_5a', 'Rome Cavalieri, Waldorf Astoria', 5, 'Via Alberto Cadlolo 101, 00136 Rome', 'ROM', 42000, 9.0, true, 'Breakfast Included'),
  ],
  ZRH: [
    H('hb_zrh_3a', 'Sorell Hotel Rütli', 3, 'Zähringerstrasse 43, 8001 Zürich', 'ZRH', 14000, 8.0),
    H('hb_zrh_4a', 'Hotel Schweizerhof Zürich', 4, 'Bahnhofplatz 7, 8001 Zürich', 'ZRH', 28500, 8.7, true, 'Breakfast Included'),
    H('hb_zrh_5a', 'Baur au Lac', 5, 'Talstrasse 1, 8001 Zürich', 'ZRH', 78000, 9.3, true, 'Breakfast Included'),
  ],
  DXB: [
    H('hb_dxb_3a', 'Ibis Al Barsha', 3, 'Sheikh Zayed Rd, Al Barsha 1, Dubai', 'DXB', 7800, 8.1),
    H('hb_dxb_4a', 'Hyatt Place Dubai Al Rigga', 4, '17 Al Rigga Rd, Deira, Dubai', 'DXB', 13200, 8.5, true, 'Breakfast Included'),
    H('hb_dxb_5a', 'Atlantis The Palm', 5, 'Crescent Rd, The Palm Jumeirah, Dubai', 'DXB', 38500, 8.8, true, 'Breakfast Included'),
  ],
  BKK: [
    H('hb_bkk_3a', 'Ibis Bangkok Riverside', 3, '27 Charoen Nakhon Rd, Bangkok', 'BKK',  4800, 8.0),
    H('hb_bkk_4a', 'Novotel Bangkok Sukhumvit 20', 4, '19/9 Soi Sukhumvit 20, Bangkok', 'BKK',  7900, 8.4, true, 'Breakfast Included'),
    H('hb_bkk_5a', 'The St. Regis Bangkok', 5, '159 Rajadamri Rd, Bangkok', 'BKK', 22500, 9.1, true, 'Breakfast Included'),
  ],
  SIN: [
    H('hb_sin_3a', 'Hotel Boss Singapore', 3, '500 Jalan Sultan, Singapore', 'SIN',  9200, 8.0),
    H('hb_sin_4a', 'PARKROYAL on Beach Road', 4, '7500 Beach Rd, Singapore', 'SIN', 15800, 8.6, true, 'Breakfast Included'),
    H('hb_sin_5a', 'Marina Bay Sands', 5, '10 Bayfront Ave, Singapore', 'SIN', 45000, 9.0),
  ],
  ISL: [
    H('hb_ist_3a', 'Sirkeci Mansion', 3, 'Taya Hatun Sk No:5, Istanbul', 'ISL',  7600, 9.0),
    H('hb_ist_4a', 'CVK Park Bosphorus Hotel', 4, 'Gümüşsuyu, Inönü Cd. No:8, Istanbul', 'ISL', 12400, 8.5, true, 'Breakfast Included'),
    H('hb_ist_5a', 'Çırağan Palace Kempinski', 5, 'Çırağan Cd. 32, Istanbul', 'ISL', 38000, 9.2, true, 'Breakfast Included'),
  ],
  MLE: [
    H('hb_mle_4a', 'Adaaran Select Hudhuranfushi', 4, 'North Malé Atoll, Maldives', 'MLE', 32000, 8.3, true, 'Breakfast Included'),
    H('hb_mle_5a', 'Atmosphere Kanifushi', 5, 'Lhaviyani Atoll, Maldives', 'MLE', 58000, 9.0, true, 'Breakfast Included'),
    H('hb_mle_5b', 'OBLU Select Sangeli', 5, 'North Malé Atoll, Maldives', 'MLE', 72000, 9.2, true, 'Breakfast Included'),
  ],
};

export function hotelsForCity(cityCode: string): Hotel[] {
  return HOTEL_BANK[cityCode] ?? [];
}

export function pickHotelForStars(cityCode: string, preferred?: StarRating): Hotel | undefined {
  const bank = hotelsForCity(cityCode);
  if (!bank.length) return undefined;
  if (preferred) {
    const match = bank.find((h) => h.stars === preferred);
    if (match) return match;
  }
  // Default: 4 star then 3, then 5
  return bank.find((h) => h.stars === 4) ?? bank.find((h) => h.stars === 3) ?? bank[0];
}

// ─────────────────────────────────────────── Activities ───────────────────────────────────────────

const A = (id: string, cityCode: string, name: string, price: number, mins: number, cat: Activity['category']): Activity =>
  ({ id, cityCode, name, pricePaise: price * 100, durationMin: mins, category: cat });

export const ACTIVITY_BANK: Record<string, Activity[]> = {
  PAR: [
    A('ac_par_eiffel', 'PAR', 'Eiffel Tower Summit Access', 4200, 180, 'sightseeing'),
    A('ac_par_louvre', 'PAR', 'Louvre Museum Skip-the-Line + Guide', 5400, 210, 'museum'),
    A('ac_par_seine',  'PAR', 'Seine River Dinner Cruise', 6800, 150, 'experience'),
    A('ac_par_vers',   'PAR', 'Versailles Palace Day Trip', 8500, 360, 'tour'),
  ],
  AMS: [
    A('ac_ams_canal',  'AMS', 'Canal Cruise (90 min)', 2800, 90,  'experience'),
    A('ac_ams_anne',   'AMS', 'Anne Frank House Tour', 3200, 90,  'museum'),
    A('ac_ams_keukn',  'AMS', 'Keukenhof Gardens Tour (seasonal)', 5400, 240, 'tour'),
  ],
  LON: [
    A('ac_lon_eye',    'LON', 'London Eye Fast-Track', 3400, 60,  'sightseeing'),
    A('ac_lon_tower',  'LON', 'Tower of London + Crown Jewels', 4200, 180, 'museum'),
    A('ac_lon_west',   'LON', 'Westminster + Big Ben Walking Tour', 1800, 120, 'tour'),
  ],
  ROM: [
    A('ac_rom_vat',    'ROM', 'Vatican Museums + Sistine Chapel', 5600, 240, 'museum'),
    A('ac_rom_col',    'ROM', 'Colosseum + Roman Forum Guided', 4400, 180, 'sightseeing'),
  ],
  ZRH: [
    A('ac_zrh_jung',   'ZRH', 'Jungfraujoch — Top of Europe Day Trip', 14200, 540, 'tour'),
    A('ac_zrh_lake',   'ZRH', 'Lake Zurich Cruise', 2200, 90,  'experience'),
  ],
  DXB: [
    A('ac_dxb_burj',   'DXB', 'Burj Khalifa Level 124 + 125', 3800, 90,  'sightseeing'),
    A('ac_dxb_des',    'DXB', 'Desert Safari + BBQ Dinner', 4200, 360, 'experience'),
  ],
  BKK: [
    A('ac_bkk_palace', 'BKK', 'Grand Palace + Wat Phra Kaew Tour', 2400, 180, 'tour'),
    A('ac_bkk_river',  'BKK', 'Chao Phraya River Dinner Cruise', 3200, 150, 'experience'),
  ],
  SIN: [
    A('ac_sin_gard',   'SIN', 'Gardens by the Bay (2 domes)',  2800, 180, 'sightseeing'),
    A('ac_sin_uss',    'SIN', 'Universal Studios Singapore (full day)', 6200, 480, 'experience'),
  ],
  ISL: [
    A('ac_ist_blue',   'ISL', 'Blue Mosque + Hagia Sophia Guided', 2600, 180, 'tour'),
    A('ac_ist_bosph',  'ISL', 'Bosphorus Sunset Cruise', 1800, 120, 'experience'),
  ],
  MLE: [
    A('ac_mle_snork',  'MLE', 'Snorkeling Lagoon Tour', 4800, 180, 'experience'),
    A('ac_mle_dolph',  'MLE', 'Sunset Dolphin Cruise', 4400, 120, 'experience'),
  ],
};

export function activitiesForCity(cityCode: string): Activity[] {
  return ACTIVITY_BANK[cityCode] ?? [];
}

// ─────────────────────────────────────────── Transfers ───────────────────────────────────────────

export function transferPrice(vehicle: TransferVehicle, durationMin = 45): number {
  const base = vehicle === 'PRIVATE_PREMIUM' ? 4800 : vehicle === 'PRIVATE' ? 3200 : 1400;
  // ~ scales with city distance proxy
  return Math.round((base + durationMin * 12) * 100);
}

export function airportToHotelTransfer(cityCode: string, hotelName: string): Transfer {
  const c = cityInfo(cityCode);
  return {
    id: `tx_${cityCode}_arr_${Date.now()}`,
    kind: 'arrival',
    fromName: `${c.airportName}`,
    toName: hotelName,
    vehicle: 'PRIVATE_PREMIUM',
    bagsAllowed: 2,
    pricePaise: transferPrice('PRIVATE_PREMIUM'),
    description: `One-way private premium transfer from ${c.airportName} to your hotel.`,
  };
}

export function hotelToAirportTransfer(cityCode: string, hotelName: string): Transfer {
  const c = cityInfo(cityCode);
  return {
    id: `tx_${cityCode}_dep_${Date.now()}`,
    kind: 'departure',
    fromName: hotelName,
    toName: c.airportName,
    vehicle: 'PRIVATE',
    bagsAllowed: 2,
    pricePaise: transferPrice('PRIVATE'),
    description: `Airport drop-off in time for your departure flight.`,
  };
}

export function interCityTransfer(fromCityCode: string, toCityCode: string): Transfer {
  const a = cityInfo(fromCityCode); const b = cityInfo(toCityCode);
  return {
    id: `tx_${fromCityCode}_${toCityCode}_${Date.now()}`,
    kind: 'inter-city',
    fromName: `${a.name} (City)`,
    toName: `${b.name} (City)`,
    vehicle: 'PRIVATE',
    bagsAllowed: 2,
    pricePaise: transferPrice('PRIVATE', 180),
    description: `Inter-city private transfer from ${a.name} to ${b.name}.`,
  };
}
