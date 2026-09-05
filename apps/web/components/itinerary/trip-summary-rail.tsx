'use client';
import { Card, CardContent } from '@/components/ui/card';
import type { Itinerary } from '@/lib/itinerary/types';

export function TripSummaryRail({ itinerary }: { itinerary: Itinerary }) {
  return (
    <Card id="trip-summary">
      <CardContent className="pt-5 space-y-4 text-[13.5px]">
        <h3 className="text-[16px] font-extrabold text-ink">Trip summary</h3>
        {itinerary.flights && (
          <div>
            <p className="font-bold text-ink">Flights</p>

            <p className="label mt-2">Outbound</p>
            <ul className="mt-1 list-disc list-outside ml-5 text-sm text-[rgb(var(--text-primary))] marker:text-[rgb(var(--text-tertiary))] space-y-1.5">
              {itinerary.flights.segments.map((s, i) => (
                <li key={'o' + i}>
                  <span className="font-medium">{s.airlineName}</span> <span className="font-mono text-xs text-[rgb(var(--text-secondary))]">{s.airlineCode} {s.flightNumber}</span>
                  <ul className="list-disc ml-5 marker:text-[rgb(var(--text-tertiary))] text-[rgb(var(--text-secondary))]">
                    <li>{s.fromIATA} {s.departureAt.slice(11, 16)} → {s.toIATA} {s.arrivalAt.slice(11, 16)}</li>
                  </ul>
                </li>
              ))}
            </ul>

            {itinerary.flights.return && (
              <>
                <p className="label mt-3">Return</p>
                <ul className="mt-1 list-disc list-outside ml-5 text-sm text-[rgb(var(--text-primary))] marker:text-[rgb(var(--text-tertiary))] space-y-1.5">
                  {itinerary.flights.return.segments.map((s, i) => (
                    <li key={'r' + i}>
                      <span className="font-medium">{s.airlineName}</span> <span className="font-mono text-xs text-[rgb(var(--text-secondary))]">{s.airlineCode} {s.flightNumber}</span>
                      <ul className="list-disc ml-5 marker:text-[rgb(var(--text-tertiary))] text-[rgb(var(--text-secondary))]">
                        <li>{s.fromIATA} {s.departureAt.slice(11, 16)} → {s.toIATA} {s.arrivalAt.slice(11, 16)}</li>
                      </ul>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <p className="text-xs text-[rgb(var(--text-secondary))] mt-2">Cabin: {itinerary.flights.cabin}</p>
          </div>
        )}
        {itinerary.destinations.map((d) => {
          if (!d.stay) return null;
          const arrival = itinerary.days.find((x) => x.cityCode === d.cityCode && x.inclusions.some((i) => i.kind === 'transfer' && (i.transfer.kind === 'arrival' || i.transfer.kind === 'inter-city')));
          const departure = itinerary.days.find((x) => x.cityCode === d.cityCode && x.inclusions.some((i) => i.kind === 'transfer' && i.transfer.kind === 'departure'));
          return (
            <div key={d.cityCode}>
              <p className="font-bold text-ink">{d.cityName}</p>
              <ul className="mt-1.5 list-disc list-outside ml-5 text-sm text-[rgb(var(--text-primary))] marker:text-[rgb(var(--text-tertiary))] space-y-1.5">
                <li>{d.nights} night{d.nights !== 1 ? 's' : ''} in {d.cityName}</li>
                <li>Stay at <span className="font-medium">{d.stay.hotel.name}</span> ({d.stay.hotel.stars} star)
                  <ul className="list-disc ml-5 marker:text-[rgb(var(--text-tertiary))] text-[rgb(var(--text-secondary))]">
                    <li>{d.stay.hotel.mealPlan}</li>
                  </ul>
                </li>
                {arrival?.inclusions
                  .filter((i) => i.kind === 'transfer')
                  .map((i, idx) => (i.kind === 'transfer' ? (<li key={idx}>{i.transfer.kind === 'arrival' ? 'One-way Transfer from ' : 'Inter-city Transfer from '}{i.transfer.fromName} {i.transfer.kind === 'arrival' ? 'to Hotel' : `to ${d.cityName}`} - {vehicleLabel(i.transfer.vehicle)}</li>) : null))}
                {departure?.inclusions
                  .filter((i) => i.kind === 'transfer' && i.transfer.kind === 'departure')
                  .map((i, idx) => (i.kind === 'transfer' ? (<li key={idx}>Airport Departure Transfer: Hotel ({d.cityName}) to {i.transfer.toName} - {vehicleLabel(i.transfer.vehicle)}</li>) : null))}
              </ul>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function vehicleLabel(v: string) {
  return v === 'PRIVATE_PREMIUM' ? 'Private Premium' : v === 'PRIVATE' ? 'Private' : 'Shared';
}
