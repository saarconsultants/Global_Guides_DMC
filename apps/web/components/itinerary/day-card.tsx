'use client';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { formatINR } from '@/lib/utils';
import { toast } from '@/components/ui/toast';
import type { Day, Activity } from '@/lib/itinerary/types';
import { Bed, Check, X, Plus, ChevronDown, Plane } from 'lucide-react';
import { AddActivityModal } from './add-activity-modal';
import { FlightDetailsModal } from './flight-details-modal';

interface Props {
  day: Day;
  hotelNameForOvernight?: string;
  paxAdults?: number;
  paxChildren?: number;
  onSetActivity: (slot: 'morning'|'afternoon'|'evening', a: Activity | undefined) => void;
  onRemoveTransfer: (transferId: string) => void;
  onSetArrivalDetails?:   (details: { flightNumber: string; arrivalTime: string }) => void;
  onSetDepartureDetails?: (details: { flightNumber: string; departureTime: string }) => void;
}

const heading = (d: Day) => {
  if (d.type === 'arrival')   return `Arrival in ${d.cityName}`;
  if (d.type === 'departure') return `Departure from ${d.cityName}`;
  if (d.type === 'transit')   return `Transfer from ${d.fromCityName ?? '—'} to ${d.cityName}`;
  return `Stay in ${d.cityName}`;
};

