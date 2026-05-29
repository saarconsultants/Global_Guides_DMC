'use client';
// In-memory itinerary store (Zustand). Will be replaced with Postgres persistence in task C.

import { create } from 'zustand';
import type { Itinerary, Hotel, Activity, FlightSelection, FlightLeg } from './types';

interface ItineraryStoreState {
  byId: Record<string, Itinerary>;
  upsert: (it: Itinerary) => void;
  get: (id: string) => Itinerary | undefined;
  changeHotel: (id: string, cityCode: string, hotel: Hotel) => void;
  setFlight: (id: string, flight: FlightSelection | undefined) => void;
  setReturnFlight: (id: string, leg: FlightLeg | undefined) => void;
  setActivity: (id: string, dayNo: number, slot: 'morning'|'afternoon'|'evening', activity: Activity | undefined) => void;
  removeInclusion: (id: string, dayNo: number, transferId: string) => void;
  toggleVisa: (id: string, countryCode: string, included: boolean) => void;
  toggleInsurance: (id: string, included: boolean) => void;
  setArrivalDetails: (id: string, dayNo: number, details: { flightNumber: string; arrivalTime: string }) => void;
  setDepartureDetails: (id: string, dayNo: number, details: { flightNumber: string; departureTime: string }) => void;
}

export const useItineraryStore = create<ItineraryStoreState>((set, get) => ({
  byId: {},
  upsert: (it) => set((s) => ({ byId: { ...s.byId, [it.id]: it } })),
  get: (id) => get().byId[id],

  setFlight: (id, flight) =>
    set((s) => {
      const cur = s.byId[id]; if (!cur) return s;
      // Preserve any existing return leg when replacing the outbound,
      // since outbound and return are selected independently.
      const next: Itinerary = { ...cur, flights: flight ? { ...flight, return: flight.return ?? cur.flights?.return } : undefined };
      next.pricePaise = recalcPrice(next);
      next.pricePerAdultPaise = recalcPerAdult(next);
      return { byId: { ...s.byId, [id]: next } };
    }),

  setReturnFlight: (id, leg) =>
    set((s) => {
      const cur = s.byId[id]; if (!cur) return s;
      if (!cur.flights) {
        // No outbound yet — can't attach a return alone. Caller should ensure outbound first.
        return s;
      }
      const next: Itinerary = { ...cur, flights: { ...cur.flights, return: leg } };
      next.pricePaise = recalcPrice(next);
      next.pricePerAdultPaise = recalcPerAdult(next);
      return { byId: { ...s.byId, [id]: next } };
    }),

  changeHotel: (id, cityCode, hotel) =>
    set((s) => {
      const cur = s.byId[id]; if (!cur) return s;
      const next: Itinerary = { ...cur };
      next.destinations = cur.destinations.map((d) => {
        if (d.cityCode !== cityCode || !d.stay) return d;
        const ci = new Date(d.stay.checkIn); const co = new Date(d.stay.checkOut);
        return { ...d, stay: { hotel, checkIn: ci.toISOString(), checkOut: co.toISOString() } };
      });
      next.days = cur.days.map((day) =>
        day.cityCode === cityCode ? { ...day, overnightAtHotelId: hotel.id, inclusions: day.inclusions.map((i) => i.kind === 'transfer' && i.transfer.kind === 'arrival' ? { kind: 'transfer', transfer: { ...i.transfer, toName: hotel.name } } : i.kind === 'transfer' && i.transfer.kind === 'departure' ? { kind: 'transfer', transfer: { ...i.transfer, fromName: hotel.name } } : i) } : day,
      );
      next.pricePaise = recalcPrice(next);
      next.pricePerAdultPaise = recalcPerAdult(next);
      return { byId: { ...s.byId, [id]: next } };
    }),

  setActivity: (id, dayNo, slot, activity) =>
    set((s) => {
      const cur = s.byId[id]; if (!cur) return s;
      const next: Itinerary = {
        ...cur,
        days: cur.days.map((d) => (d.dayNo === dayNo ? { ...d, [slot]: activity } : d)),
      };
      next.pricePaise = recalcPrice(next);
      next.pricePerAdultPaise = recalcPerAdult(next);
      return { byId: { ...s.byId, [id]: next } };
    }),

  removeInclusion: (id, dayNo, transferId) =>
    set((s) => {
      const cur = s.byId[id]; if (!cur) return s;
      const next: Itinerary = {
        ...cur,
        days: cur.days.map((d) => (d.dayNo === dayNo ? { ...d, inclusions: d.inclusions.filter((i) => i.kind !== 'transfer' || i.transfer.id !== transferId) } : d)),
      };
      next.pricePaise = recalcPrice(next);
      next.pricePerAdultPaise = recalcPerAdult(next);
      return { byId: { ...s.byId, [id]: next } };
    }),

  toggleVisa: (id, countryCode, included) =>
    set((s) => {
      const cur = s.byId[id]; if (!cur) return s;
      return { byId: { ...s.byId, [id]: { ...cur, visa: cur.visa.map((v) => v.countryCode === countryCode ? { ...v, included } : v) } } };
    }),

  toggleInsurance: (id, included) =>
    set((s) => {
      const cur = s.byId[id]; if (!cur) return s;
      const next = { ...cur, insurance: { ...cur.insurance, included, pricePaise: included ? 250000 : 0 } };
      next.pricePaise = recalcPrice(next);
      next.pricePerAdultPaise = recalcPerAdult(next);
      return { byId: { ...s.byId, [id]: next } };
    }),

  setArrivalDetails: (id, dayNo, details) =>
    set((s) => {
      const cur = s.byId[id]; if (!cur) return s;
      return { byId: { ...s.byId, [id]: { ...cur, days: cur.days.map((d) => d.dayNo === dayNo ? { ...d, arrivalDetails: details } : d) } } };
    }),

  setDepartureDetails: (id, dayNo, details) =>
    set((s) => {
      const cur = s.byId[id]; if (!cur) return s;
      return { byId: { ...s.byId, [id]: { ...cur, days: cur.days.map((d) => d.dayNo === dayNo ? { ...d, departureDetails: details } : d) } } };
    }),
}));

function recalcPrice(it: Itinerary): number {
  let total = 0;
  for (const d of it.destinations) if (d.stay) total += d.stay.hotel.pricePerNightPaise * d.nights;
  for (const day of it.days) {
    for (const inc of day.inclusions) if (inc.kind === 'transfer') total += inc.transfer.pricePaise;
    for (const slot of ['morning','afternoon','evening'] as const) {
      const act = day[slot]; if (act) total += act.pricePaise;
    }
  }
  if (it.insurance.included) total += it.insurance.pricePaise;
  for (const v of it.visa) if (v.included && v.pricePaise) total += v.pricePaise;
  if (it.flights) {
    total += it.flights.totalPaise;
    if (it.flights.return) total += it.flights.return.totalPaise;
  }
  return total;
}

function recalcPerAdult(it: Itinerary): number {
  const adults = it.intake.rooms.reduce((s, r) => s + r.adults, 0) || 1;
  return Math.round(it.pricePaise / adults);
}
