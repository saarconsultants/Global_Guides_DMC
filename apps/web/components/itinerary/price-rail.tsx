'use client';
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
    <div className="rounded-lg bg-surface border border-border-subtle shadow-sm overflow-hidden">
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[16px] font-extrabold text-ink">Price summary</h3>
          <a href="#trip-summary" className="inline-flex items-center gap-0.5 text-[12px] font-bold text-crimson-700 hover:underline">Full summary <ArrowRight className="w-3 h-3" /></a>
        </div>
        <ul className="mt-3 divide-y divide-border-subtle text-[13.5px]">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center justify-between py-2">
              <span className={`inline-flex items-center gap-2 font-semibold ${r.muted ? 'text-[rgb(var(--text-tertiary))]' : 'text-ink'}`}>
                <r.icon className={`w-4 h-4 ${r.muted ? 'text-navy-200' : 'text-crimson-700'}`} />{r.label}
              </span>
              <span className={r.muted ? 'text-[12px] text-[rgb(var(--text-tertiary))]' : 'money text-ink'}>{r.muted ? 'Not added' : money(r.paise)}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="perf-x mx-4" />
      <div className="bg-ink text-white px-5 py-4">
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-white/70">Per adult</span>
          <span className="money">{money(itinerary.pricePerAdultPaise)}</span>
        </div>
        <div className="mt-2.5 pt-2.5 border-t border-white/15 flex items-end justify-between gap-3">
          <div>
            <p className="label text-amber-500">Total price</p>
            <p className="text-[11px] text-white/60 mt-0.5">all taxes included</p>
          </div>
          <span className="money text-[26px] leading-none">{money(itinerary.pricePaise)}</span>
        </div>
        <Button onClick={onSave} variant="accent" className="w-full mt-4">Save as proposal</Button>
      </div>
    </div>
  );
}
