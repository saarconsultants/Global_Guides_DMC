'use client';
import { useState, useRef, useEffect } from 'react';
import { Plane } from 'lucide-react';
import { searchAirports, airportByIata, type Airport } from '@/lib/airports';

interface Props {
  value: string;                 // IATA code
  onChange: (iata: string) => void;
  label: string;
  placeholder?: string;
  iconRotate?: boolean;          // rotate the plane icon (for "To")
  bare?: boolean;                // borderless input for use inside a HeroCell (label rendered by the cell)
}

// Skyscanner-style airport autocomplete. Type a city/airport/country and pick
// from the dropdown; the IATA code is what we store + send to Tripjack.
export function AirportCombobox({ value, onChange, label, placeholder = 'City or airport', iconRotate, bare }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Display text for the current value when not actively typing.
  const selected = airportByIata(value);
  const displayWhenClosed = selected ? `${selected.city} (${selected.iata})` : value;

  const results = searchAirports(query, 8);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function pick(a: Airport) {
    onChange(a.iata);
    setQuery('');
    setOpen(false);
  }

  function onKey(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (results[active]) pick(results[active]!); }
    else if (e.key === 'Escape') setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative">
      {!bare && <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-1.5">{label}</label>}
      <div className="relative">
        {!bare && <Plane className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--text-tertiary))] ${iconRotate ? 'rotate-90' : ''}`} />}
        <input
          value={open ? query : displayWhenClosed}
          onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true); }}
          onFocus={() => { setQuery(''); setOpen(true); }}
          onKeyDown={onKey}
          placeholder={placeholder}
          aria-label={bare ? label : undefined}
          className={bare
            ? 'h-7 w-full border-0 bg-transparent p-0 text-[15px] font-semibold text-ink placeholder:text-[rgb(var(--text-tertiary))] placeholder:font-medium focus:outline-none focus:ring-0'
            : 'h-10 w-full rounded-sm border border-border bg-surface pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-crimson-500'}
          autoComplete="off"
        />
      </div>

      {open && (
        <div className="absolute z-30 mt-1 w-full min-w-[280px] bg-surface rounded-md shadow-xl border border-border-subtle overflow-hidden max-h-72 overflow-y-auto">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-[rgb(var(--text-secondary))]">No airports match “{query}”.</p>
          ) : results.map((a, i) => (
            <button
              key={a.iata}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); pick(a); }}
              onMouseEnter={() => setActive(i)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === active ? 'bg-surface-2' : 'hover:bg-surface-2'}`}
            >
              <Plane className="w-4 h-4 text-[rgb(var(--text-tertiary))] flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-navy-900 truncate">{a.city} <span className="font-mono text-xs text-[rgb(var(--text-secondary))]">({a.iata})</span></p>
                <p className="text-xs text-[rgb(var(--text-secondary))] truncate">{a.name} · {a.country}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
