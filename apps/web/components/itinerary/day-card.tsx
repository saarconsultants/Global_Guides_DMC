'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { useMoney } from '@/components/providers/currency-provider';
import { toast } from '@/components/ui/toast';
import type { Day, Activity } from '@/lib/itinerary/types';
import { Bed, Check, X, Plus, ChevronDown, Plane, Car } from 'lucide-react';
import { AddActivityModal } from './add-activity-modal';
import { FlightDetailsModal } from './flight-details-modal';
import { AddTransferModal } from './add-transfer-modal';
import { AddRentalModal } from './add-rental-modal';
import type { Transfer } from '@/lib/itinerary/types';

interface Props {
  day: Day;
  hotelNameForOvernight?: string;
  hotelAtlasCode?: string;            // HB-#### → #### for live transfer search
  hotelCoords?: { address?: string; latitude: number; longitude: number };  // supplier lat/lng → Leamigo
  airportCode?: string;
  airportName?: string;
  paxAdults?: number;
  paxChildren?: number;
  onSetActivity: (slot: 'morning'|'afternoon'|'evening', a: Activity | undefined) => void;
  onRemoveTransfer: (transferId: string) => void;
  onAddTransfer?: (transfer: Transfer) => void;
  onSetArrivalDetails?:   (details: { flightNumber: string; arrivalTime: string }) => void;
  onSetDepartureDetails?: (details: { flightNumber: string; departureTime: string }) => void;
  // Auto-fill values derived from the flight attached via Flights search.
  arrivalPrefill?:   { flightNumber: string; time: string };
  departurePrefill?: { flightNumber: string; time: string };
}

const heading = (d: Day) => {
  if (d.type === 'arrival')   return `Arrival in ${d.cityName}`;
  if (d.type === 'departure') return `Departure from ${d.cityName}`;
  if (d.type === 'transit')   return `Transfer from ${d.fromCityName ?? '—'} to ${d.cityName}`;
  return `Stay in ${d.cityName}`;
};

