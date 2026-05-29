// Pure function: turn an intake form into a full Itinerary skeleton.

import type { IntakeForm, Itinerary, Day, Stay, DayInclusion, VisaItem, InsuranceItem } from './types';
import { pickHotelForStars, airportToHotelTransfer, hotelToAirportTransfer, interCityTransfer, cityInfo } from './mock-inventory';

const HOTEL_CHECKIN_HOUR = 14;
const HOTEL_CHECKOUT_HOUR = 12;

export function composeItinerary(intake: IntakeForm): Itinerary {
  const id = `it_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const startDate = new Date(intake.departureDate);
  const days: Day[] = [];

  // Resolve stays for each destination
  const destinations = intake.destinations.map((d) => {
    const hotel = pickHotelForStars(d.cityCode, intake.starRating);
    if (!hotel) return { ...d, stay: undefined };
    // Compute check-in / check-out using running offset
    return { ...d, stay: undefined as Stay | undefined, _hotel: hotel };
  });

  let dayOffset = 0;
  for (let i = 0; i < destinations.length; i++) {
    const dest = destinations[i]!;
    const hotel = (dest as any)._hotel;
    if (!hotel) continue;

    const ci = addDays(startDate, dayOffset);
    ci.setHours(HOTEL_CHECKIN_HOUR, 0, 0, 0);
    const co = addDays(ci, dest.nights);
    co.setHours(HOTEL_CHECKOUT_HOUR, 0, 0, 0);

    dest.stay = { hotel, checkIn: ci.toISOString(), checkOut: co.toISOString() };

    // Day 0 of this city is Arrival, days 1..n-1 are Stay, day n is Departure or Transit
    for (let n = 0; n < dest.nights; n++) {
      const date = addDays(startDate, dayOffset + n);
      const isFirstDayHere = n === 0;
      const isLastDayHere  = n === dest.nights - 1;
      const isFirstCity    = i === 0;
      const isLastCity     = i === destinations.length - 1;

      let type: Day['type'] = 'stay';
      let narrative = `Day in ${dest.cityName}. Use morning, afternoon and evening slots to add tours and experiences.`;
      const inclusions: DayInclusion[] = [];

      if (isFirstDayHere && isFirstCity) {
        // arrival into the very first city
        type = 'arrival';
        narrative = `Take the stress out of arrival with a private transfer from ${cityInfo(dest.cityCode).airportName} to your hotel.`;
        inclusions.push({ kind: 'transfer', transfer: airportToHotelTransfer(dest.cityCode, hotel.name) });
      } else if (isFirstDayHere && !isFirstCity) {
        // arrival from previous city
        type = 'transit';
        const prev = destinations[i - 1]!;
        narrative = `Travel from ${prev.cityName} to ${dest.cityName}. Private transfer included.`;
        inclusions.push({ kind: 'transfer', transfer: interCityTransfer(prev.cityCode, dest.cityCode) });
      }

      days.push({
        dayNo: dayOffset + n + 1,
        date: ymd(date),
        type,
        cityCode: dest.cityCode,
        cityName: dest.cityName,
        fromCityCode: type === 'transit' ? destinations[i - 1]?.cityCode : undefined,
        fromCityName: type === 'transit' ? destinations[i - 1]?.cityName : undefined,
        narrative,
        inclusions,
        overnightAtHotelId: hotel.id,
      });
    }

    dayOffset += dest.nights;
  }

  // Append a final Departure day from the last city
  const last = destinations[destinations.length - 1];
  if (last && (last as any)._hotel) {
    const lastHotel = (last as any)._hotel;
    const date = addDays(startDate, dayOffset);
    days.push({
      dayNo: dayOffset + 1,
      date: ymd(date),
      type: 'departure',
      cityCode: last.cityCode,
      cityName: last.cityName,
      narrative: `After breakfast you will be transferred to ${cityInfo(last.cityCode).airportName} to catch your return flight back home.`,
      inclusions: [{ kind: 'transfer', transfer: hotelToAirportTransfer(last.cityCode, lastHotel.name) }],
    });
  }

  // Strip helper field used during composition
  for (const d of destinations) delete (d as any)._hotel;

  // Visa: one row per unique country
  const seen = new Set<string>();
  const visa: VisaItem[] = [];
  for (const d of destinations) {
    const c = cityInfo(d.cityCode);
    if (!c.countryCode || seen.has(c.countryCode)) continue;
    seen.add(c.countryCode);
    visa.push({
      country: countryName(c.countryCode),
      countryCode: c.countryCode,
      description: `${countryName(c.countryCode)} – Tourist Visa Assistance Only – Visa Fees Directly Payable – Tourist / Single Entry`,
      included: false,
    });
  }

  const insurance: InsuranceItem = {
    description: 'Travel Insurance with min $50,000 coverage – Only for Age Below 60 Yrs',
    included: false,
    pricePaise: 0,
  };

  // Pricing — sum of all paise components × pax
  const adults = intake.rooms.reduce((s, r) => s + r.adults, 0) || 1;
  let total = 0;
  for (const d of destinations) if (d.stay) total += d.stay.hotel.pricePerNightPaise * d.nights;
  for (const day of days) for (const inc of day.inclusions) if (inc.kind === 'transfer') total += inc.transfer.pricePaise;

  return {
    id,
    createdAt: new Date().toISOString(),
    intake,
    destinations: destinations.map((d) => ({ cityCode: d.cityCode, cityName: d.cityName, nights: d.nights, stay: d.stay })),
    days,
    visa,
    insurance,
    pricePaise: total,
    pricePerAdultPaise: Math.round(total / adults),
    currency: 'INR',
    status: 'draft',
  };
}

// ───────────────── helpers ─────────────────
function addDays(d: Date, n: number): Date {
  const x = new Date(d); x.setDate(x.getDate() + n); return x;
}
function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function countryName(iso2: string): string {
  const m: Record<string, string> = { FR: 'France', NL: 'Netherlands', GB: 'United Kingdom', IT: 'Italy', CH: 'Switzerland', AE: 'United Arab Emirates', TH: 'Thailand', SG: 'Singapore', TR: 'Türkiye', MV: 'Maldives' };
  return m[iso2] ?? iso2;
}
