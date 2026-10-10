'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { Check } from 'lucide-react';
import type { FlightOffer } from '@gg/tripjack';
import type { FlightLeg, CabinClass } from '@/lib/itinerary/types';

export const FLIGHT_HANDOFF_KEY = 'gg-pending-flight';
export type FlightLegKind = 'outbound' | 'return';

export function SelectFlightButton({ offer, returnTo, cabin, leg = 'outbound' }: { offer: FlightOffer; returnTo?: string; cabin: CabinClass; leg?: FlightLegKind }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  function pick() {
    const selection: FlightLeg = {
      segments: offer.segments.map((s) => ({
        airlineCode: s.airlineCode,
        airlineName: s.airlineName,
        flightNumber: s.flightNumber,
        fromIATA: s.departureAirport.code,
        toIATA: s.arrivalAirport.code,
        departureAt: s.departureAt,
        arrivalAt: s.arrivalAt,
      })),
      totalPaise: offer.fare.totalPaise,
      cabin,
    };

    if (!returnTo) {
      // Standalone search: start a new trip to this flight's destination,
      // leaving from its departure airport on its date. The flight itself is
      // added from the trip's Flights section once the trip exists.
      const first = offer.segments[0]!;
      const last = offer.segments[offer.segments.length - 1]!;
      const qs = new URLSearchParams({
        dest: last.arrivalAirport.city || last.arrivalAirport.code,
        from: first.departureAirport.code,
      });
      if (first.departureAt) qs.set('date', first.departureAt.slice(0, 10));
      setBusy(true);
      router.push(`/itinerary/new?${qs.toString()}` as any);
      return;
    }

    setBusy(true);
    try {
      sessionStorage.setItem(FLIGHT_HANDOFF_KEY, JSON.stringify({ itineraryId: returnTo, leg, selection }));
      toast.success(`${leg === 'return' ? 'Return' : 'Outbound'} flight selected`, 'Attaching to your itinerary…');
      router.push(`/itinerary/${returnTo}/customize`);
    } catch {
      setBusy(false);
      toast.error('Could not save selection', 'Your browser blocked this step. Please try again.');
    }
  }

  return (
    <Button onClick={pick} disabled={busy} className="gap-1.5 w-full mt-1">
      {busy ? <><Check className="w-4 h-4" />Selected</> : returnTo ? 'Select' : 'Plan a trip on this route'}
    </Button>
  );
}
