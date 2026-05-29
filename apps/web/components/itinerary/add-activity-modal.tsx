'use client';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
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
}

export function AddActivityModal({ open, onClose, cityCode, cityName, slot, onPick, onClear, currentId }: Props) {
  const list = activitiesForCity(cityCode);
  return (
    <Dialog open={open} onClose={onClose} title={`Add activity — ${slot} in ${cityName}`} size="lg">
      {list.length === 0 ? (
        <p className="text-sm text-[rgb(var(--text-secondary))] text-center py-12">No mock activities for {cityName} yet. They'll be powered by Viator/Tripjack Tours in Phase 2.</p>
      ) : (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          {list.map((a) => (
            <div key={a.id} className={`p-4 rounded-md border flex items-start justify-between gap-4 ${a.id === currentId ? 'border-crimson-500 bg-crimson-50/40' : 'border-border-subtle bg-surface'}`}>
              <div>
                <p className="font-semibold text-navy-900 text-sm">{a.name}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-[rgb(var(--text-secondary))]">
                  <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{Math.round(a.durationMin / 60)}h {a.durationMin % 60}m</span>
                  <Pill variant="neutral">{a.category}</Pill>
                </div>
              </div>
              <div className="text-right">
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
