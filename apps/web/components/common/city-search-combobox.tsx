'use client';
import { useState, useRef, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { searchSupportedCities, cityByCode, type SupportedCity } from '@/lib/supported-cities';

interface Props {
  value: string;                 // city code
  onChange: (code: string) => void;
  label: string;
  placeholder?: string;
}

// Autocomplete over the Hotelbeds-supported destinations (used by Hotels,
// Activities, and Transfers search forms). Same UX as the flight airport
// combobox; restricts to cities we have live coverage for.
export function CitySearchCombobox({ value, onChange, label, placeholder = 'Search destination' }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = cityByCode(value);
  const displayWhenClosed = selected ? `${selected.name}, ${selected.country}` : value;
  const results = searchSupportedCities(query, 8);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function pick(c: SupportedCity) {
    onChange(c.code);
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
      <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-1.5">{label}</label>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--text-tertiary))]" />
        <input
          value={open ? query : displayWhenClosed}
          onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true); }}
          onFocus={() => { setQuery(''); setOpen(true); }}
          onKeyDown={onKey}
          placeholder={placeholder}
          className="h-10 w-full rounded-sm border border-border bg-surface pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-crimson-500"
          autoComplete="off"
        />
      </div>

      {open && (
        <div className="absolute z-30 mt-1 w-full min-w-[260px] bg-surface rounded-md shadow-xl border border-border-subtle overflow-hidden max-h-72 overflow-y-auto">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-[rgb(var(--text-secondary))]">No destinations match “{query}”.</p>
          ) : results.map((c, i) => (
            <button
              key={c.code}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); pick(c); }}
              onMouseEnter={() => setActive(i)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === active ? 'bg-surface-2' : 'hover:bg-surface-2'}`}
            >
              <MapPin className="w-4 h-4 text-[rgb(var(--text-tertiary))] flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-navy-900 truncate">{c.name}</p>
                <p className="text-xs text-[rgb(var(--text-secondary))] truncate">{c.country}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
