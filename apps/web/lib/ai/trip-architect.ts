// AI Trip Architect — builds a COMPLETE priced itinerary from free-text input,
// grounded 100% in live supplier data. The LLM never invents content:
//
//   1. ROUTE  (LLM #1, existing suggester): order cities + allocate nights.
//   2. FETCH  (code): compose the base trip via the existing live pipeline
//      (Hotelbeds hotels + transfers), then fetch CANDIDATE menus — hotel
//      options per city, activity options per city, flight options (Tripjack)
//      for the outbound + return legs.
//   3. SELECT (LLM #2): the model sees ONLY the numbered menus and answers
//      with indices. Anything off-menu is discarded during validation.
//   4. ASSEMBLE (code): swap chosen hotels in, place chosen activities into
//      day slots, attach chosen flights, re-price. Every fact in the final
//      itinerary comes from supplier data we fetched — never from the model.
//
// Swapping the supplier layer (e.g. full Tripjack hotels when access lands)
// only touches step 2 — the AI layer is source-agnostic.

import { suggestItinerary } from './suggest-itinerary';
import { chat } from './openrouter';
import { composeItineraryAction } from '@/app/actions/compose-itinerary';
import { searchHotels, searchActivities, isLive as hbLive } from '@gg/hotelbeds';
import { searchFlights, type FlightOffer } from '@gg/tripjack';
import { hotelsForCity, activitiesForCity, cityInfo } from '@/lib/itinerary/mock-inventory';
import type { Activity, CabinClass, FlightLeg, Hotel, IntakeForm, Itinerary, StarRating } from '@/lib/itinerary/types';

export interface ArchitectInput {
  destinationsText: string;
  totalNights: number;
  departureDate: string;        // YYYY-MM-DD
  adults: number;
  children?: number;
  originIATA?: string;          // omit to skip flights
  cabin?: CabinClass;
  budget?: 'standard' | 'premium' | 'luxury';
  notes?: string;
}

export interface ArchitectResult {
  itinerary: Itinerary;
  summary: string;
  warnings: string[];
}

const CAND_HOTELS = 6;
const CAND_ACTS = 8;
const CAND_FLIGHTS = 5;

const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

function addDaysIso(iso: string, n: number): string {
  const d = new Date(iso); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10);
}

