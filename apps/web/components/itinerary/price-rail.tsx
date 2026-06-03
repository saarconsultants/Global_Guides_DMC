'use client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMoney } from '@/components/providers/currency-provider';
import type { Itinerary } from '@/lib/itinerary/types';
import { Wallet, Plane, Bed, Car, Sparkles, ShieldCheck, FileText, ArrowRight } from 'lucide-react';

interface Props { itinerary: Itinerary; onSave: () => void; }

export function PriceRail({ itinerary, onSave }: Props) {
  const money = useMoney();
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
    { icon: Car,         label: 'Transfers',         paise: transferPaise,  muted: transferPaise === 0 },
    { icon: Sparkles,    label: 'Activities',        paise: activityPaise,  muted: activityPaise === 0 },
    { icon: FileText,    label: 'Visa',              paise: visaPaise,      muted: visaPaise === 0 },
    { icon: ShieldCheck, label: 'Insurance',         paise: insurancePaise, muted: insurancePaise === 0 },
  ];

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-0.5">
          <h3 className="font-display text-lg font-semibold text-navy-900">Price summary</h3>
          <Wallet className="w-4 h-4 text-[rgb(var(--text-tertiary))]" />
        </div>
        <a href="#trip-summary" className="inline-flex items-center gap-0.5 text-xs font-semibold text-crimson-700 hover:underline underline-offset-4">View full trip summary <ArrowRight className="w-3 h-3" /></a>

        <ul className="mt-4 space-y-2.5 text-sm">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center justify-between">
              <span className={`inline-flex items-center gap-2 ${r.muted ? 'text-[rgb(var(--text-tertiary))]' : 'text-[rgb(var(--text-primary))]'}`}>
                <r.icon className={`w-4 h-4 ${r.muted ? 'text-[rgb(var(--text-tertiary))]' : 'text-crimson-700/70'}`} />{r.label}
              </span>
              <span className={`font-mono tabular-nums text-xs ${r.muted ? 'text-[rgb(var(--text-tertiary))]' : 'text-navy-900 font-medium'}`}>{r.muted ? 'Not added' : money(r.paise)}</span>
            </li>
          ))}
        </ul>

        {/* Hero total block */}
        <div className="mt-4 rounded-lg bg-surface-2 border border-border-subtle p-3.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[rgb(var(--text-secondary))]">Per adult</span>
            <span className="font-mono tabular-nums text-navy-900">{money(itinerary.pricePerAdultPaise)}</span>
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-border-subtle flex items-end justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[rgb(var(--text-secondary))] font-bold">Total price</p>
              <p className="text-[10px] text-[rgb(var(--text-tertiary))]">all taxes included</p>
            </div>
            <span className="font-mono tabular-nums text-2xl font-bold text-navy-900 leading-none">{money(itinerary.pricePaise)}</span>
          </div>
        </div>

        <Button onClick={onSave} className="w-full mt-4">Save as proposal</Button>
      </CardContent>
    </Card>
  );
}
