import type { FlightSearchResult, FlightOffer, Segment } from '@gg/tripjack';
import { Card, CardContent } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { formatINR } from '@/lib/utils';
import { Plane, Clock, ArrowRight } from 'lucide-react';
import { SelectFlightButton, type FlightLegKind } from './select-flight-button';
import type { CabinClass } from '@/lib/itinerary/types';

export function FlightResults({ result, returnTo, cabin, leg }: { result: FlightSearchResult; returnTo?: string; cabin: CabinClass; leg?: FlightLegKind }) {
  if (!result.offers.length) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-[rgb(var(--text-secondary))]">No flights found for this route and date.</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[rgb(var(--text-secondary))]">{result.offers.length} options</p>
        {returnTo && <Pill variant="info">Attaching {leg === 'return' ? 'return leg' : 'outbound leg'} to your itinerary</Pill>}
      </div>
      {result.offers.map((offer) => (
        <OfferCard key={offer.priceId} offer={offer} returnTo={returnTo} cabin={cabin} leg={leg} />
      ))}
    </div>
  );
}

function OfferCard({ offer, returnTo, cabin, leg }: { offer: FlightOffer; returnTo?: string; cabin: CabinClass; leg?: FlightLegKind }) {
  const first = offer.segments[0]!;
  const last = offer.segments[offer.segments.length - 1]!;
  const totalDuration = offer.segments.reduce((sum, s) => sum + s.durationMin, 0);
  const stops = offer.segments.length - 1;
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-md bg-crimson-50 text-crimson-700 flex items-center justify-center">
                <Plane className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-navy-900 text-sm">{first.airlineName}</p>
                <p className="text-xs text-[rgb(var(--text-secondary))] font-mono">
                  {offer.segments.map((s) => `${s.airlineCode} ${s.flightNumber}`).join(' · ')}
                </p>
              </div>
              {offer.refundable && <Pill variant="success">Refundable</Pill>}
              {!offer.refundable && <Pill variant="warning">Non-refundable</Pill>}
              {first.isLcc && <Pill variant="neutral">LCC</Pill>}
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              <Endpoint when={first.departureAt} airport={first.departureAirport.code} city={first.departureAirport.city} terminal={first.departureAirport.terminal} />
              <div className="text-center">
                <div className="text-xs text-[rgb(var(--text-secondary))] mb-1 inline-flex items-center gap-1"><Clock className="w-3 h-3" />{minutesToHM(totalDuration)}</div>
                <div className="relative h-px bg-border my-1.5">
                  <ArrowRight className="absolute -right-1 -top-1.5 w-3 h-3 text-border" />
                </div>
                <div className="text-xs text-[rgb(var(--text-secondary))]">{stops === 0 ? 'Non-stop' : `${stops} stop${stops > 1 ? 's' : ''}`}</div>
              </div>
              <Endpoint when={last.arrivalAt} airport={last.arrivalAirport.code} city={last.arrivalAirport.city} terminal={last.arrivalAirport.terminal} align="right" />
            </div>
            {offer.baggage && <p className="mt-3 text-xs text-[rgb(var(--text-secondary))]">Baggage · {offer.baggage}</p>}
          </div>
          <div className="md:text-right md:border-l md:border-border-subtle md:pl-6">
            <p className="text-xs text-[rgb(var(--text-secondary))]">From</p>
            <p className="text-2xl font-bold text-navy-900 font-mono tabular-nums">{formatINR(offer.fare.totalPaise)}</p>
            <p className="text-xs text-[rgb(var(--text-secondary))] mb-3">All-inclusive</p>
            <SelectFlightButton offer={offer} returnTo={returnTo} cabin={cabin} leg={leg} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Endpoint({ when, airport, city, terminal, align }: { when: string; airport: string; city?: string; terminal?: string; align?: 'right' }) {
  const t = when ? when.slice(11, 16) : '';
  const d = when ? new Date(when).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '';
  return (
    <div className={align === 'right' ? 'text-right' : ''}>
      <p className="text-2xl font-bold text-navy-900 font-mono">{t}</p>
      <p className="text-sm font-semibold text-navy-700">{airport} {city && <span className="text-[rgb(var(--text-secondary))] font-normal text-xs">· {city}</span>}</p>
      <p className="text-xs text-[rgb(var(--text-secondary))]">{d}{terminal && ` · T${terminal}`}</p>
    </div>
  );
}

function minutesToHM(m: number) {
  const h = Math.floor(m / 60); const mm = m % 60;
  return `${h}h ${mm}m`;
}