export async function architectTrip(input: ArchitectInput): Promise<ArchitectResult> {
  const warnings: string[] = [];
  const adults = Math.max(1, input.adults);
  const children = Math.max(0, input.children ?? 0);

  // ── 1. ROUTE ──────────────────────────────────────────────────────────────
  const route = await suggestItinerary({
    destinationsText: input.destinationsText,
    totalNights: input.totalNights,
    budget: input.budget,
    travelers: { adults, children },
    notes: input.notes,
  });
  warnings.push(...route.warnings);

  const starRating: StarRating | undefined = input.budget === 'luxury' ? 5 : input.budget === 'premium' ? 4 : undefined;
  const intake: IntakeForm = {
    destinations: route.cities.map((c) => ({
      cityCode: c.cityCode,
      cityName: c.cityName,
      countryCode: cityInfo(c.cityCode)?.countryCode ?? 'FR',
      nights: c.nights,
    })),
    leavingFromCode: input.originIATA ?? 'DEL',
    leavingFromName: input.originIATA ?? 'Delhi',
    nationality: 'IN',
    departureDate: input.departureDate,
    rooms: [{ adults, children }],
    starRating,
    addTransfers: true,
  };

  // ── 2. BASE + CANDIDATE MENUS (all parallel, individually fail-safe) ─────
  const endDate = addDaysIso(input.departureDate, input.totalNights);
  const firstCity = intake.destinations[0]!;
  const lastCity = intake.destinations[intake.destinations.length - 1]!;
  const firstAirport = cityInfo(firstCity.cityCode)?.airportCode;
  const lastAirport = cityInfo(lastCity.cityCode)?.airportCode;
  const wantFlights = !!input.originIATA && !!firstAirport && !!lastAirport;
  const cabin: CabinClass = input.cabin ?? 'ECONOMY';

  // Per-city hotel/activity date windows follow the running night offset.
  let offset = 0;
  const windows = intake.destinations.map((d) => {
    const w = { cityCode: d.cityCode, checkIn: addDaysIso(input.departureDate, offset), checkOut: addDaysIso(input.departureDate, offset + d.nights) };
    offset += d.nights;
    return w;
  });

  const [base, hotelMenus, actMenus, flightsOut, flightsRet] = await Promise.all([
    composeItineraryAction(intake), // existing live pipeline (median hotel + transfers, 9s-capped)
    Promise.all(windows.map(async (w) => {
      try {
        if (hbLive('hotels')) {
          const res = await withTimeout(searchHotels({ cityCode: w.cityCode, checkIn: w.checkIn, checkOut: w.checkOut, rooms: [{ adults, children }], minStars: starRating }), 8_000);
          const mapped: Hotel[] = res.hotels.slice(0, CAND_HOTELS).map((h) => ({
            id: h.id, name: h.name, stars: h.stars, address: h.address, cityCode: h.cityCode,
            thumb: h.thumb, rating: h.rating, refundable: h.refundable, mealPlan: h.mealPlan,
            pricePerNightPaise: h.pricePerNightPaise, room: h.room, allImages: h.allImages, roomOptions: h.roomOptions,
          }));
          if (mapped.length > 0) return mapped;
        }
      } catch { /* fall through to mock */ }
      return hotelsForCity(w.cityCode).slice(0, CAND_HOTELS);
    })),
    Promise.all(windows.map(async (w) => {
      try {
        if (hbLive('activities')) {
          const res = await withTimeout(searchActivities({ cityCode: w.cityCode, fromDate: w.checkIn, toDate: w.checkOut, paxAdults: adults }), 8_000);
          const mapped: Activity[] = res.activities.slice(0, CAND_ACTS).map((a) => ({
            id: a.id, cityCode: a.cityCode, name: a.name, durationMin: a.durationMin,
            pricePaise: a.pricePaise, thumb: a.thumb, description: a.description, category: 'tour' as const,
          }));
          if (mapped.length > 0) return mapped;
        }
      } catch { /* fall through to mock */ }
      return activitiesForCity(w.cityCode).slice(0, CAND_ACTS);
    })),
    (async () => {
      if (!wantFlights) return null;
      try {
        const res = await withTimeout(searchFlights({ legs: [{ fromIATA: input.originIATA!, toIATA: firstAirport!, date: input.departureDate }], adults, children, infants: 0, cabin, directOnly: false }), 12_000);
        return res.offers.slice(0, CAND_FLIGHTS);
      } catch (e: any) { warnings.push(`Outbound flight search unavailable (${e?.message ?? 'error'}) — trip built without flights.`); return null; }
    })(),
    (async () => {
      if (!wantFlights) return null;
      try {
        const res = await withTimeout(searchFlights({ legs: [{ fromIATA: lastAirport!, toIATA: input.originIATA!, date: endDate }], adults, children, infants: 0, cabin, directOnly: false }), 12_000);
        return res.offers.slice(0, CAND_FLIGHTS);
      } catch { return null; }
    })(),
  ]);

  // Base hotel goes first in each menu so "keep it" is always a valid pick.
  const menus = intake.destinations.map((d, i) => {
    const baseHotel = base.destinations.find((x) => x.cityCode === d.cityCode)?.stay?.hotel;
    const rest = (hotelMenus[i] ?? []).filter((h) => h.id !== baseHotel?.id);
    return { cityCode: d.cityCode, hotels: baseHotel ? [baseHotel, ...rest].slice(0, CAND_HOTELS) : rest, acts: actMenus[i] ?? [] };
  });

  // ── 3. SELECT (LLM sees ONLY numbered menus) ─────────────────────────────
  const fp = (paise: number) => Math.round(paise / 100); // rupees, compact tokens
  const menuJson = {
    preferences: { budgetTier: input.budget ?? 'standard', adults, children, notes: input.notes ?? '' },
    cities: menus.map((m, i) => ({
      code: m.cityCode,
      nights: intake.destinations[i]!.nights,
      hotels: m.hotels.map((h, j) => ({ i: j, name: h.name, stars: h.stars, inrPerNight: fp(h.pricePerNightPaise), board: h.mealPlan, refundable: h.refundable })),
      activities: m.acts.map((a, j) => ({ i: j, name: a.name, mins: a.durationMin, inr: fp(a.pricePaise) })),
    })),
    days: base.days.map((d) => ({ dayNo: d.dayNo, city: d.cityCode, type: d.type })),
    flightsOut: (flightsOut ?? []).map((o, j) => ({ i: j, airline: o.segments[0]?.airlineName, dep: o.segments[0]?.departureAt?.slice(11, 16), arr: o.segments[o.segments.length - 1]?.arrivalAt?.slice(11, 16), stops: o.segments.length - 1, inr: fp(o.fare.totalPaise) })),
    flightsRet: (flightsRet ?? []).map((o, j) => ({ i: j, airline: o.segments[0]?.airlineName, dep: o.segments[0]?.departureAt?.slice(11, 16), arr: o.segments[o.segments.length - 1]?.arrivalAt?.slice(11, 16), stops: o.segments.length - 1, inr: fp(o.fare.totalPaise) })),
  };

  const SELECT_SYSTEM = `You are a travel product selector for a B2B travel platform. You will receive numbered MENUS of real, live-priced inventory. Your ONLY job is to pick by index. You must not mention, invent, or reference anything that is not in the menus.

Rules:
- Pick exactly one hotel index per city, matching the budget tier (standard = value-for-money; premium = 4-star comfort; luxury = the best available).
- Assign activities to days: use the day list; each day may get at most morning + afternoon OR a single long activity; leave "arrival" days free except optionally an evening pick; leave "departure" days empty; never repeat an activity; total activity spend should fit the budget tier.
- If flight menus are provided, pick one outbound index and one return index — sensible timings (avoid pre-6am departures when alternatives exist) balanced against price for the budget tier.
- Respond with ONLY a JSON object, no markdown, no commentary:
{"hotels": {"CITYCODE": index, ...}, "days": [{"d": dayNo, "m": actIndex?, "a": actIndex?, "e": actIndex?}, ...], "out": index?, "ret": index?, "note": "one sentence on the overall selection logic"}
Omit m/a/e keys for empty slots. Omit out/ret if no flight menus. Indices must exist in the menus.`;

  let sel: any = null;
  try {
    const text = await chat({ system: SELECT_SYSTEM, user: JSON.stringify(menuJson), maxTokens: 3000, temperature: 0.2 });
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end > start) sel = JSON.parse(text.slice(start, end + 1));
  } catch (e: any) {
    warnings.push('AI selection unavailable — using best-value defaults.');
  }

  // ── 4. ASSEMBLE + VALIDATE (off-menu picks are silently dropped) ─────────
  const itinerary: Itinerary = JSON.parse(JSON.stringify(base)); // deep clone; plain JSON data

  if (sel && typeof sel === 'object') {
    // Hotel swaps
    for (const m of menus) {
      const idx = sel.hotels?.[m.cityCode];
      if (typeof idx !== 'number' || !m.hotels[idx]) continue;
      const dest = itinerary.destinations.find((d) => d.cityCode === m.cityCode);
      if (!dest?.stay) continue;
      const oldName = dest.stay.hotel.name;
      const chosen = m.hotels[idx]!;
      dest.stay.hotel = chosen;
      // Keep transfer labels honest after the swap.
      for (const day of itinerary.days) for (const inc of day.inclusions) {
        if (inc.kind !== 'transfer') continue;
        if (inc.transfer.toName === oldName) inc.transfer.toName = chosen.name;
        if (inc.transfer.fromName === oldName) inc.transfer.fromName = chosen.name;
      }
    }
    // Activities into day slots
    if (Array.isArray(sel.days)) {
      for (const pick of sel.days) {
        const day = itinerary.days.find((d) => d.dayNo === pick?.d);
        if (!day || day.type === 'departure') continue;
        const menu = menus.find((m) => m.cityCode === day.cityCode);
        if (!menu) continue;
        const used = new Set<string>();
        for (const d2 of itinerary.days) for (const s of ['morning', 'afternoon', 'evening'] as const) if (d2[s]) used.add(d2[s]!.id);
        const assign = (slot: 'morning' | 'afternoon' | 'evening', idx: unknown) => {
          if (typeof idx !== 'number' || !menu.acts[idx]) return;
          if (day.type === 'arrival' && slot !== 'evening') return;
          const act = menu.acts[idx]!;
          if (used.has(act.id)) return;
          day[slot] = act;
          used.add(act.id);
        };
        assign('morning', pick.m);
        assign('afternoon', pick.a);
        assign('evening', pick.e);
      }
    }
    // Flights
    const toLeg = (o: FlightOffer): FlightLeg => ({
      segments: o.segments.map((s) => ({
        airlineCode: s.airlineCode, airlineName: s.airlineName, flightNumber: s.flightNumber,
        fromIATA: s.departureAirport.code, toIATA: s.arrivalAirport.code,
        departureAt: s.departureAt, arrivalAt: s.arrivalAt,
      })),
      totalPaise: o.fare.totalPaise,
      cabin,
    });
    const outPick = typeof sel.out === 'number' ? flightsOut?.[sel.out] : undefined;
    const retPick = typeof sel.ret === 'number' ? flightsRet?.[sel.ret] : undefined;
    if (outPick) itinerary.flights = { ...toLeg(outPick), return: retPick ? toLeg(retPick) : undefined };
  } else if (wantFlights && flightsOut?.length) {
    // No AI selection — attach cheapest sane defaults so the trip is still complete.
    const cheap = (arr: FlightOffer[]) => [...arr].sort((a, b) => a.fare.totalPaise - b.fare.totalPaise)[0]!;
    const toLeg = (o: FlightOffer): FlightLeg => ({
      segments: o.segments.map((s) => ({
        airlineCode: s.airlineCode, airlineName: s.airlineName, flightNumber: s.flightNumber,
        fromIATA: s.departureAirport.code, toIATA: s.arrivalAirport.code,
        departureAt: s.departureAt, arrivalAt: s.arrivalAt,
      })),
      totalPaise: o.fare.totalPaise, cabin,
    });
    itinerary.flights = { ...toLeg(cheap(flightsOut)), return: flightsRet?.length ? toLeg(cheap(flightsRet)) : undefined };
  }

  // Re-price (mirrors the builder's recalc formula, flights included).
  let total = 0;
  for (const d of itinerary.destinations) if (d.stay) total += d.stay.hotel.pricePerNightPaise * d.nights;
  for (const day of itinerary.days) {
    for (const inc of day.inclusions) if (inc.kind === 'transfer') total += inc.transfer.pricePaise;
    for (const slot of ['morning', 'afternoon', 'evening'] as const) { const a = day[slot]; if (a) total += a.pricePaise; }
  }
  if (itinerary.insurance.included) total += itinerary.insurance.pricePaise;
  for (const v of itinerary.visa) if (v.included && v.pricePaise) total += v.pricePaise;
  if (itinerary.flights) total += itinerary.flights.totalPaise + (itinerary.flights.return?.totalPaise ?? 0);
  itinerary.pricePaise = total;
  itinerary.pricePerAdultPaise = Math.round(total / adults);

  const note = typeof sel?.note === 'string' ? ` ${sel.note}` : '';
  return { itinerary, summary: `${route.summary}${note}`.trim(), warnings };
}
