// Extended city catalogue used by the itinerary intake combobox + future search.
// Codes are IATA city/metro codes where available; some non-IATA placeholders too.
// "supported" === true: we have hotels/activities for it (matches mock-inventory bank).

export interface CityEntry {
  code: string;
  name: string;
  country: string;
  countryCode: string;
  region: 'EUROPE' | 'SE_ASIA' | 'MIDDLE_EAST' | 'INDIAN_SUB' | 'OCEANIA' | 'AFRICA' | 'AMERICAS' | 'EAST_ASIA';
  supported?: boolean;
}

export const CITIES: CityEntry[] = [
  // Europe
  { code: 'PAR', name: 'Paris',       country: 'France',         countryCode: 'FR', region: 'EUROPE',      supported: true },
  { code: 'LON', name: 'London',      country: 'United Kingdom', countryCode: 'GB', region: 'EUROPE',      supported: true },
  { code: 'AMS', name: 'Amsterdam',   country: 'Netherlands',    countryCode: 'NL', region: 'EUROPE',      supported: true },
  { code: 'ROM', name: 'Rome',        country: 'Italy',          countryCode: 'IT', region: 'EUROPE',      supported: true },
  { code: 'ZRH', name: 'Zurich',      country: 'Switzerland',    countryCode: 'CH', region: 'EUROPE',      supported: true },
  { code: 'ISL', name: 'Istanbul',    country: 'Türkiye',        countryCode: 'TR', region: 'EUROPE',      supported: true },
  { code: 'BCN', name: 'Barcelona',   country: 'Spain',          countryCode: 'ES', region: 'EUROPE' },
  { code: 'MAD', name: 'Madrid',      country: 'Spain',          countryCode: 'ES', region: 'EUROPE' },
  { code: 'BER', name: 'Berlin',      country: 'Germany',        countryCode: 'DE', region: 'EUROPE' },
  { code: 'MUC', name: 'Munich',      country: 'Germany',        countryCode: 'DE', region: 'EUROPE' },
  { code: 'FRA', name: 'Frankfurt',   country: 'Germany',        countryCode: 'DE', region: 'EUROPE' },
  { code: 'VIE', name: 'Vienna',      country: 'Austria',        countryCode: 'AT', region: 'EUROPE' },
  { code: 'PRG', name: 'Prague',      country: 'Czech Republic', countryCode: 'CZ', region: 'EUROPE' },
  { code: 'BUD', name: 'Budapest',    country: 'Hungary',        countryCode: 'HU', region: 'EUROPE' },
  { code: 'CPH', name: 'Copenhagen',  country: 'Denmark',        countryCode: 'DK', region: 'EUROPE' },
  { code: 'STO', name: 'Stockholm',   country: 'Sweden',         countryCode: 'SE', region: 'EUROPE' },
  { code: 'OSL', name: 'Oslo',        country: 'Norway',         countryCode: 'NO', region: 'EUROPE' },
  { code: 'HEL', name: 'Helsinki',    country: 'Finland',        countryCode: 'FI', region: 'EUROPE' },
  { code: 'REK', name: 'Reykjavík',   country: 'Iceland',        countryCode: 'IS', region: 'EUROPE' },
  { code: 'DUB', name: 'Dublin',      country: 'Ireland',        countryCode: 'IE', region: 'EUROPE' },
  { code: 'EDI', name: 'Edinburgh',   country: 'United Kingdom', countryCode: 'GB', region: 'EUROPE' },
  { code: 'BRU', name: 'Brussels',    country: 'Belgium',        countryCode: 'BE', region: 'EUROPE' },
  { code: 'LIS', name: 'Lisbon',      country: 'Portugal',       countryCode: 'PT', region: 'EUROPE' },
  { code: 'ATH', name: 'Athens',      country: 'Greece',         countryCode: 'GR', region: 'EUROPE' },
  { code: 'JTR', name: 'Santorini',   country: 'Greece',         countryCode: 'GR', region: 'EUROPE' },
  { code: 'JMK', name: 'Mykonos',     country: 'Greece',         countryCode: 'GR', region: 'EUROPE' },
  { code: 'NCE', name: 'Nice',        country: 'France',         countryCode: 'FR', region: 'EUROPE' },
  { code: 'MIL', name: 'Milan',       country: 'Italy',          countryCode: 'IT', region: 'EUROPE' },
  { code: 'VCE', name: 'Venice',      country: 'Italy',          countryCode: 'IT', region: 'EUROPE' },
  { code: 'FLR', name: 'Florence',    country: 'Italy',          countryCode: 'IT', region: 'EUROPE' },
  { code: 'NAP', name: 'Naples',      country: 'Italy',          countryCode: 'IT', region: 'EUROPE' },
  { code: 'GVA', name: 'Geneva',      country: 'Switzerland',    countryCode: 'CH', region: 'EUROPE' },
  { code: 'INL', name: 'Interlaken',  country: 'Switzerland',    countryCode: 'CH', region: 'EUROPE' },
  { code: 'WAW', name: 'Warsaw',      country: 'Poland',         countryCode: 'PL', region: 'EUROPE' },
  { code: 'KRK', name: 'Krakow',      country: 'Poland',         countryCode: 'PL', region: 'EUROPE' },
  { code: 'TLL', name: 'Tallinn',     country: 'Estonia',        countryCode: 'EE', region: 'EUROPE' },
  { code: 'MOW', name: 'Moscow',      country: 'Russia',         countryCode: 'RU', region: 'EUROPE' },

  // Middle East
  { code: 'DXB', name: 'Dubai',       country: 'United Arab Emirates', countryCode: 'AE', region: 'MIDDLE_EAST', supported: true },
  { code: 'AUH', name: 'Abu Dhabi',   country: 'United Arab Emirates', countryCode: 'AE', region: 'MIDDLE_EAST' },
  { code: 'DOH', name: 'Doha',        country: 'Qatar',          countryCode: 'QA', region: 'MIDDLE_EAST' },
  { code: 'BAH', name: 'Manama',      country: 'Bahrain',        countryCode: 'BH', region: 'MIDDLE_EAST' },
  { code: 'MCT', name: 'Muscat',      country: 'Oman',           countryCode: 'OM', region: 'MIDDLE_EAST' },
  { code: 'KWI', name: 'Kuwait City', country: 'Kuwait',         countryCode: 'KW', region: 'MIDDLE_EAST' },
  { code: 'AMM', name: 'Amman',       country: 'Jordan',         countryCode: 'JO', region: 'MIDDLE_EAST' },
  { code: 'BEY', name: 'Beirut',      country: 'Lebanon',        countryCode: 'LB', region: 'MIDDLE_EAST' },
  { code: 'JED', name: 'Jeddah',      country: 'Saudi Arabia',   countryCode: 'SA', region: 'MIDDLE_EAST' },

  // SE Asia
  { code: 'BKK', name: 'Bangkok',     country: 'Thailand',       countryCode: 'TH', region: 'SE_ASIA', supported: true },
  { code: 'HKT', name: 'Phuket',      country: 'Thailand',       countryCode: 'TH', region: 'SE_ASIA' },
  { code: 'CNX', name: 'Chiang Mai',  country: 'Thailand',       countryCode: 'TH', region: 'SE_ASIA' },
  { code: 'KBV', name: 'Krabi',       country: 'Thailand',       countryCode: 'TH', region: 'SE_ASIA' },
  { code: 'USM', name: 'Koh Samui',   country: 'Thailand',       countryCode: 'TH', region: 'SE_ASIA' },
  { code: 'SIN', name: 'Singapore',   country: 'Singapore',      countryCode: 'SG', region: 'SE_ASIA', supported: true },
  { code: 'KUL', name: 'Kuala Lumpur',country: 'Malaysia',       countryCode: 'MY', region: 'SE_ASIA' },
  { code: 'LGK', name: 'Langkawi',    country: 'Malaysia',       countryCode: 'MY', region: 'SE_ASIA' },
  { code: 'BKI', name: 'Kota Kinabalu',country: 'Malaysia',      countryCode: 'MY', region: 'SE_ASIA' },
  { code: 'DPS', name: 'Bali',        country: 'Indonesia',      countryCode: 'ID', region: 'SE_ASIA' },
  { code: 'JKT', name: 'Jakarta',     country: 'Indonesia',      countryCode: 'ID', region: 'SE_ASIA' },
  { code: 'MNL', name: 'Manila',      country: 'Philippines',    countryCode: 'PH', region: 'SE_ASIA' },
  { code: 'CEB', name: 'Cebu',        country: 'Philippines',    countryCode: 'PH', region: 'SE_ASIA' },
  { code: 'HAN', name: 'Hanoi',       country: 'Vietnam',        countryCode: 'VN', region: 'SE_ASIA' },
  { code: 'SGN', name: 'Ho Chi Minh City', country: 'Vietnam',   countryCode: 'VN', region: 'SE_ASIA' },
  { code: 'DAD', name: 'Da Nang',     country: 'Vietnam',        countryCode: 'VN', region: 'SE_ASIA' },
  { code: 'REP', name: 'Siem Reap',   country: 'Cambodia',       countryCode: 'KH', region: 'SE_ASIA' },
  { code: 'PNH', name: 'Phnom Penh',  country: 'Cambodia',       countryCode: 'KH', region: 'SE_ASIA' },
  { code: 'VTE', name: 'Vientiane',   country: 'Laos',           countryCode: 'LA', region: 'SE_ASIA' },
  { code: 'RGN', name: 'Yangon',      country: 'Myanmar',        countryCode: 'MM', region: 'SE_ASIA' },
  { code: 'MLE', name: 'Maldives',    country: 'Maldives',       countryCode: 'MV', region: 'SE_ASIA', supported: true },

  // East Asia
  { code: 'TYO', name: 'Tokyo',       country: 'Japan',          countryCode: 'JP', region: 'EAST_ASIA' },
  { code: 'OSA', name: 'Osaka',       country: 'Japan',          countryCode: 'JP', region: 'EAST_ASIA' },
  { code: 'KYO', name: 'Kyoto',       country: 'Japan',          countryCode: 'JP', region: 'EAST_ASIA' },
  { code: 'SEL', name: 'Seoul',       country: 'South Korea',    countryCode: 'KR', region: 'EAST_ASIA' },
  { code: 'CJU', name: 'Jeju',        country: 'South Korea',    countryCode: 'KR', region: 'EAST_ASIA' },
  { code: 'BJS', name: 'Beijing',     country: 'China',          countryCode: 'CN', region: 'EAST_ASIA' },
  { code: 'SHA', name: 'Shanghai',    country: 'China',          countryCode: 'CN', region: 'EAST_ASIA' },
  { code: 'HKG', name: 'Hong Kong',   country: 'Hong Kong',      countryCode: 'HK', region: 'EAST_ASIA' },
  { code: 'MFM', name: 'Macau',       country: 'Macau',          countryCode: 'MO', region: 'EAST_ASIA' },
  { code: 'TPE', name: 'Taipei',      country: 'Taiwan',         countryCode: 'TW', region: 'EAST_ASIA' },
  { code: 'ULN', name: 'Ulaanbaatar', country: 'Mongolia',       countryCode: 'MN', region: 'EAST_ASIA' },

  // Indian sub
  { code: 'DEL', name: 'Delhi',       country: 'India',          countryCode: 'IN', region: 'INDIAN_SUB' },
  { code: 'BOM', name: 'Mumbai',      country: 'India',          countryCode: 'IN', region: 'INDIAN_SUB' },
  { code: 'BLR', name: 'Bengaluru',   country: 'India',          countryCode: 'IN', region: 'INDIAN_SUB' },
  { code: 'MAA', name: 'Chennai',     country: 'India',          countryCode: 'IN', region: 'INDIAN_SUB' },
  { code: 'CCU', name: 'Kolkata',     country: 'India',          countryCode: 'IN', region: 'INDIAN_SUB' },
  { code: 'HYD', name: 'Hyderabad',   country: 'India',          countryCode: 'IN', region: 'INDIAN_SUB' },
  { code: 'PNQ', name: 'Pune',        country: 'India',          countryCode: 'IN', region: 'INDIAN_SUB' },
  { code: 'GOI', name: 'Goa',         country: 'India',          countryCode: 'IN', region: 'INDIAN_SUB' },
  { code: 'IXC', name: 'Chandigarh',  country: 'India',          countryCode: 'IN', region: 'INDIAN_SUB' },
  { code: 'JAI', name: 'Jaipur',      country: 'India',          countryCode: 'IN', region: 'INDIAN_SUB' },
  { code: 'UDR', name: 'Udaipur',     country: 'India',          countryCode: 'IN', region: 'INDIAN_SUB' },
  { code: 'AGR', name: 'Agra',        country: 'India',          countryCode: 'IN', region: 'INDIAN_SUB' },
  { code: 'COK', name: 'Kochi',       country: 'India',          countryCode: 'IN', region: 'INDIAN_SUB' },
  { code: 'TRV', name: 'Trivandrum',  country: 'India',          countryCode: 'IN', region: 'INDIAN_SUB' },
  { code: 'CMB', name: 'Colombo',     country: 'Sri Lanka',      countryCode: 'LK', region: 'INDIAN_SUB' },
  { code: 'KTM', name: 'Kathmandu',   country: 'Nepal',          countryCode: 'NP', region: 'INDIAN_SUB' },
  { code: 'PBH', name: 'Paro',        country: 'Bhutan',         countryCode: 'BT', region: 'INDIAN_SUB' },
  { code: 'DAC', name: 'Dhaka',       country: 'Bangladesh',     countryCode: 'BD', region: 'INDIAN_SUB' },

  // Oceania
  { code: 'SYD', name: 'Sydney',      country: 'Australia',      countryCode: 'AU', region: 'OCEANIA' },
  { code: 'MEL', name: 'Melbourne',   country: 'Australia',      countryCode: 'AU', region: 'OCEANIA' },
  { code: 'BNE', name: 'Brisbane',    country: 'Australia',      countryCode: 'AU', region: 'OCEANIA' },
  { code: 'PER', name: 'Perth',       country: 'Australia',      countryCode: 'AU', region: 'OCEANIA' },
  { code: 'CNS', name: 'Cairns',      country: 'Australia',      countryCode: 'AU', region: 'OCEANIA' },
  { code: 'AKL', name: 'Auckland',    country: 'New Zealand',    countryCode: 'NZ', region: 'OCEANIA' },
  { code: 'ZQN', name: 'Queenstown',  country: 'New Zealand',    countryCode: 'NZ', region: 'OCEANIA' },
  { code: 'WLG', name: 'Wellington',  country: 'New Zealand',    countryCode: 'NZ', region: 'OCEANIA' },
  { code: 'NAN', name: 'Nadi',        country: 'Fiji',           countryCode: 'FJ', region: 'OCEANIA' },

  // Africa
  { code: 'CAI', name: 'Cairo',       country: 'Egypt',          countryCode: 'EG', region: 'AFRICA' },
  { code: 'HRG', name: 'Hurghada',    country: 'Egypt',          countryCode: 'EG', region: 'AFRICA' },
  { code: 'CPT', name: 'Cape Town',   country: 'South Africa',   countryCode: 'ZA', region: 'AFRICA' },
  { code: 'JNB', name: 'Johannesburg',country: 'South Africa',   countryCode: 'ZA', region: 'AFRICA' },
  { code: 'NBO', name: 'Nairobi',     country: 'Kenya',          countryCode: 'KE', region: 'AFRICA' },
  { code: 'MBA', name: 'Mombasa',     country: 'Kenya',          countryCode: 'KE', region: 'AFRICA' },
  { code: 'ZNZ', name: 'Zanzibar',    country: 'Tanzania',       countryCode: 'TZ', region: 'AFRICA' },
  { code: 'JRO', name: 'Kilimanjaro', country: 'Tanzania',       countryCode: 'TZ', region: 'AFRICA' },
  { code: 'CMN', name: 'Casablanca',  country: 'Morocco',        countryCode: 'MA', region: 'AFRICA' },
  { code: 'RAK', name: 'Marrakech',   country: 'Morocco',        countryCode: 'MA', region: 'AFRICA' },
  { code: 'MRU', name: 'Mauritius',   country: 'Mauritius',      countryCode: 'MU', region: 'AFRICA' },
  { code: 'SEZ', name: 'Seychelles',  country: 'Seychelles',     countryCode: 'SC', region: 'AFRICA' },

  // Americas
  { code: 'NYC', name: 'New York',    country: 'United States',  countryCode: 'US', region: 'AMERICAS' },
  { code: 'LAX', name: 'Los Angeles', country: 'United States',  countryCode: 'US', region: 'AMERICAS' },
  { code: 'SFO', name: 'San Francisco', country: 'United States',countryCode: 'US', region: 'AMERICAS' },
  { code: 'LAS', name: 'Las Vegas',   country: 'United States',  countryCode: 'US', region: 'AMERICAS' },
  { code: 'MIA', name: 'Miami',       country: 'United States',  countryCode: 'US', region: 'AMERICAS' },
  { code: 'CHI', name: 'Chicago',     country: 'United States',  countryCode: 'US', region: 'AMERICAS' },
  { code: 'WAS', name: 'Washington DC', country: 'United States',countryCode: 'US', region: 'AMERICAS' },
  { code: 'YTO', name: 'Toronto',     country: 'Canada',         countryCode: 'CA', region: 'AMERICAS' },
  { code: 'YVR', name: 'Vancouver',   country: 'Canada',         countryCode: 'CA', region: 'AMERICAS' },
  { code: 'YUL', name: 'Montréal',    country: 'Canada',         countryCode: 'CA', region: 'AMERICAS' },
  { code: 'MEX', name: 'Mexico City', country: 'Mexico',         countryCode: 'MX', region: 'AMERICAS' },
  { code: 'CUN', name: 'Cancún',      country: 'Mexico',         countryCode: 'MX', region: 'AMERICAS' },
  { code: 'HAV', name: 'Havana',      country: 'Cuba',           countryCode: 'CU', region: 'AMERICAS' },
  { code: 'RIO', name: 'Rio de Janeiro', country: 'Brazil',      countryCode: 'BR', region: 'AMERICAS' },
  { code: 'SAO', name: 'São Paulo',   country: 'Brazil',         countryCode: 'BR', region: 'AMERICAS' },
  { code: 'BUE', name: 'Buenos Aires',country: 'Argentina',      countryCode: 'AR', region: 'AMERICAS' },
  { code: 'LIM', name: 'Lima',        country: 'Peru',           countryCode: 'PE', region: 'AMERICAS' },
  { code: 'CUZ', name: 'Cusco',       country: 'Peru',           countryCode: 'PE', region: 'AMERICAS' },
  { code: 'SCL', name: 'Santiago',    country: 'Chile',          countryCode: 'CL', region: 'AMERICAS' },
];

export function findCity(code: string): CityEntry | undefined {
  return CITIES.find((c) => c.code === code.toUpperCase());
}

// Resolve a free-text city name (e.g. "Pune", "new delhi") to an IATA code.
// Returns undefined if no match — caller should fall back to letting the user type.
export function findCityCodeByName(name: string): string | undefined {
  const q = name.trim().toLowerCase();
  if (!q) return undefined;
  const exact = CITIES.find((c) => c.name.toLowerCase() === q);
  if (exact) return exact.code;
  const startsWith = CITIES.find((c) => c.name.toLowerCase().startsWith(q));
  return startsWith?.code;
}

export function searchCities(query: string, limit = 25): CityEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return CITIES.slice(0, limit);
  const starts: CityEntry[] = [];
  const contains: CityEntry[] = [];
  for (const c of CITIES) {
    const hay = `${c.name} ${c.country} ${c.code}`.toLowerCase();
    if (c.name.toLowerCase().startsWith(q) || c.code.toLowerCase().startsWith(q)) starts.push(c);
    else if (hay.includes(q)) contains.push(c);
  }
  return [...starts, ...contains].slice(0, limit);
}
