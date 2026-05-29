'use client';
import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { formatINR } from '@/lib/utils';
import { hotelsForCity } from '@/lib/itinerary/mock-inventory';
import type { Hotel, StarRating } from '@/lib/itinerary/types';
import { Star } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  cityCode: string;
  cityName: string;
  currentHotelId?: string;
  onPick: (h: Hotel) => void;
}

export function ChangeHotelModal({ open, onClose, cityCode, cityName, currentHotelId, onPick }: Props) {
  const [starFilter, setStarFilter] = useState<StarRating | undefined>(undefined);
  const all = hotelsForCity(cityCode);
  const filtered = starFilter ? all.filter((h) => h.stars === starFilter) : all;
  return (
    <Dialog open={open} onClose={onClose} title={`Change hotel in ${cityName}`} size="xl">
      <div className="flex flex-wrap items-center gap-2 mb-4">
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
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
        {filtered.map((h) => (
          <div key={h.id} className={`p-4 rounded-md border ${h.id === currentHotelId ? 'border-crimson-500 bg-crimson-50/40' : 'border-border-subtle bg-surface'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-1 text-gold-500 text-sm">{Array.from({ length: h.stars }).map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-gold-500" />)}</div>
                <h4 className="font-semibold text-navy-900 mt-1">{h.name}</h4>
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
        {filtered.length === 0 && <p className="text-sm text-[rgb(var(--text-secondary))] text-center py-12">No hotels in this band. Try a different star filter.</p>}
      </div>
    </Dialog>
  );
}
