'use client';
import { ArrowLeftRight } from 'lucide-react';
import { AirportCombobox } from './airport-combobox';
import { airportByIata } from '@/lib/airports';

/**
 * FROM / TO cell: the pass's 32px code over the airport line, with the real
 * combobox layered on top so typing, search and the keyboard still work.
 * Shared by the dashboard search and the flights hero so both print the same.
 * Declared at module scope — inside a component body it would remount on every
 * render and drop the combobox's own query and focus state.
 */
export function AirportCodeCell({ code, onPick, label, rotate }: { code: string; onPick: (v: string) => void; label: string; rotate?: boolean }) {
  const a = airportByIata(code);
  return (
    <div className="relative">
      <div className="font-mono text-[32px] font-bold leading-none tracking-[-0.02em] text-ink tnum">{code || '—'}</div>
      <div className="mt-1.5 text-[12.5px] text-[rgb(var(--text-secondary))] truncate">{a ? `${a.city} · ${a.name}` : 'Pick an airport'}</div>
      <div className="absolute inset-0 opacity-0 focus-within:opacity-100 focus-within:bg-surface transition-opacity">
        <AirportCombobox bare label={label} value={code} onChange={onPick} placeholder="City or airport" iconRotate={rotate} />
      </div>
    </div>
  );
}

/**
 * Swap control. Put it inside the FROM cell: on phones it sits on the line
 * between FROM and TO (right side); on desktop it centres on the divider.
 */
export function AirportSwapButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Swap origin and destination"
      className="absolute z-20 right-5 bottom-0 translate-y-1/2 rotate-90 lg:rotate-0 lg:right-0 lg:bottom-auto lg:top-1/2 lg:translate-x-1/2 lg:-translate-y-1/2 flex w-8 h-8 rounded-full bg-surface border border-border shadow-sm items-center justify-center text-crimson-700 hover:bg-crimson-50 transition-colors"
    >
      <ArrowLeftRight className="w-3.5 h-3.5" />
    </button>
  );
}
