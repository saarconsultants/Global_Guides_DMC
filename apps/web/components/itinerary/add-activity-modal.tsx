'use client';
import { useState, useEffect, useRef } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { Spinner } from '@/components/ui/spinner';
import { formatINR } from '@/lib/utils';
import { activitiesForCity } from '@/lib/itinerary/mock-inventory';
import type { Activity } from '@/lib/itinerary/types';
import { Clock, Search, ArrowLeft, Tag, ChevronRight } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  cityCode: string;
  cityName: string;
  slot: 'morning'|'afternoon'|'evening';
  onPick: (a: Activity) => void;
  onClear: () => void;
  currentId?: string;
  // New: when set, we hit Hotelbeds for that date. Without it we stay mock-only.
  date?: string;             // YYYY-MM-DD of the day this activity is for
  paxAdults?: number;
  paxChildren?: number;
}

type Source = 'live' | 'mock' | 'unsupported-city' | 'loading';

export function AddActivityModal({ open, onClose, cityCode, cityName, slot, onPick, onClear, currentId, date, paxAdults = 2, paxChildren = 0 }: Props) {
  const [liveActivities, setLiveActivities] = useState<Activity[]>([]);
  const [source, setSource] = useState<Source>('mock');
  const [warning, setWarning] = useState<string | undefined>();
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<Activity | null>(null);
  // requestId guards against a stale response from an earlier fetch overwriting
  // state when the effect re-runs (e.g. parent re-render shifts paxAdults ref).
  const requestId = useRef(0);

  useEffect(() => {
    if (!open || !date) {
      // Don't reset state on close — keep what we had so a re-open doesn't flash empty.
      return;
    }
    const myReq = ++requestId.current;
    setSource('loading');
    setWarning(undefined);
    fetch('/api/search-activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cityCode, fromDate: date, toDate: date, paxAdults, paxChildren }),
    })
      .then((res) => res.json())
      .then((r) => {
        if (myReq !== requestId.current) return; // stale
        if (!r.ok) {
          setSource('mock');
          setWarning(r.error);
          setLiveActivities([]);
          return;
        }
        setSource(r.source);
        setWarning(r.warning);
        setLiveActivities(r.activities);
      })
      .catch((e) => {
        if (myReq !== requestId.current) return;
        setSource('mock');
        setWarning(String(e?.message ?? e));
        setLiveActivities([]);
      });
  }, [open, cityCode, date, paxAdults, paxChildren]);

  // Reset the search box + detail view whenever the modal opens or context changes.
  useEffect(() => { if (open) { setQuery(''); setDetail(null); } }, [open, cityCode, slot]);

  const mock = activitiesForCity(cityCode);
  // Live first, then mock entries not already in live (dedupe by name)
  const liveNames = new Set(liveActivities.map((a) => a.name.toLowerCase()));
  const merged = source === 'live'
    ? [...liveActivities, ...mock.filter((a) => !liveNames.has(a.name.toLowerCase()))]
    : mock;

  const q = query.trim().toLowerCase();
  const filtered = q
    ? merged.filter((a) =>
        a.name.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        (a.description ?? '').toLowerCase().includes(q))
    : merged;

  return (
    <Dialog open={open} onClose={onClose} title={detail ? 'Activity details' : `Add activity — ${slot} in ${cityName}`} size="lg">
      {detail ? (
        <ActivityDetail
          a={detail}
          isCurrent={detail.id === currentId}
          onBack={() => setDetail(null)}
          onAdd={() => { onPick(detail); onClose(); }}
        />
      ) : (
      <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-[rgb(var(--text-secondary))]">
          {merged.length === 0 ? 'No options' : q ? `${filtered.length} of ${merged.length}` : `${merged.length} options`}
        </p>
        <SourceBadge source={source} liveCount={liveActivities.length} />
      </div>

      {source !== 'loading' && merged.length > 0 && (
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--text-tertiary))]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search activities by name, type, or description…"
            className="h-10 w-full rounded-sm border border-border bg-surface pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-crimson-500"
            autoComplete="off"
          />
        </div>
      )}

      {warning && source !== 'live' && (
        <div className="rounded-md border border-warning-500/30 bg-amber-50 text-amber-700 px-3 py-2 text-xs mb-3">
          {warning} — showing mock data.
        </div>
      )}

      {source === 'loading' ? (
        <div className="text-center py-12 text-sm text-[rgb(var(--text-secondary))]">
          <Spinner size="sm" className="inline mr-2" /> Searching Hotelbeds activities in {cityName}…
        </div>
      ) : merged.length === 0 ? (
        <p className="text-sm text-[rgb(var(--text-secondary))] text-center py-12">No activities for {cityName} yet.</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-[rgb(var(--text-secondary))] text-center py-12">No activities match “{query}”. Try a different search.</p>
      ) : (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          {filtered.map((a) => (
            <div
              key={a.id}
              onClick={() => setDetail(a)}
              className={`p-4 rounded-md border flex items-start gap-4 cursor-pointer transition-colors hover:border-crimson-300 hover:bg-surface-2/40 ${a.id === currentId ? 'border-crimson-500 bg-crimson-50/40' : 'border-border-subtle bg-surface'}`}
            >
              {a.thumb && (
                <img src={a.thumb} alt="" loading="lazy" className="w-24 h-24 rounded-md object-cover bg-navy-900 flex-shrink-0" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-navy-900 text-sm inline-flex items-center gap-2">
                  {a.name}
                  {a.id.startsWith('ACT-') && <Pill variant="success">LIVE</Pill>}
                </p>
                <div className="mt-1 flex items-center gap-2 text-xs text-[rgb(var(--text-secondary))]">
                  <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{Math.round(a.durationMin / 60)}h {a.durationMin % 60}m</span>
                  <Pill variant="neutral">{a.category}</Pill>
                </div>
                {a.description && (
                  <p className="mt-1.5 text-xs text-[rgb(var(--text-secondary))] line-clamp-2">{a.description}</p>
                )}
                <span className="mt-1.5 inline-flex items-center gap-0.5 text-[11px] font-medium text-crimson-700">View details <ChevronRight className="w-3 h-3" /></span>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-mono font-semibold text-navy-900">{formatINR(a.pricePaise)}</p>
                <Button size="sm" className="mt-2" onClick={(e) => { e.stopPropagation(); onPick(a); onClose(); }} disabled={a.id === currentId}>
                  {a.id === currentId ? 'Added' : 'Add'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {currentId && (
        <div className="mt-4 pt-4 border-t border-border-subtle text-right">
          <Button variant="ghost" size="sm" onClick={() => { onClear(); onClose(); }}>Remove activity</Button>
        </div>
      )}
      </>
      )}
    </Dialog>
  );
}

function ActivityDetail({ a, isCurrent, onBack, onAdd }: { a: Activity; isCurrent: boolean; onBack: () => void; onAdd: () => void }) {
  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm text-crimson-700 hover:underline">
        <ArrowLeft className="w-4 h-4" /> Back to results
      </button>

      {a.thumb && (
        <img src={a.thumb} alt={a.name} className="w-full h-56 rounded-md object-cover bg-navy-900" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
      )}

      <div>
        <h3 className="text-lg font-semibold text-navy-900 inline-flex items-center gap-2">
          {a.name}
          {a.id.startsWith('ACT-') && <Pill variant="success">LIVE</Pill>}
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[rgb(var(--text-secondary))]">
          <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{Math.round(a.durationMin / 60)}h {a.durationMin % 60}m</span>
          <span className="inline-flex items-center gap-1"><Tag className="w-3.5 h-3.5" />{a.category}</span>
        </div>
      </div>

      {a.description ? (
        <div>
          <p className="text-[11px] uppercase tracking-wider text-[rgb(var(--text-tertiary))] font-bold mb-1">About this experience</p>
          <p className="text-sm text-[rgb(var(--text-primary))] leading-relaxed whitespace-pre-line max-h-64 overflow-y-auto pr-1">{a.description}</p>
        </div>
      ) : (
        <p className="text-sm text-[rgb(var(--text-secondary))]">No description provided for this activity.</p>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
        <div>
          <p className="text-[11px] text-[rgb(var(--text-secondary))]">Price (per person)</p>
          <p className="font-mono font-bold text-xl text-navy-900">{formatINR(a.pricePaise)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onBack}>Back</Button>
          <Button onClick={onAdd} disabled={isCurrent}>{isCurrent ? 'Already added' : 'Add to this day'}</Button>
        </div>
      </div>
    </div>
  );
}

function SourceBadge({ source, liveCount }: { source: Source; liveCount: number }) {
  if (source === 'loading') return null;
  if (source === 'live') return <Pill variant="success">{liveCount} LIVE · Hotelbeds</Pill>;
  if (source === 'unsupported-city') return <Pill variant="warning">City not on Hotelbeds · mock data</Pill>;
  return <Pill variant="warning">MOCK · set HOTELBEDS_ACTIVITIES_API_KEY for live</Pill>;
}
