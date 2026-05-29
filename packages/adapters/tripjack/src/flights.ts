import { tjPost, isLive } from './client';
import type { FlightSearchInput, FlightSearchResult, FlightOffer, Segment } from './types';
import flightFixture from '../fixtures/flight-search.json';

// Path INFERRED — verify with Tripjack support before going live.
const SEARCH_PATH = '/fms/v1/air-search-all';

// Simple in-process cache to dedupe Tripjack calls (React strict mode dev double-renders
// + repeated searches eat your rate-limit quota fast). Survives only the Node process.
const CACHE_TTL_MS = 90_000;
const cache = new Map<string, { at: number; result: FlightSearchResult }>();
const inflight = new Map<string, Promise<FlightSearchResult>>();

function cacheKey(input: FlightSearchInput): string {
  return JSON.stringify({
    l: input.legs.map((x) => `${x.fromIATA}>${x.toIATA}@${x.date}`),
    a: input.adults, c: input.children, i: input.infants,
    cb: input.cabin, d: input.directOnly ? 1 : 0,
    pa: (input.preferredAirlines ?? []).sort(),
  });
}

export async function searchFlights(input: FlightSearchInput): Promise<FlightSearchResult> {
  if (!isLive()) return mockResult(input);

  const key = cacheKey(input);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return hit.result;
  }
  // Dedupe concurrent identical requests (the strict-mode double render problem)
  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = (async () => {
    const body = {
      searchQuery: {
        cabinClass: input.cabin,
        preferredAirline: input.preferredAirlines ?? [],
        searchModifiers: {
          pfts: ['REGULAR'],
          isDirectFlight: input.directOnly ?? false,
          isConnectingFlight: false,
        },
        routeInfos: input.legs.map((l) => ({
          fromCityOrAirport: { code: l.fromIATA.toUpperCase() },
          toCityOrAirport: { code: l.toIATA.toUpperCase() },
          travelDate: l.date,
        })),
        paxInfo: { ADULT: input.adults, CHILD: input.children, INFANT: input.infants },
      },
    };
    const raw = await tjPost<any>(SEARCH_PATH, body);
    const result = normalise(raw);
    cache.set(key, { at: Date.now(), result });
    return result;
  })();
  inflight.set(key, promise);
  try { return await promise; } finally { inflight.delete(key); }
}

function mockResult(input: FlightSearchInput): FlightSearchResult {
  // Use baked fixture but swap the route codes so the UI looks accurate.
  const fx = JSON.parse(JSON.stringify(flightFixture)) as FlightSearchResult;
  fx.offers.forEach((o) => {
    o.segments.forEach((s, i) => {
      const leg = input.legs[0]!;
      s.departureAirport = { ...s.departureAirport, code: leg.fromIATA };
      s.arrivalAirport = { ...s.arrivalAirport, code: leg.toIATA };
    });
  });
  fx.source = 'mock';
  fx.searchedAt = new Date().toISOString();
  return fx;
}

function normalise(raw: any): FlightSearchResult {
  // Built from a real Tripjack v1 air-search-all response (2026-05).
  // Tripjack's flight-search uses `aI` for airline (note: post-booking docs use `al` — inconsistent across their APIs).
  const offers: FlightOffer[] = [];
  const tripInfos: any[] = raw?.searchResult?.tripInfos?.ONWARD ?? raw?.tripInfos ?? [];
  for (const t of tripInfos) {
    const sis: any[] = t?.sI ?? [];
    const segments: Segment[] = sis.map((s) => ({
      id: String(s.id),
      airlineCode: s?.fD?.aI?.code ?? s?.fD?.al?.code ?? '',
      airlineName: s?.fD?.aI?.name ?? s?.fD?.al?.name ?? '',
      isLcc: !!(s?.fD?.aI?.isLcc ?? s?.fD?.al?.isLcc),
      flightNumber: s?.fD?.fN ?? '',
      equipment: s?.fD?.eT,
      departureAirport: s?.da ?? { code: '' },
      arrivalAirport: s?.aa ?? { code: '' },
      departureAt: s?.dt ?? '',
      arrivalAt: s?.at ?? '',
      durationMin: Number(s?.duration ?? 0),
    }));
    const tp = t?.totalPriceList?.[0];
    const fc = tp?.fd?.ADULT?.fC ?? {};
    const total = Number(fc.TF ?? 0);
    const base = Number(fc.BF ?? 0);
    const bI = tp?.fd?.ADULT?.bI ?? {};
    const checkInBag = bI?.iB ? String(bI.iB) : undefined;
    const cabinBag = bI?.cB ? String(bI.cB) : undefined;
    const baggage = [checkInBag && `Check-in ${checkInBag}`, cabinBag && `Cabin ${cabinBag}`].filter(Boolean).join(' · ') || undefined;
    const cabin = (tp?.fd?.ADULT?.cc as any) ?? 'ECONOMY';
    const fareId: string = tp?.fareIdentifier ?? 'REGULAR';
    offers.push({
      priceId: tp?.id ?? '',
      segments,
      refundable: /REFUNDABLE/i.test(fareId) || tp?.fd?.ADULT?.rT === 1,
      cabin,
      fareType: fareId,
      baggage,
      fare: {
        baseFarePaise: Math.round(base * 100),
        taxesPaise: Math.round((total - base) * 100),
        totalPaise: Math.round(total * 100),
        currency: 'INR',
      },
    });
  }
  return { searchedAt: new Date().toISOString(), offers, source: 'live' };
}
