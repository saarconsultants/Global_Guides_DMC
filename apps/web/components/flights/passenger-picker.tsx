'use client';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MAX_SEATS = 9;
const CABINS = [['ECONOMY', 'Economy'], ['PREMIUM_ECONOMY', 'Premium Economy'], ['BUSINESS', 'Business'], ['FIRST', 'First']] as const;

export interface Passengers { adults: number; children: number; infants: number; cabin: string }

function Row({ label, hint, value, min, max, onChange }: { label: string; hint: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const btn = 'w-11 h-11 inline-flex items-center justify-center text-ink hover:bg-surface-2 disabled:text-[rgb(var(--text-tertiary))] disabled:hover:bg-transparent transition-colors';
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[14px] font-medium text-ink">{label}<span className="block text-[12px] font-normal text-[rgb(var(--text-secondary))]">{hint}</span></span>
      <div className="inline-flex items-center rounded-md border border-border divide-x divide-border">
        <button type="button" aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)} className={btn}><Minus className="w-4 h-4" /></button>
        <span aria-live="polite" className="w-11 text-center text-[15px] font-semibold tnum">{value}</span>
        <button type="button" aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + 1)} className={btn}><Plus className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

/** Passengers and cabin for flight search. Airlines seat at most 9, with one infant per adult. */
export function PassengerPicker({ value, onChange }: { value: Passengers; onChange: (p: Passengers) => void }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const { adults, children, infants, cabin } = value;
  const total = adults + children + infants;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div ref={wrap} onKeyDown={(e) => { if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false); } }}>
      <button type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(!open)} className="w-full text-left inline-flex items-start justify-between gap-2 min-h-11 lg:min-h-0">
        <span className="min-w-0">
          <span className="block text-[15px] font-bold leading-tight text-ink truncate">{total} Passenger{total !== 1 ? 's' : ''}</span>
          <span className="block mt-1 text-[12px] text-[rgb(var(--text-secondary))] truncate">{CABINS.find(([c]) => c === cabin)?.[1] ?? 'Economy'}</span>
        </span>
        <ChevronDown aria-hidden className={`w-4 h-4 mt-0.5 shrink-0 text-navy-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="dialog" aria-label="Passengers and cabin" className="gg-pop origin-top absolute z-40 top-full mt-1 left-0 right-0 lg:left-auto lg:w-[340px] max-w-[calc(100vw-2rem)] rounded-lg border border-border-subtle bg-surface shadow-xl p-4 space-y-3">
          <Row label="Adults" hint="12 years and over" value={adults} min={1} max={MAX_SEATS - children}
            onChange={(v) => onChange({ ...value, adults: v, infants: Math.min(infants, v) })} />
          <Row label="Children" hint="2 to 11 years" value={children} min={0} max={MAX_SEATS - adults} onChange={(v) => onChange({ ...value, children: v })} />
          <Row label="Infants" hint="Under 2, on a lap" value={infants} min={0} max={adults} onChange={(v) => onChange({ ...value, infants: v })} />
          <label className="block text-[14px] font-medium text-ink">Cabin
            <select value={cabin} onChange={(e) => onChange({ ...value, cabin: e.target.value })} className="control mt-1">
              {CABINS.map(([c, name]) => <option key={c} value={c}>{name}</option>)}
            </select>
          </label>
          <div className="flex justify-end"><Button type="button" size="sm" onClick={() => setOpen(false)}>Done</Button></div>
        </div>
      )}
    </div>
  );
}