export function DayCard({ day, hotelNameForOvernight, paxAdults, paxChildren, onSetActivity, onRemoveTransfer, onSetArrivalDetails, onSetDepartureDetails }: Props) {
  const [slotOpen, setSlotOpen] = useState<'morning'|'afternoon'|'evening' | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [flightOpen, setFlightOpen] = useState(false);

  const missing = day.type === 'arrival' && !day.arrivalDetails ? 'Arrival information is missing'
                : day.type === 'departure' && !day.departureDetails ? 'Departure information is missing'
                : null;
  const points = missing ? 2 : 0;

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="pt-5 pb-5">
          <header className="flex items-center justify-between mb-1">
            <h3 className="text-base font-bold text-navy-900">Day {day.dayNo}: {fmtDate(day.date)}</h3>
            {points > 0 && <Pill variant="danger">{points} Points to Note</Pill>}
          </header>
          <p className="text-sm font-semibold text-navy-700 mb-3">{heading(day)}</p>

          {missing && (
            <div className="rounded-md bg-danger-100 text-danger-500 px-3 py-2 text-sm flex items-center justify-between mb-3">
              <span className="font-medium">{missing}</span>
              <Button size="sm" variant="brick" onClick={() => setFlightOpen(true)} className="gap-1.5">
                <Plane className="w-3.5 h-3.5" />
                Update {day.type === 'arrival' ? 'Arrival' : 'Departure'} Details
              </Button>
            </div>
          )}

          {/* Filled-in flight details (after the user saves them) */}
          {!missing && day.type === 'arrival' && day.arrivalDetails && (
            <div className="rounded-md bg-success-100 text-success-500 px-3 py-2 text-sm flex items-center justify-between mb-3">
              <span className="font-medium inline-flex items-center gap-2">
                <Plane className="w-3.5 h-3.5" />
                Arriving on <span className="font-mono">{day.arrivalDetails.flightNumber}</span> at {day.arrivalDetails.arrivalTime}
              </span>
              <button onClick={() => setFlightOpen(true)} className="text-xs underline hover:no-underline">Edit</button>
            </div>
          )}
          {!missing && day.type === 'departure' && day.departureDetails && (
            <div className="rounded-md bg-success-100 text-success-500 px-3 py-2 text-sm flex items-center justify-between mb-3">
              <span className="font-medium inline-flex items-center gap-2">
                <Plane className="w-3.5 h-3.5" />
                Departing on <span className="font-mono">{day.departureDetails.flightNumber}</span> at {day.departureDetails.departureTime}
              </span>
              <button onClick={() => setFlightOpen(true)} className="text-xs underline hover:no-underline">Edit</button>
            </div>
          )}

          <p className={`text-sm text-[rgb(var(--text-secondary))] mb-4 ${expanded ? '' : 'line-clamp-2'}`}>{day.narrative}</p>
          {day.narrative.length > 130 && (
            <button className="text-xs text-crimson-700 hover:underline mb-3 inline-flex items-center gap-1" onClick={() => setExpanded(!expanded)}>
              {expanded ? 'Show less' : 'Show more'} <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          )}

          {/* Slots */}
          {day.type !== 'transit' && (
            <div className="grid grid-cols-3 gap-2 bg-surface-2 rounded-md py-3 px-3 mb-4">
              {(['morning','afternoon','evening'] as const).map((s) => {
                const act = day[s];
                return (
                  <button key={s} onClick={() => setSlotOpen(s)} className="text-left rounded-md hover:bg-white/60 px-2 py-1.5 transition-colors cursor-pointer">
                    <p className="text-[10px] uppercase tracking-widest text-[rgb(var(--text-secondary))] font-bold mb-0.5">{s}</p>
                    {act ? (
                      <span className="text-xs text-navy-900 font-medium">{act.name}</span>
                    ) : (
                      <span className="text-xs text-success-500 inline-flex items-center gap-1"><Plus className="w-3 h-3" /> Add Activity</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Inclusions */}
          {day.inclusions.length > 0 && (
            <div className="space-y-2">
              {day.inclusions.map((inc, i) => {
                if (inc.kind === 'transfer') {
                  const t = inc.transfer;
                  return (
                    <div key={t.id + i} className="flex items-start gap-2 text-sm py-1.5">
                      <Check className="w-4 h-4 text-success-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-navy-900">
                          {t.kind === 'arrival' ? 'One-way Transfer from ' : t.kind === 'departure' ? 'Airport Departure Transfer : ' : 'Inter-city Transfer from '}
                          {t.fromName}
                          {t.kind === 'departure' ? ' to ' : t.kind === 'arrival' ? ' to Hotel - ' : ' to '}
                          {t.toName}
                          {t.kind === 'arrival' ? ' - Private Premium' : ''}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <Pill variant="neutral">{vehicleLabel(t.vehicle)}</Pill>
                          <Pill variant="neutral">🧳 {t.bagsAllowed} Bags</Pill>
                          <span className="text-xs text-[rgb(var(--text-tertiary))] font-mono ml-auto">{formatINR(t.pricePaise)}</span>
                          <button onClick={() => onRemoveTransfer(t.id)} className="ml-1 text-[rgb(var(--text-tertiary))] hover:text-danger-500" aria-label="Remove transfer">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          )}

          {hotelNameForOvernight && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs bg-surface-2 px-2.5 py-1 rounded-md text-navy-700">
              <Bed className="w-3.5 h-3.5" /> Overnight stay at {hotelNameForOvernight}
            </div>
          )}

          <footer className="mt-4 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => toast.info('Coming in next release', 'You\'ll be able to swap a city or change nights on this day.')}>Change Day</Button>
            {day.type === 'stay' && (
              <Button size="sm" variant="brick" onClick={() => setSlotOpen('morning')}>Add Activity in {day.cityName}</Button>
            )}
            {day.type === 'departure' && (
              <Button size="sm" variant="brick" onClick={() => setFlightOpen(true)} className="gap-1.5">
                <Plane className="w-3.5 h-3.5" />Update Departure from {day.cityName}
              </Button>
            )}
          </footer>
        </CardContent>
      </Card>

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

      {flightOpen && (day.type === 'arrival' || day.type === 'departure') && (
        <FlightDetailsModal
          open={flightOpen}
          onClose={() => setFlightOpen(false)}
          kind={day.type}
          cityName={day.cityName}
          initial={
            day.type === 'arrival' && day.arrivalDetails
              ? { flightNumber: day.arrivalDetails.flightNumber, time: day.arrivalDetails.arrivalTime }
              : day.type === 'departure' && day.departureDetails
              ? { flightNumber: day.departureDetails.flightNumber, time: day.departureDetails.departureTime }
              : undefined
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
