'use client';
import { useState, useEffect, useRef } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { Spinner } from '@/components/ui/spinner';
import { formatINR } from '@/lib/utils';
import { activitiesForCity } from '@/lib/itinerary/mock-inventory';
import type { Activity } from '@/lib/itinerary/types';
import { Clock } from 'lucide-react';

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

  const mock = activitiesForCity(cityCode);
  // Live first, then mock entries not already in live (dedupe by name)
  const liveNames = new Set(liveActivities.map((a) => a.name.toLowerCase()));
  const merged = source === 'live'
    ? [...liveActivities, ...mock.filter((a) => !liveNames.has(a.name.toLowerCase()))]
    : mock;

  return (
    <Dialog open={open} onClose={onClose} title={`Add activity — ${slot} in ${cityName}`} size="lg">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-[rgb(var(--text-secondary))]">{merged.length > 0 ? `${merged.length} options` : 'No options'}</p>
        <SourceBadge source={source} liveCount={liveActivities.length} />
      </div>

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
      ) : (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          {merged.map((a) => (
            <div key={a.id} className={`p-4 rounded-md border flex items-start justify-between gap-4 ${a.id === currentId ? 'border-crimson-500 bg-crimson-50/40' : 'border-border-subtle bg-surface'}`}>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-navy-900 text-sm inline-flex items-center gap-2">
                  {a.name}
                  {a.id.startsWith('ACT-') && <Pill variant="success">LIVE</Pill>}
                </p>
                <div className="mt-1 flex items-center gap-2 text-xs text-[rgb(var(--text-secondary))]">
                  <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{Math.round(a.durationMin / 60)}h {a.durationMin % 60}m</span>
                  <Pill variant="neutral">{a.category}</Pill>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-mono font-semibold text-navy-900">{formatINR(a.pricePaise)}</p>
                <Button size="sm" className="mt-2" onClick={() => { onPick(a); onClose(); }} disabled={a.id === currentId}>
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
    </Dialog>
  );
}

function SourceBadge({ source, liveCount }: { source: Source; liveCount: number }) {
  if (source === 'loading') return null;
  if (source === 'live') return <Pill variant="success">{liveCount} LIVE · Hotelbeds</Pill>;
  if (source === 'unsupported-city') return <Pill variant="warning">City not on Hotelbeds · mock data</Pill>;
  return <Pill variant="warning">MOCK · set HOTELBEDS_ACTIVITIES_API_KEY for live</Pill>;
}
