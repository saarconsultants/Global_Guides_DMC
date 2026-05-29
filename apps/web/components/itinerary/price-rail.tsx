'use client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatINR } from '@/lib/utils';
import type { Itinerary } from '@/lib/itinerary/types';
import { Wallet, Plane, Bed, MapPin, ShieldCheck, FileText } from 'lucide-react';

interface Props { itinerary: Itinerary; onSave: () => void; }

export function PriceRail({ itinerary, onSave }: Props) {
  // Breakdown components
  const flightPaise = (itinerary.flights?.totalPaise ?? 0) + (itinerary.flights?.return?.totalPaise ?? 0);
  let hotelPaise = 0; for (const d of itinerary.destinations) if (d.stay) hotelPaise += d.stay.hotel.pricePerNightPaise * d.nights;
  let transferPaise = 0; let activityPaise = 0;
  for (const day of itinerary.days) {
    for (const inc of day.inclusions) if (inc.kind === 'transfer') transferPaise += inc.transfer.pricePaise;
    for (const slot of ['morning','afternoon','evening'] as const) { const a = day[slot]; if (a) activityPaise += a.pricePaise; }
  }
  const visaPaise = itinerary.visa.reduce((s, v) => s + (v.included && v.pricePaise ? v.pricePaise : 0), 0);
  const insurancePaise = itinerary.insurance.included ? itinerary.insurance.pricePaise : 0;

  const rows: Array<{ icon: any; label: string; paise: number; muted?: boolean }> = [
    { icon: Plane,       label: 'Flights',           paise: flightPaise,    muted: flightPaise === 0 },
    { icon: Bed,         label: 'Stays',             paise: hotelPaise },
    { icon: MapPin,      label: 'Transfers',         paise: transferPaise,  muted: transferPaise === 0 },
    { icon: MapPin,      label: 'Activities',        paise: activityPaise,  muted: activityPaise === 0 },
    { icon: FileText,    label: 'Visa',              paise: visaPaise,      muted: visaPaise === 0 },
    { icon: ShieldCheck, label: 'Insurance',         paise: insurancePaise, muted: insurancePaise === 0 },
  ];

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-navy-900">Price Summary</h3>
          <Wallet className="w-4 h-4 text-[rgb(var(--text-tertiary))]" />
        </div>
        <a href="#trip-summary" className="text-xs font-semibold text-crimson-700 hover:underline underline-offset-4">Trip Summary</a>

        <ul className="mt-4 space-y-1.5 text-sm">
          {rows.map((r) => (
            <li key={r.label} className={`flex items-center justify-between ${r.muted ? 'text-[rgb(var(--text-tertiary))]' : 'text-[rgb(var(--text-primary))]'}`}>
              <span className="inline-flex items-center gap-1.5"><r.icon className="w-3.5 h-3.5" />{r.label}</span>
              <span className="font-mono tabular-nums text-xs">{r.muted ? '—' : formatINR(r.paise)}</span>
            </li>
          ))}
        </ul>

        <dl className="mt-4 pt-3 border-t border-border-subtle space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-[rgb(var(--text-secondary))]">Price per adult</dt>
            <dd className="font-mono tabular-nums text-navy-900">{formatINR(itinerary.pricePerAdultPaise)}</dd>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
            <dt className="text-[rgb(var(--text-primary))] font-semibold">Total Price</dt>
            <dd className="font-mono tabular-nums text-xl font-bold text-navy-900">{formatINR(itinerary.pricePaise)}</dd>
          </div>
        </dl>
        <Button onClick={onSave} className="w-full mt-5">Save As Proposal</Button>
      </CardContent>
    </Card>
  );
}
