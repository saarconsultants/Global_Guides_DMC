import type { FlightSearchResult, FlightOffer } from '@gg/tripjack';
import { Pill } from '@/components/ui/pill';
import { EmptyState } from '@/components/ui/empty-state';
import { Pass, PassMain, PassStub, Perforation } from '@/components/ui/pass';
import { getDisplayMoney } from '@/lib/money-server';
import { Plane, Luggage } from 'lucide-react';
import { SelectFlightButton, type FlightLegKind } from './select-flight-button';
import type { CabinClass } from '@/lib/itinerary/types';

export async function FlightResults({ result, returnTo, cabin, leg }: { result: FlightSearchResult; returnTo?: string; cabin: CabinClass; leg?: FlightLegKind }) {
  const { fmt } = await getDisplayMoney();
  if (!result.offers.length) {
    return <EmptyState icon={<Plane className="w-5 h-5" />} title="No fares on this route and date" body="Try the day before or after, or switch to a nearby airport." />;
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[rgb(var(--text-secondary))]"><span className="font-bold text-ink tnum">{result.offers.length}</span> fares · sorted by price</p>
        {returnTo && <Pill variant="info">Attaching {leg === 'return' ? 'return leg' : 'outbound leg'}</Pill>}
      </div>
      {result.offers.map((offer) => (
        <OfferPass key={offer.priceId} offer={offer} returnTo={returnTo} cabin={cabin} leg={leg} fmt={fmt} />
      ))}
    </div>
  );
}

function OfferPass({ offer, returnTo, cabin, leg, fmt }: { offer: FlightOffer; returnTo?: string; cabin: CabinClass; leg?: FlightLegKind; fmt: (p: number | bigint) => string }) {
  const first = offer.segments[0]!;
  const last = offer.segments[offer.segments.length - 1]!;
  const totalDuration = offer.segments.reduce((sum, s) => sum + s.durationMin, 0);
  const stops = offer.segments.length - 1;
  return (
    <Pass className="lift">
      <PassMain>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="w-8 h-8 rounded-md bg-navy-50 text-crimson-700 inline-flex items-center justify-center"><Plane className="w-4 h-4" /></span>
          <span className="font-bold text-ink text-[14px]">{first.airlineName}</span>
          <span className="font-mono text-[12px] text-[rgb(var(--text-secondary))] tnum">{offer.segments.map((s) => `${s.airlineCode} ${s.flightNumber}`).join(' · ')}</span>
          <span className="ml-auto flex items-center gap-1.5">
            {offer.refundable ? <Pill variant="success">Refundable</Pill> : <Pill>Non-refundable</Pill>}
            {first.isLcc && <Pill>LCC</Pill>}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-[1fr_minmax(120px,0.9fr)_1fr] items-center gap-4">
          <Endpoint label="Depart" when={first.departureAt} airport={first.departureAirport.code} city={first.departureAirport.city} terminal={first.departureAirport.terminal} />
          <div className="text-center">
            <div className="label">{minutesToHM(totalDuration)}</div>
            <div className="relative h-px bg-border my-2.5">
              <span className="absolute left-0 -top-[3px] w-[7px] h-[7px] rounded-full bg-ink" />
              <Plane className="absolute left-1/2 -translate-x-1/2 -top-[7px] w-3.5 h-3.5 text-crimson-700 bg-surface" />
              <span className="absolute right-0 -top-[3px] w-[7px] h-[7px] rounded-full bg-ink" />
            </div>
            <div className="text-[12px] font-semibold text-[rgb(var(--text-secondary))]">{stops === 0 ? 'Non-stop' : `${stops} stop${stops > 1 ? 's' : ''}`}</div>
          </div>
          <Endpoint label="Arrive" when={last.arrivalAt} airport={last.arrivalAirport.code} city={last.arrivalAirport.city} terminal={last.arrivalAirport.terminal} align="right" />
        </div>
        {offer.baggage && <p className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-[rgb(var(--text-secondary))]"><Luggage className="w-3.5 h-3.5" />{offer.baggage}</p>}
      </PassMain>
      <Perforation />
      <PassStub>
        <div className="label">Fare · all-in</div>
        <div className="money text-[24px] text-ink leading-none">{fmt(offer.fare.totalPaise)}</div>
        <div className="text-[12px] text-[rgb(var(--text-secondary))] mb-1">taxes included</div>
        <SelectFlightButton offer={offer} returnTo={returnTo} cabin={cabin} leg={leg} />
      </PassStub>
    </Pass>
  );
}

function Endpoint({ label, when, airport, city, terminal, align }: { label: string; when: string; airport: string; city?: string; terminal?: string; align?: 'right' }) {
  const t = when ? when.slice(11, 16) : '';
  const d = when ? new Date(when).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '';
  return (
    <div className={align === 'right' ? 'text-right' : ''}>
      <div className="label">{label}</div>
      <p className="mt-1 font-mono text-[26px] font-bold leading-none text-ink tnum">{t}</p>
      <p className="mt-1.5 text-[13.5px] font-bold text-ink">{airport}{city && <span className="text-[rgb(var(--text-secondary))] font-medium"> · {city}</span>}</p>
      <p className="text-[12px] text-[rgb(var(--text-secondary))] tnum">{d}{terminal && ` · T${terminal}`}</p>
    </div>
  );
}

function minutesToHM(m: number) {
  const h = Math.floor(m / 60); const mm = m % 60;
  return `${h}h ${mm}m`;
}
