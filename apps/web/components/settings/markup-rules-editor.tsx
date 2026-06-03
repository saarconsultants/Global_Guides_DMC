'use client';
import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, MapPin, X, CalendarRange, Percent } from 'lucide-react';
import { searchSupportedCities, cityByCode, type SupportedCity } from '@/lib/supported-cities';
import type { MarkupRule } from '@/lib/markup';

interface Props {
  initial: MarkupRule[];
  defaultPct: number;
}

let _seq = 0;
function newId() {
  _seq += 1;
  return `r${_seq}-${initialSeed()}`;
}
// Avoid Date.now()/Math.random() at module scope; seed from a counter + perf hint.
function initialSeed() {
  return (typeof performance !== 'undefined' ? Math.floor(performance.now()) : 0).toString(36);
}

export function MarkupRulesEditor({ initial, defaultPct }: Props) {
  const [rules, setRules] = useState<MarkupRule[]>(initial);

  function update(id: string, patch: Partial<MarkupRule>) {
    setRules((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function remove(id: string) {
    setRules((rs) => rs.filter((r) => r.id !== id));
  }
  function add() {
    setRules((rs) => [...rs, { id: newId(), label: '', destinations: [], markupPct: defaultPct }]);
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name="markupRules" value={JSON.stringify(rules)} />

      {rules.length === 0 && (
        <p className="text-xs text-[rgb(var(--text-secondary))] rounded-md border border-dashed border-border-subtle px-3 py-4 text-center">
          No destination or season rules yet. The default markup applies to every trip.
        </p>
      )}

      {rules.map((rule) => (
        <div key={rule.id} className="rounded-md border border-border-subtle p-3 space-y-3 bg-surface-2/40">
          <div className="flex items-center gap-2">
            <input
              value={rule.label ?? ''}
              onChange={(e) => update(rule.id, { label: e.target.value })}
              placeholder="Rule name (e.g. Maldives peak season)"
              className="flex-1 h-9 rounded-sm border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-crimson-500"
            />
            <button type="button" onClick={() => remove(rule.id)} aria-label="Remove rule" className="w-9 h-9 inline-flex items-center justify-center rounded-md text-danger-500 hover:bg-danger-100">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <DestinationPicker
            codes={rule.destinations}
            onChange={(destinations) => update(rule.id, { destinations })}
          />

          <div className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
            <div>
              <label className="block text-[11px] font-medium text-[rgb(var(--text-secondary))] mb-1 inline-flex items-center gap-1"><CalendarRange className="w-3 h-3" />Travel from</label>
              <input type="date" value={rule.start ?? ''} onChange={(e) => update(rule.id, { start: e.target.value || undefined })}
                className="h-9 w-full rounded-sm border border-border bg-surface px-2 text-sm" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[rgb(var(--text-secondary))] mb-1">Travel to</label>
              <input type="date" value={rule.end ?? ''} onChange={(e) => update(rule.id, { end: e.target.value || undefined })}
                className="h-9 w-full rounded-sm border border-border bg-surface px-2 text-sm" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[rgb(var(--text-secondary))] mb-1 inline-flex items-center gap-1"><Percent className="w-3 h-3" />Markup</label>
              <div className="flex items-center gap-1">
                <input type="number" min={0} max={100} step={0.5} value={rule.markupPct}
                  onChange={(e) => update(rule.id, { markupPct: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)) })}
                  className="h-9 w-20 rounded-sm border border-border bg-surface px-2 text-sm" />
                <span className="text-sm text-[rgb(var(--text-secondary))]">%</span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-[rgb(var(--text-tertiary))]">
            {ruleSummary(rule, defaultPct)}
          </p>
        </div>
      ))}

      <button type="button" onClick={add} className="inline-flex items-center gap-1.5 text-sm font-medium text-crimson-700 hover:underline">
        <Plus className="w-4 h-4" /> Add destination / season rule
      </button>
    </div>
  );
}

function ruleSummary(rule: MarkupRule, defaultPct: number): string {
  const where = rule.destinations.length
    ? rule.destinations.map((c) => cityByCode(c)?.name ?? c).join(', ')
    : 'any destination';
  const when = rule.start || rule.end ? ` travelling ${rule.start || '…'} → ${rule.end || '…'}` : ' (any date)';
  return `Trips to ${where}${when} are marked up ${rule.markupPct}% instead of the ${defaultPct}% default.`;
}

// ── Multi-city chip picker, backed by the supported-cities list ─────────────
function DestinationPicker({ codes, onChange }: { codes: string[]; onChange: (codes: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const results = searchSupportedCities(query, 8).filter((c) => !codes.includes(c.code));

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function pick(c: SupportedCity) {
    onChange([...codes, c.code]);
    setQuery('');
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative">
      <label className="block text-[11px] font-medium text-[rgb(var(--text-secondary))] mb-1 inline-flex items-center gap-1"><MapPin className="w-3 h-3" />Destinations <span className="text-[rgb(var(--text-tertiary))] font-normal">(leave empty for all)</span></label>
      <div className="flex flex-wrap items-center gap-1.5 rounded-sm border border-border bg-surface px-2 py-1.5 min-h-9">
        {codes.map((code) => (
          <span key={code} className="inline-flex items-center gap-1 rounded bg-crimson-50 text-crimson-900 text-xs px-2 py-0.5">
            {cityByCode(code)?.name ?? code}
            <button type="button" onClick={() => onChange(codes.filter((c) => c !== code))} aria-label={`Remove ${code}`} className="hover:text-crimson-700">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={codes.length ? 'Add another…' : 'Search cities…'}
          className="flex-1 min-w-[120px] bg-transparent text-sm focus:outline-none py-0.5"
          autoComplete="off"
        />
      </div>
      {open && query && (
        <div className="absolute z-30 mt-1 w-full min-w-[240px] bg-surface rounded-md shadow-xl border border-border-subtle overflow-hidden max-h-60 overflow-y-auto">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-[rgb(var(--text-secondary))]">No matches for “{query}”.</p>
          ) : results.map((c) => (
            <button key={c.code} type="button" onMouseDown={(e) => { e.preventDefault(); pick(c); }}
              className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-surface-2">
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
