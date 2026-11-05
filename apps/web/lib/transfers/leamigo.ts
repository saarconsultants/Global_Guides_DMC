// Bridge between the Leamigo adapter and the itinerary's Transfer model.
// Server-only. Leamigo quotes point-to-point by coordinates, so a leg is
// quotable only when BOTH ends have verified coordinates: airports from
// lib/airport-coords (OurAirports), hotels from the supplier's own lat/lng.

import { searchTransfers, isLive, leamigoCityPoint, type LeamigoTransfer } from '@gg/leamigo';
import { cityInfo } from '@/lib/itinerary/mock-inventory';
import { cancellationRulesText } from '@/lib/activities/format';
import type { Transfer, TransferVehicle, LeamigoLeg } from '@/lib/itinerary/types';

export { isLive as leamigoIsLive };

export interface PlacePoint { address: string; latitude: number; longitude: number }

/** A hotel as a pickup/drop-off point — null unless the supplier gave coordinates. */
export function hotelPoint(h?: { name: string; address?: string; latitude?: number; longitude?: number } | null): PlacePoint | null {
  if (!h || typeof h.latitude !== 'number' || typeof h.longitude !== 'number') return null;
  if (!Number.isFinite(h.latitude) || !Number.isFinite(h.longitude)) return null;
  return { address: h.address ? `${h.name}, ${h.address}` : h.name, latitude: h.latitude, longitude: h.longitude };
}

/** The city centre as a pickup/drop-off point — used when there's no hotel to go by. */
export async function cityPoint(cityCode?: string): Promise<PlacePoint | null> {
  if (!cityCode) return null;
  const c = cityInfo(cityCode);
  return leamigoCityPoint(c.name, c.countryCode).catch(() => null);
}

/** Default pickup times when no flight time is known. */
export const DEFAULT_PICKUP = { arrival: '12:00', departure: '10:00', 'inter-city': '10:00', rental: '09:00' } as const;

/** The supplier's own wording, followed by its fee rules in words. */
export function cancellationText(c: { description?: string; rules: Array<{ hoursBefore: number; chargePct: number }> }): string | undefined {
  return [c.description?.trim(), cancellationRulesText(c.rules)].filter(Boolean).join('. ') || undefined;
}

const PREMIUM_VEHICLE = /premium|luxury|executive|business|vip|limo/i;

function vehicleOf(t: LeamigoTransfer): TransferVehicle {
  if (t.shared) return 'SHARED';
  // The flag alone misses vehicles Leamigo only names as premium ("Premium Car").
  if (t.luxury || PREMIUM_VEHICLE.test(`${t.vehicleName} ${t.vehicleCategory ?? ''}`)) return 'PRIVATE_PREMIUM';
  return 'PRIVATE';
}

export function leamigoToTransfer(t: LeamigoTransfer, ctx: { kind: Transfer['kind']; fromName: string; toName: string; returnTrip?: boolean; leg?: Omit<LeamigoLeg, 'providerId' | 'vehicleName' | 'shared' | 'luxury'> }): Transfer {
  const extras = [t.flags.meetAndGreet && 'meet & greet', t.flags.freeCancellation && 'free cancellation'].filter(Boolean);
  return {
    id: t.id,
    kind: ctx.kind,
    fromName: ctx.fromName,
    toName: ctx.toName,
    vehicle: vehicleOf(t),
    bagsAllowed: t.maxLuggage,
    pricePaise: t.pricePaise,
    description: [`Leamigo · ${t.vehicleName}`, `up to ${t.maxPax} passengers`, ...extras].join(' · '),
    supplierInfo: {
      operator: t.provider, vehicleName: t.vehicleName, models: t.vehicleModels, photo: t.vehicleImg,
      maxPassengers: t.maxPax, maxLuggage: t.maxLuggage, freeWaitMin: t.freeWaitMin,
      features: [
        t.flags.instantConfirmation && 'Instant confirmation', t.flags.freeCancellation && 'Free cancellation',
        t.flags.meetAndGreet && 'Meet & greet', t.flags.driverDetails && 'Driver details provided',
        t.flags.childSeat && 'Child seat available', t.flags.amendable && 'Can be amended',
        ctx.returnTrip && 'Return trip: price covers both legs', t.flags.roundTripOnly && 'Only sold as a return trip',
      ].filter(Boolean) as string[],
      cancellation: cancellationText(t.cancellation),
      category: t.vehicleCategory, distanceKm: t.distanceKm, taxesPaise: t.taxesPaise, extras: t.addons, policies: t.policies,
    },
    ...(ctx.leg ? { leamigo: { ...ctx.leg, providerId: t.providerId, vehicleName: t.vehicleName, shared: t.shared, luxury: t.luxury } } : {}),
  };
}

const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('Leamigo timed out')), ms))]);

/** Quote one leg. Never throws — failures come back as a warning. */
export async function quoteLeamigoLeg(args: {
  kind: Transfer['kind'];
  from: PlacePoint; to: PlacePoint;
  fromName: string; toName: string;
  pickupDate: string; pickupTime?: string;
  passengers: number;
  timeoutMs?: number;
  /** Both set: search as a return journey, which also finds routes only sold as a round trip. */
  returnDate?: string; returnTime?: string;
}): Promise<{ transfers: Transfer[]; live: boolean; warning?: string }> {
  if (!isLive()) return { transfers: [], live: false };
  const leg = {
    from: args.from, to: args.to, passengers: Math.max(1, args.passengers),
    pickupDate: args.pickupDate, pickupTime: args.pickupTime ?? DEFAULT_PICKUP[args.kind],
  };
  try {
    const res = await withTimeout(searchTransfers({
      pickup: leg.from,
      destination: leg.to,
      passengers: leg.passengers,
      pickupDate: leg.pickupDate,
      pickupTime: leg.pickupTime,
      ...(args.returnDate && args.returnTime ? { returnDate: args.returnDate, returnTime: args.returnTime } : {}),
    }), args.timeoutMs ?? 9_000);
    const returnTrip = !!(args.returnDate && args.returnTime);
    return {
      // A return quote isn't one leg of a trip, so it carries no booking leg: it's for browsing and quoting.
      transfers: res.transfers.map((t) => leamigoToTransfer(t, { ...args, returnTrip, leg: returnTrip ? undefined : leg })),
      live: res.source === 'live',
      warning: res.warning,
    };
  } catch (e: any) {
    return { transfers: [], live: true, warning: `Leamigo: ${e?.message ?? 'search failed'}` };
  }
}

/** Cheapest private option; cheapest overall if there is no private one. */
export function pickDefault(all: Transfer[]): Transfer | undefined {
  const priv = all.filter((t) => t.vehicle !== 'SHARED');
  return [...(priv.length ? priv : all)].sort((a, b) => a.pricePaise - b.pricePaise)[0];
}
