'use client';
import { useEffect, useRef, useState } from 'react';
import { searchCities, findCity, type CityEntry } from '@/lib/cities';
import { Pill } from '@/components/ui/pill';
import { Search, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  value: string;                                  // city code, e.g. PAR
  onChange: (code: string) => void;
  placeholder?: string;
  disabledCodes?: string[];                       // already-selected (in same form)
  className?: string;
}

export function CityCombobox({ value, onChange, placeholder = 'City…', disabledCodes = [], className }: Props) {
  const selected = findCity(value);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hi, setHi] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const results = searchCities(query, 30);

  // close on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // focus input when opened
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  function pick(c: CityEntry) {
    if (disabledCodes.includes(c.code)) return;
    onChange(c.code);
    setOpen(false);
    setQuery('');
    setHi(0);
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((i) => Math.min(results.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); const c = results[hi]; if (c) pick(c); }
    else if (e.key === 'Escape') { setOpen(false); }
  }

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-10 w-full inline-flex items-center gap-2 rounded-sm border border-border bg-surface px-3 text-sm text-left hover:border-navy-300 focus:border-crimson-500 focus:outline-none focus:ring-2 focus:ring-crimson-100 transition-colors cursor-text"
      >
        <MapPin className="w-4 h-4 text-[rgb(var(--text-tertiary))] flex-shrink-0" />
        {selected ? (
          <span className="flex-1 min-w-0">
            <span className="text-navy-900 font-medium">{selected.name}</span>
            <span className="ml-1.5 text-xs text-[rgb(var(--text-secondary))]">{selected.country}</span>
          </span>
        ) : (
          <span className="flex-1 text-[rgb(var(--text-tertiary))]">{placeholder}</span>
        )}
        {selected && <Pill variant="neutral" className="font-mono text-[10px] flex-shrink-0">{selected.code}</Pill>}
      </button>

      {open && (
        <div className="absolute z-40 mt-1 left-0 right-0 bg-surface rounded-md shadow-lg border border-border-subtle overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="relative border-b border-border-subtle">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--text-tertiary))]" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setHi(0); }}
              onKeyDown={onKey}
              placeholder="Search 100+ cities, e.g. Bali, Lisbon, Goa"
              className="w-full pl-9 pr-3 h-10 text-sm bg-transparent focus:outline-none"
            />
          </div>
          <ul role="listbox" className="max-h-72 overflow-y-auto py-1">
            {results.length === 0 && <li className="px-3 py-4 text-xs text-[rgb(var(--text-secondary))] text-center">No match. Try a different spelling.</li>}
            {results.map((c, i) => {
              const isDisabled = disabledCodes.includes(c.code) && c.code !== value;
              const isCurrent  = c.code === value;
              return (
                <li
                  key={c.code}
                  role="option"
                  aria-selected={isCurrent}
                  onMouseEnter={() => setHi(i)}
                  onClick={() => pick(c)}
                  className={cn(
                    'px-3 py-2 cursor-pointer flex items-center gap-2',
                    isDisabled && 'opacity-40 cursor-not-allowed',
                    !isDisabled && i === hi && 'bg-crimson-50',
                    isCurrent && 'font-medium',
                  )}
                >
                  <MapPin className="w-3.5 h-3.5 text-crimson-700 flex-shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="text-sm text-navy-900">{c.name}</span>
                    <span className="ml-1.5 text-xs text-[rgb(var(--text-secondary))]">{c.country}</span>
                  </span>
                  <span className="text-[10px] font-mono text-[rgb(var(--text-tertiary))]">{c.code}</span>
                  {c.supported && <Pill variant="success" className="text-[9px]">LIVE</Pill>}
                  {isCurrent && <span className="text-[10px] text-crimson-700 font-bold">✓</span>}
                </li>
              );
            })}
          </ul>
          <div className="px-3 py-2 border-t border-border-subtle text-[10px] text-[rgb(var(--text-tertiary))] flex items-center justify-between">
            <span>↑↓ navigate · Enter select · Esc close</span>
            <span><Pill variant="success" className="text-[9px]">LIVE</Pill> = we have mock inventory</span>
          </div>
        </div>
      )}
    </div>
  );
}