export function DayCard({ day, hotelNameForOvernight, hotelAtlasCode, hotelCoords, airportCode, airportName, paxAdults, paxChildren, onSetActivity, onRemoveTransfer, onAddTransfer, onSetArrivalDetails, onSetDepartureDetails, arrivalPrefill, departurePrefill }: Props) {
  const money = useMoney();
  const [slotOpen, setSlotOpen] = useState<'morning'|'afternoon'|'evening' | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [flightOpen, setFlightOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [rentalOpen, setRentalOpen] = useState(false);

  // Does this day already have a transfer matching its type? Arrival/departure days
  // expect an airport transfer; if it was removed, surface a re-add button.
  const expectsTransfer = day.type === 'arrival' || day.type === 'departure';
  const hasAirportTransfer = day.inclusions.some(
    (inc) => inc.kind === 'transfer' && inc.transfer.kind === day.type,
  );
  const showAddTransfer = expectsTransfer && !hasAirportTransfer && !!onAddTransfer && !!airportCode && (!!hotelAtlasCode || !!hotelCoords);

  const missing = day.type === 'arrival' && !day.arrivalDetails ? 'Arrival information is missing'
                : day.type === 'departure' && !day.departureDetails ? 'Departure information is missing'
                : null;
  const points = missing ? 2 : 0;

  const dateObj = new Date(day.date);
  const dow = dateObj.toLocaleDateString('en-GB', { weekday: 'short' });
  const dm = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

  return (
    <>
      <article className="rounded-lg bg-surface border border-border-subtle shadow-sm overflow-hidden">
        <header className="flex items-start sm:items-center gap-4 px-5 pt-4 pb-3">
          <div className="w-14 shrink-0 rounded-md bg-ink text-white text-center py-1.5">
            <div className="label text-white/60">Day</div>
            <div className="font-mono text-[20px] font-bold leading-none tnum">{String(day.dayNo).padStart(2, '0')}</div>
          </div>
          <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-1.5">
            <div className="min-w-0 flex-1">
              <p className="text-[16px] font-extrabold text-ink tracking-[-0.01em] leading-snug break-words">{heading(day)}</p>
              <p className="text-[12.5px] text-[rgb(var(--text-secondary))] tnum">{dow}, {dm} · {day.cityName}</p>
            </div>
            {points > 0 && <span className="shrink-0 self-start sm:self-auto"><Pill variant="warning">{points} points to note</Pill></span>}
          </div>
        </header>

        <div className="px-5 pb-4">
          {missing && (
            <div className="rounded-md bg-amber-50 border border-amber-100 text-amber-900 px-3.5 py-2.5 text-sm flex flex-wrap items-center justify-between gap-2 mb-3">
              <span className="font-semibold">{missing}</span>
              <Button size="sm" onClick={() => setFlightOpen(true)} className="gap-1.5">
                <Plane className="w-3.5 h-3.5" />Add {day.type === 'arrival' ? 'arrival' : 'departure'} details
              </Button>
            </div>
          )}
          {!missing && day.type === 'arrival' && day.arrivalDetails && (
            <div className="rounded-md bg-success-100 text-success-600 px-3.5 py-2.5 text-sm flex items-center justify-between mb-3">
              <span className="font-semibold inline-flex items-center gap-2"><Plane className="w-3.5 h-3.5" />Arriving on <span className="font-mono">{day.arrivalDetails.flightNumber}</span> at <span className="tnum">{day.arrivalDetails.arrivalTime}</span></span>
              <button onClick={() => setFlightOpen(true)} className="text-xs font-bold underline hover:no-underline">Edit</button>
            </div>
          )}
          {!missing && day.type === 'departure' && day.departureDetails && (
            <div className="rounded-md bg-success-100 text-success-600 px-3.5 py-2.5 text-sm flex items-center justify-between mb-3">
              <span className="font-semibold inline-flex items-center gap-2"><Plane className="w-3.5 h-3.5" />Departing on <span className="font-mono">{day.departureDetails.flightNumber}</span> at <span className="tnum">{day.departureDetails.departureTime}</span></span>
              <button onClick={() => setFlightOpen(true)} className="text-xs font-bold underline hover:no-underline">Edit</button>
            </div>
          )}

          <p className={`text-[13.5px] text-[rgb(var(--text-secondary))] leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>{day.narrative}</p>
          {day.narrative.length > 130 && (
            <button className="mt-1 text-xs font-bold text-crimson-700 hover:underline inline-flex items-center gap-1" onClick={() => setExpanded(!expanded)}>
              {expanded ? 'Show less' : 'Show more'} <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          )}

          {/* Slots: filled cells and ghost cells share one geometry. */}
          {day.type !== 'transit' && (
            <div className="grid grid-cols-3 gap-2.5 mt-4">
              {(['morning','afternoon','evening'] as const).map((s) => {
                const act = day[s];
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSlotOpen(s)}
                    className={`text-left rounded-md px-3 py-2.5 min-h-[64px] transition-colors cursor-pointer ${act ? 'border border-border-subtle bg-surface hover:border-crimson-300' : 'border-2 border-dashed border-border bg-surface-2/60 hover:border-crimson-300 hover:bg-crimson-50/40'}`}
                  >
                    <span className="label">{s}</span>
                    {act ? (
                      <span className="mt-1 block text-[13px] text-ink font-bold line-clamp-2 leading-snug">{act.name}</span>
                    ) : (
                      <span className="mt-1 block text-[13px] text-crimson-700 font-bold inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {day.inclusions.length > 0 && (
            <ul className="mt-4 divide-y divide-dashed divide-border-subtle">
              {day.inclusions.map((inc, i) => {
                if (inc.kind !== 'transfer') return null;
                const t = inc.transfer;
                return (
                  <li key={t.id + i} className="flex items-center gap-3 py-2.5 text-sm">
                    <span className="w-8 h-8 rounded-md bg-navy-50 text-navy-700 inline-flex items-center justify-center shrink-0"><Car className="w-4 h-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-ink text-[13.5px] truncate">{t.kind === 'rental' ? `Car with driver · ${t.leamigoRental?.hours ?? ''}h from ${t.fromName}` : <>{t.kind === 'arrival' ? 'Airport pickup' : t.kind === 'departure' ? 'Airport drop-off' : 'Inter-city transfer'} · {t.fromName} → {t.toName}</>}</span>
                      <span className="block text-[12px] text-[rgb(var(--text-secondary))] tnum">{t.kind === 'rental' ? `${t.leamigoRental?.vehicleName ?? 'Car'} · starts ${t.leamigoRental?.pickupTime ?? ''}` : `${vehicleLabel(t.vehicle)} · ${t.bagsAllowed} bags`}</span>
                    </span>
                    <span className="money text-[13.5px] text-ink">{money(t.pricePaise)}</span>
                    <button onClick={() => onRemoveTransfer(t.id)} className="w-7 h-7 inline-flex items-center justify-center rounded-md text-[rgb(var(--text-tertiary))] hover:text-danger-500 hover:bg-danger-100" aria-label="Remove transfer"><X className="w-4 h-4" /></button>
                  </li>
                );
              })}
            </ul>
          )}

          {hotelNameForOvernight && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold bg-surface-2 border border-border-subtle px-2.5 py-1 rounded-md text-navy-700">
              <Bed className="w-3.5 h-3.5" /> Overnight at {hotelNameForOvernight}
            </div>
          )}
        </div>

        <footer className="border-t-2 border-dashed border-border-subtle bg-surface-2/50 px-5 py-3 flex flex-wrap items-center gap-2">
          {day.type === 'stay' && (
            <Button size="sm" onClick={() => setSlotOpen('morning')} className="gap-1.5"><Plus className="w-3.5 h-3.5" />Add activity in {day.cityName}</Button>
          )}
          {day.type === 'departure' && (
            <Button size="sm" onClick={() => setFlightOpen(true)} className="gap-1.5"><Plane className="w-3.5 h-3.5" />Departure details</Button>
          )}
          {day.type === 'stay' && hotelCoords && onAddTransfer && (
            <Button size="sm" variant="secondary" onClick={() => setRentalOpen(true)} className="gap-1.5"><Car className="w-3.5 h-3.5" />Car with driver</Button>
          )}
          {showAddTransfer && (
            <Button size="sm" variant="secondary" onClick={() => setTransferOpen(true)} className="gap-1.5"><Car className="w-3.5 h-3.5" />Add {day.type === 'arrival' ? 'arrival' : 'departure'} transfer</Button>
          )}
        </footer>
      </article>

      {slotOpen && (
        <AddActivityModal
          open={!!slotOpen}
          onClose={() => setSlotOpen(null)}
          cityCode={day.cityCode}
          cityName={day.cityName}
          slot={slotOpen}
          currentId={day[slotOpen]?.id}
          onPick={(a) => onSetActivity(slotOpen!, a)}
          onClear={() => onSetActivity(slotOpen!, undefined)}
          date={day.date}
          paxAdults={paxAdults}
          paxChildren={paxChildren}
        />
      )}

      {transferOpen && (day.type === 'arrival' || day.type === 'departure') && airportCode && (hotelAtlasCode || hotelCoords) && onAddTransfer && (
        <AddTransferModal
          open={transferOpen}
          onClose={() => setTransferOpen(false)}
          kind={day.type}
          cityCode={day.cityCode}
          cityName={day.cityName}
          airportCode={airportCode}
          airportName={airportName}
          hotelAtlasCode={hotelAtlasCode}
          hotelName={hotelNameForOvernight ?? 'Hotel'}
          hotel={hotelCoords}
          pickupTime={day.type === 'arrival'
            ? (day.arrivalDetails?.arrivalTime ?? arrivalPrefill?.time)
            : pickupBeforeFlight(day.departureDetails?.departureTime ?? departurePrefill?.time)}
          pickupDate={day.date}
          adults={paxAdults ?? 2}
          children={paxChildren ?? 0}
          onPick={(t) => { onAddTransfer(t); toast.success('Transfer added', `${vehicleLabel(t.vehicle)} pickup confirmed.`); }}
        />
      )}

      {rentalOpen && hotelCoords && onAddTransfer && (
        <AddRentalModal
          open={rentalOpen}
          onClose={() => setRentalOpen(false)}
          cityName={day.cityName}
          hotelName={hotelNameForOvernight ?? 'Hotel'}
          hotel={hotelCoords}
          date={day.date}
          passengers={(paxAdults ?? 2) + (paxChildren ?? 0)}
          onPick={(t) => { onAddTransfer(t); toast.success('Car with driver added', `${t.leamigoRental?.hours}h from ${t.leamigoRental?.pickupTime}.`); }}
        />
      )}

      {flightOpen && (day.type === 'arrival' || day.type === 'departure') && (
        <FlightDetailsModal
          open={flightOpen}
          onClose={() => setFlightOpen(false)}
          kind={day.type}
          cityName={day.cityName}
          initial={
            day.type === 'arrival'
              ? (day.arrivalDetails
                  ? { flightNumber: day.arrivalDetails.flightNumber, time: day.arrivalDetails.arrivalTime }
                  : arrivalPrefill)
              : (day.departureDetails
                  ? { flightNumber: day.departureDetails.flightNumber, time: day.departureDetails.departureTime }
                  : departurePrefill)
          }
          prefilled={
            day.type === 'arrival' ? (!day.arrivalDetails && !!arrivalPrefill)
                                   : (!day.departureDetails && !!departurePrefill)
          }
          onSave={({ flightNumber, time }) => {
            if (day.type === 'arrival') {
              onSetArrivalDetails?.({ flightNumber, arrivalTime: time });
              toast.success('Arrival details saved', `Pickup will be scheduled for ${flightNumber} @ ${time}.`);
            } else {
              onSetDepartureDetails?.({ flightNumber, departureTime: time });
              toast.success('Departure details saved', `Drop-off will be scheduled for ${flightNumber} @ ${time}.`);
            }
          }}
        />
      )}
    </>
  );
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}
function vehicleLabel(v: string) {
  return v === 'PRIVATE_PREMIUM' ? 'Private Premium' : v === 'PRIVATE' ? 'Private' : 'Shared';
}

// Departure pickup: 3h before the flight, clamped to the same day.
function pickupBeforeFlight(flightHHMM?: string): string | undefined {
  const m = flightHHMM?.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return undefined;
  const mins = Math.max(0, parseInt(m[1]!, 10) * 60 + parseInt(m[2]!, 10) - 180);
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}
