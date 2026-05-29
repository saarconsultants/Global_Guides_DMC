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
      toast.info('Flight noted', 'Open this search from inside an itinerary to attach it.');
      return;
    }

    setBusy(true);
    try {
      sessionStorage.setItem(FLIGHT_HANDOFF_KEY, JSON.stringify({ itineraryId: returnTo, leg, selection }));
      toast.success(`${leg === 'return' ? 'Return' : 'Outbound'} flight selected`, 'Attaching to your itinerary…');
      router.push(`/itinerary/${returnTo}/customize`);
    } catch {
      setBusy(false);
      toast.error('Could not save selection', 'Your browser blocked sessionStorage — try again.');
    }
  }

  return (
    <Button onClick={pick} disabled={busy} className="gap-1.5">
      {busy ? <><Check className="w-4 h-4" />Selected</> : 'Select'}
    </Button>
  );
}
