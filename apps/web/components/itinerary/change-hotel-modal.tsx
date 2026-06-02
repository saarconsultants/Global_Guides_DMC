'use client';
import { useState, useEffect, useRef } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { Spinner } from '@/components/ui/spinner';
import { formatINR } from '@/lib/utils';
import { hotelsForCity } from '@/lib/itinerary/mock-inventory';
import { searchHotelsAction } from '@/app/actions/search-hotels';
import type { Hotel, StarRating, Room } from '@/lib/itinerary/types';
import { Star } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  cityCode: string;
  cityName: string;
  currentHotelId?: string;
  onPick: (h: Hotel) => void;
  // New optional props: if passed, we hit Hotelbeds live. If missing, mock-only.
  checkIn?: string;
  checkOut?: string;
  rooms?: Room[];
}

type Source = 'live' | 'mock' | 'unsupported-city' | 'loading';

export function ChangeHotelModal({ open, onClose, cityCode, cityName, currentHotelId, onPick, checkIn, checkOut, rooms }: Props) {
  const [starFilter, setStarFilter] = useState<StarRating | undefined>(undefined);
  const [liveHotels, setLiveHotels] = useState<Hotel[]>([]);
  const [source, setSource] = useState<Source>('mock');
  const [warning, setWarning] = useState<string | undefined>();

  const requestId = useRef(0);

  // Fetch from Hotelbeds when modal opens with date context
  useEffect(() => {
    if (!open || !checkIn || !checkOut || !rooms?.length) {
      // Don't reset on close — keep state so re-open doesn't flash empty.
      return;
    }
    const myReq = ++requestId.current;
    setSource('loading');
    setWarning(undefined);
    searchHotelsAction({
      cityCode,
      checkIn: checkIn.slice(0, 10),
      checkOut: checkOut.slice(0, 10),
      rooms: rooms.map((r) => ({ adults: r.adults, children: r.children })),
    })
      .then((r) => {
        if (myReq !== requestId.current) return; // stale
        if (!r.ok) {
          setSource('mock');
          setWarning(r.error);
          setLiveHotels([]);
          return;
        }
        setSource(r.source);
        setWarning(r.warning);
        setLiveHotels(r.hotels);
      })
      .catch((e) => {
        if (myReq !== requestId.current) return;
        setSource('mock');
        setWarning(String(e?.message ?? e));
        setLiveHotels([]);
      });
  }, [open, cityCode, checkIn, checkOut, rooms]);

  const mock = hotelsForCity(cityCode);
  // Merge: live first, then mock entries that aren't duplicated by name
  const liveNames = new Set(liveHotels.map((h) => h.name.toLowerCase()));
  const merged = source === 'live'
    ? [...liveHotels, ...mock.filter((h) => !liveNames.has(h.name.toLowerCase()))]
    : mock;
  const filtered = starFilter ? merged.filter((h) => h.stars === starFilter) : merged;

  return (
    <Dialog open={open} onClose={onClose} title={`Change hotel in ${cityName}`} size="xl">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[rgb(var(--text-secondary))] mr-2">Star rating:</span>
          {(['Any', 3, 4, 5] as const).map((opt) => {
            const active = opt === 'Any' ? starFilter === undefined : starFilter === opt;
            return (
              <button
                key={String(opt)}
                onClick={() => setStarFilter(opt === 'Any' ? undefined : (opt as StarRating))}
                className={`px-3 h-8 rounded-full text-xs font-medium border transition-colors cursor-pointer ${active ? 'bg-navy-900 text-white border-navy-900' : 'bg-surface text-navy-700 border-border hover:bg-navy-50'}`}
              >
                {opt === 'Any' ? 'Any' : `${opt}★`}
              </button>
            );
          })}
        </div>
        <SourceBadge source={source} liveCount={liveHotels.length} />
      </div>

      {warning && source !== 'live' && (
        <div className="rounded-md border border-warning-500/30 bg-amber-50 text-amber-700 px-3 py-2 text-xs mb-3">
          {warning} — showing mock inventory.
        </div>
      )}

      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
        {source === 'loading' && (
          <div className="text-center py-12 text-sm text-[rgb(var(--text-secondary))]">
            <Spinner size="sm" className="inline mr-2" /> Searching Hotelbeds for {cityName}…
          </div>
        )}
        {source !== 'loading' && filtered.map((h) => (
          <div key={h.id} className={`p-4 rounded-md border ${h.id === currentHotelId ? 'border-crimson-500 bg-crimson-50/40' : 'border-border-subtle bg-surface'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-1 text-gold-500 text-sm">{Array.from({ length: h.stars }).map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-gold-500" />)}</div>
                <h4 className="font-semibold text-navy-900 mt-1 flex items-center gap-2">
                  {h.name}
                  {h.id.startsWith('HB-') && <Pill variant="success">LIVE</Pill>}
                </h4>
                <p className="text-xs text-[rgb(var(--text-secondary))]">{h.address}</p>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  {h.rating && <span className="inline-flex items-center px-2 py-0.5 rounded bg-crimson-900 text-white font-semibold">{h.rating.score}</span>}
                  {h.rating && <span className="text-[rgb(var(--text-secondary))]">{h.rating.label} · {h.rating.reviewCount} ratings</span>}
                  {h.refundable && <Pill variant="success">Refundable</Pill>}
                  <Pill variant="neutral">{h.mealPlan}</Pill>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-[rgb(var(--text-secondary))]">per night</p>
                <p className="font-mono font-bold text-lg text-navy-900">{formatINR(h.pricePerNightPaise)}</p>
                <Button size="sm" className="mt-2" onClick={() => { onPick(h); onClose(); }} disabled={h.id === currentHotelId}>
                  {h.id === currentHotelId ? 'Selected' : 'Select'}
                </Button>
              </div>
            </div>
          </div>
        ))}
        {source !== 'loading' && filtered.length === 0 && <p className="text-sm text-[rgb(var(--text-secondary))] text-center py-12">No hotels in this band. Try a different star filter.</p>}
      </div>
    </Dialog>
  );
}

function SourceBadge({ source, liveCount }: { source: Source; liveCount: number }) {
  if (source === 'loading') return null;
  if (source === 'live') return <Pill variant="success">{liveCount} LIVE results · Hotelbeds</Pill>;
  if (source === 'unsupported-city') return <Pill variant="warning">City not on Hotelbeds · mock data</Pill>;
  return <Pill variant="warning">MOCK · set HOTELBEDS_API_KEY for live</Pill>;
}
