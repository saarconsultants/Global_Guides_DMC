'use client';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MAX_ADULTS, MAX_CHILDREN, MAX_CHILD_AGE, MAX_ROOMS, roomsSummary } from '@/lib/hotels/occupancy';
import type { Room } from '@/lib/itinerary/types';

// A child's age stays unset until the agent picks it: hotels price by age, so a guessed default would misquote.
interface DraftRoom { adults: number; ages: Array<number | null> }

const toDraft = (rooms: Room[]): DraftRoom[] => rooms.map((r) => ({
  adults: r.adults,
  ages: Array.from({ length: r.children }, (_, i) => r.childAges?.[i] ?? null),
}));

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const btn = 'w-11 h-11 inline-flex items-center justify-center text-ink hover:bg-surface-2 disabled:text-[rgb(var(--text-tertiary))] disabled:hover:bg-transparent transition-colors';
  return (
    <div className="inline-flex items-center rounded-md border border-border divide-x divide-border">
      <button type="button" aria-label={`Fewer ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)} className={btn}><Minus className="w-4 h-4" /></button>
      <span aria-live="polite" aria-label={`${label}: ${value}`} className="w-11 text-center text-[15px] font-semibold tnum">{value}</span>
      <button type="button" aria-label={`More ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)} className={btn}><Plus className="w-4 h-4" /></button>
    </div>
  );
}

/** Rooms & guests for hotel search: adults, children and each child's age, room by room. */
export function RoomsGuestsPicker({ value, onChange }: { value: Room[]; onChange: (rooms: Room[]) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DraftRoom[]>(() => toDraft(value));
  const [showErrors, setShowErrors] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const summary = roomsSummary(value);

  const close = (refocus = false) => { setOpen(false); if (refocus) trigger.current?.focus(); };

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) close(); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const setRoom = (i: number, patch: Partial<DraftRoom>) => setDraft((d) => d.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const missingAge = draft.some((r) => r.ages.some((a) => a === null));

  function apply() {
    if (missingAge) { setShowErrors(true); return; }
    onChange(draft.map((r) => ({ adults: r.adults, children: r.ages.length, childAges: r.ages as number[] })));
    close(true);
  }

  return (
    <div ref={wrap} onKeyDown={(e) => { if (e.key === 'Escape' && open) { e.stopPropagation(); close(true); } }}>
      <button
        ref={trigger} type="button" aria-haspopup="dialog" aria-expanded={open}
        onClick={() => { if (!open) { setDraft(toDraft(value)); setShowErrors(false); } setOpen(!open); }}
        className="w-full text-left inline-flex items-start justify-between gap-2 min-h-11 lg:min-h-0"
      >
        <span className="min-w-0">
          <span className="block text-[15px] font-bold leading-tight text-ink truncate">{summary.rooms}</span>
          <span className="block mt-1 text-[12px] text-[rgb(var(--text-secondary))] truncate">{summary.guests}</span>
        </span>
        <ChevronDown aria-hidden className={`w-4 h-4 mt-0.5 shrink-0 text-navy-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div role="dialog" aria-label="Rooms and guests" className="gg-pop origin-top absolute z-40 top-full mt-1 left-0 right-0 lg:left-auto lg:w-[360px] max-w-[calc(100vw-2rem)] rounded-lg border border-border-subtle bg-surface shadow-xl">
          <div className="max-h-[min(60vh,420px)] overflow-y-auto overscroll-contain divide-y divide-dashed divide-border">
            {draft.map((r, i) => (
              <section key={i} aria-label={`Room ${i + 1}`} className="px-4 pt-3 pb-4 space-y-3">
                <div className="flex items-center justify-between min-h-8">
                  <h3 className="font-bold text-ink text-[14px]">Room {i + 1}</h3>
                  {draft.length > 1 && (
                    <button type="button" onClick={() => setDraft((d) => d.filter((_, k) => k !== i))} className="hit-area text-[13px] font-bold text-danger-500 hover:underline">Delete</button>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[14px] font-medium text-ink">Adults</span>
                  <Stepper label={`adults in room ${i + 1}`} value={r.adults} min={1} max={MAX_ADULTS} onChange={(v) => setRoom(i, { adults: v })} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[14px] font-medium text-ink">Children<span className="block text-[12px] font-normal text-[rgb(var(--text-secondary))]">0–{MAX_CHILD_AGE} years old</span></span>
                  <Stepper label={`children in room ${i + 1}`} value={r.ages.length} min={0} max={MAX_CHILDREN}
                    onChange={(v) => setRoom(i, { ages: Array.from({ length: v }, (_, k) => r.ages[k] ?? null) })} />
                </div>
                {r.ages.map((age, k) => {
                  const invalid = showErrors && age === null;
                  return (
                    <label key={k} className="flex items-center justify-between gap-3 text-[14px] font-medium text-ink">
                      Child {k + 1}
                      <select
                        value={age ?? ''} aria-invalid={invalid}
                        onChange={(e) => setRoom(i, { ages: r.ages.map((a, m) => (m === k ? parseInt(e.target.value, 10) : a)) })}
                        className={`h-11 w-[146px] rounded-md border bg-surface px-2 text-[15px] font-normal ${invalid ? 'border-danger-500' : 'border-border'}`}
                      >
                        <option value="" disabled>Select age</option>
                        <option value={0}>Under 1 yr</option>
                        {Array.from({ length: MAX_CHILD_AGE }, (_, a) => a + 1).map((a) => <option key={a} value={a}>{a} yr{a > 1 ? 's' : ''}</option>)}
                      </select>
                    </label>
                  );
                })}
              </section>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-border-subtle">
            {showErrors && missingAge && <p role="alert" className="text-xs text-danger-500 mb-2">Select each child&apos;s age. Hotels price by age.</p>}
            <div className="flex items-center justify-between gap-3">
              {draft.length < MAX_ROOMS
                ? <Button type="button" variant="secondary" size="sm" className="gap-1" onClick={() => setDraft((d) => [...d, { adults: 2, ages: [] }])}><Plus className="w-4 h-4" />Add room</Button>
                : <span className="text-xs text-[rgb(var(--text-secondary))]">{MAX_ROOMS} rooms maximum</span>}
              <Button type="button" size="sm" onClick={apply}>Apply</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
