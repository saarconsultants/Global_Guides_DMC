// Curated airport list for the flight search autocomplete.
// Covers all major Indian airports + popular outbound hubs. IATA codes are
// what we send to Tripjack. Client-safe (no server deps).

export interface Airport {
  iata: string;
  name: string;     // airport name
  city: string;
  country: string;
}

export const AIRPORTS: Airport[] = [
  // ── India (metros + tier-2) ──
  { iata: 'BOM', name: 'Chhatrapati Shivaji Intl', city: 'Mumbai', country: 'India' },
  { iata: 'DEL', name: 'Indira Gandhi Intl', city: 'New Delhi', country: 'India' },
  { iata: 'BLR', name: 'Kempegowda Intl', city: 'Bengaluru', country: 'India' },
  { iata: 'MAA', name: 'Chennai Intl', city: 'Chennai', country: 'India' },
  { iata: 'HYD', name: 'Rajiv Gandhi Intl', city: 'Hyderabad', country: 'India' },
  { iata: 'CCU', name: 'Netaji Subhas Chandra Bose Intl', city: 'Kolkata', country: 'India' },
  { iata: 'PNQ', name: 'Pune Airport', city: 'Pune', country: 'India' },
  { iata: 'GOI', name: 'Dabolim / Goa', city: 'Goa', country: 'India' },
  { iata: 'GOX', name: 'Manohar Intl (Mopa)', city: 'Goa', country: 'India' },
  { iata: 'AMD', name: 'Sardar Vallabhbhai Patel Intl', city: 'Ahmedabad', country: 'India' },
  { iata: 'COK', name: 'Cochin Intl', city: 'Kochi', country: 'India' },
  { iata: 'TRV', name: 'Trivandrum Intl', city: 'Thiruvananthapuram', country: 'India' },
  { iata: 'JAI', name: 'Jaipur Intl', city: 'Jaipur', country: 'India' },
  { iata: 'LKO', name: 'Chaudhary Charan Singh Intl', city: 'Lucknow', country: 'India' },
  { iata: 'IXC', name: 'Chandigarh Airport', city: 'Chandigarh', country: 'India' },
  { iata: 'NAG', name: 'Dr. Babasaheb Ambedkar Intl', city: 'Nagpur', country: 'India' },
  { iata: 'IXB', name: 'Bagdogra Airport', city: 'Siliguri', country: 'India' },
  { iata: 'GAU', name: 'Lokpriya Gopinath Bordoloi Intl', city: 'Guwahati', country: 'India' },
  { iata: 'PAT', name: 'Jay Prakash Narayan', city: 'Patna', country: 'India' },
  { iata: 'BBI', name: 'Biju Patnaik Intl', city: 'Bhubaneswar', country: 'India' },
  { iata: 'IXM', name: 'Madurai Airport', city: 'Madurai', country: 'India' },
  { iata: 'VNS', name: 'Lal Bahadur Shastri Intl', city: 'Varanasi', country: 'India' },
  { iata: 'SXR', name: 'Sheikh ul-Alam Intl', city: 'Srinagar', country: 'India' },
  { iata: 'IXE', name: 'Mangalore Intl', city: 'Mangalore', country: 'India' },
  { iata: 'ATQ', name: 'Sri Guru Ram Dass Jee Intl', city: 'Amritsar', country: 'India' },
  { iata: 'IDR', name: 'Devi Ahilyabai Holkar', city: 'Indore', country: 'India' },

  // ── Middle East ──
  { iata: 'DXB', name: 'Dubai Intl', city: 'Dubai', country: 'UAE' },
  { iata: 'AUH', name: 'Zayed Intl', city: 'Abu Dhabi', country: 'UAE' },
  { iata: 'SHJ', name: 'Sharjah Intl', city: 'Sharjah', country: 'UAE' },
  { iata: 'DOH', name: 'Hamad Intl', city: 'Doha', country: 'Qatar' },
  { iata: 'JED', name: 'King Abdulaziz Intl', city: 'Jeddah', country: 'Saudi Arabia' },
  { iata: 'RUH', name: 'King Khalid Intl', city: 'Riyadh', country: 'Saudi Arabia' },
  { iata: 'MCT', name: 'Muscat Intl', city: 'Muscat', country: 'Oman' },
  { iata: 'BAH', name: 'Bahrain Intl', city: 'Manama', country: 'Bahrain' },
  { iata: 'KWI', name: 'Kuwait Intl', city: 'Kuwait City', country: 'Kuwait' },
  { iata: 'IST', name: 'Istanbul Airport', city: 'Istanbul', country: 'Türkiye' },

  // ── Europe ──
  { iata: 'LHR', name: 'Heathrow', city: 'London', country: 'United Kingdom' },
  { iata: 'LGW', name: 'Gatwick', city: 'London', country: 'United Kingdom' },
  { iata: 'CDG', name: 'Charles de Gaulle', city: 'Paris', country: 'France' },
  { iata: 'ORY', name: 'Orly', city: 'Paris', country: 'France' },
  { iata: 'AMS', name: 'Schiphol', city: 'Amsterdam', country: 'Netherlands' },
  { iata: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Germany' },
  { iata: 'MUC', name: 'Munich Airport', city: 'Munich', country: 'Germany' },
  { iata: 'BER', name: 'Brandenburg', city: 'Berlin', country: 'Germany' },
  { iata: 'FCO', name: 'Fiumicino', city: 'Rome', country: 'Italy' },
  { iata: 'MXP', name: 'Malpensa', city: 'Milan', country: 'Italy' },
  { iata: 'VCE', name: 'Marco Polo', city: 'Venice', country: 'Italy' },
  { iata: 'BCN', name: 'El Prat', city: 'Barcelona', country: 'Spain' },
  { iata: 'MAD', name: 'Adolfo Suárez Barajas', city: 'Madrid', country: 'Spain' },
  { iata: 'ZRH', name: 'Zurich Airport', city: 'Zurich', country: 'Switzerland' },
  { iata: 'GVA', name: 'Geneva Airport', city: 'Geneva', country: 'Switzerland' },
  { iata: 'LIS', name: 'Humberto Delgado', city: 'Lisbon', country: 'Portugal' },
  { iata: 'VIE', name: 'Vienna Intl', city: 'Vienna', country: 'Austria' },
  { iata: 'PRG', name: 'Václav Havel', city: 'Prague', country: 'Czechia' },
  { iata: 'ATH', name: 'Eleftherios Venizelos', city: 'Athens', country: 'Greece' },
  { iata: 'DUB', name: 'Dublin Airport', city: 'Dublin', country: 'Ireland' },
  { iata: 'CPH', name: 'Copenhagen Airport', city: 'Copenhagen', country: 'Denmark' },

  // ── Asia-Pacific ──
  { iata: 'SIN', name: 'Changi', city: 'Singapore', country: 'Singapore' },
  { iata: 'BKK', name: 'Suvarnabhumi', city: 'Bangkok', country: 'Thailand' },
  { iata: 'DMK', name: 'Don Mueang', city: 'Bangkok', country: 'Thailand' },
  { iata: 'HKT', name: 'Phuket Intl', city: 'Phuket', country: 'Thailand' },
  { iata: 'KUL', name: 'Kuala Lumpur Intl', city: 'Kuala Lumpur', country: 'Malaysia' },
  { iata: 'DPS', name: 'Ngurah Rai', city: 'Bali', country: 'Indonesia' },
  { iata: 'CGK', name: 'Soekarno-Hatta', city: 'Jakarta', country: 'Indonesia' },
  { iata: 'HKG', name: 'Hong Kong Intl', city: 'Hong Kong', country: 'Hong Kong' },
  { iata: 'NRT', name: 'Narita Intl', city: 'Tokyo', country: 'Japan' },
  { iata: 'HND', name: 'Haneda', city: 'Tokyo', country: 'Japan' },
  { iata: 'ICN', name: 'Incheon Intl', city: 'Seoul', country: 'South Korea' },
  { iata: 'MLE', name: 'Velana Intl', city: 'Malé', country: 'Maldives' },
  { iata: 'CMB', name: 'Bandaranaike Intl', city: 'Colombo', country: 'Sri Lanka' },
  { iata: 'KTM', name: 'Tribhuvan Intl', city: 'Kathmandu', country: 'Nepal' },
  { iata: 'SYD', name: 'Kingsford Smith', city: 'Sydney', country: 'Australia' },
  { iata: 'MEL', name: 'Melbourne Airport', city: 'Melbourne', country: 'Australia' },

  // ── Americas ──
  { iata: 'JFK', name: 'John F. Kennedy Intl', city: 'New York', country: 'USA' },
  { iata: 'EWR', name: 'Newark Liberty Intl', city: 'New York', country: 'USA' },
  { iata: 'LAX', name: 'Los Angeles Intl', city: 'Los Angeles', country: 'USA' },
  { iata: 'SFO', name: 'San Francisco Intl', city: 'San Francisco', country: 'USA' },
  { iata: 'ORD', name: "O'Hare Intl", city: 'Chicago', country: 'USA' },
  { iata: 'MIA', name: 'Miami Intl', city: 'Miami', country: 'USA' },
  { iata: 'YYZ', name: 'Pearson Intl', city: 'Toronto', country: 'Canada' },
  { iata: 'YVR', name: 'Vancouver Intl', city: 'Vancouver', country: 'Canada' },

  // ── Africa ──
  { iata: 'CAI', name: 'Cairo Intl', city: 'Cairo', country: 'Egypt' },
  { iata: 'JNB', name: 'O. R. Tambo Intl', city: 'Johannesburg', country: 'South Africa' },
  { iata: 'NBO', name: 'Jomo Kenyatta Intl', city: 'Nairobi', country: 'Kenya' },
  { iata: 'MRU', name: 'Sir Seewoosagur Ramgoolam', city: 'Mauritius', country: 'Mauritius' },
];

export function searchAirports(query: string, limit = 8): Airport[] {
  const q = query.trim().toLowerCase();
  if (!q) return AIRPORTS.slice(0, limit);
  const starts: Airport[] = [];
  const contains: Airport[] = [];
  for (const a of AIRPORTS) {
    const hay = `${a.iata} ${a.name} ${a.city} ${a.country}`.toLowerCase();
    if (a.iata.toLowerCase() === q || a.city.toLowerCase().startsWith(q) || a.iata.toLowerCase().startsWith(q)) starts.push(a);
    else if (hay.includes(q)) contains.push(a);
  }
  return [...starts, ...contains].slice(0, limit);
}

export function airportByIata(iata: string): Airport | undefined {
  return AIRPORTS.find((a) => a.iata === iata.toUpperCase());
}
