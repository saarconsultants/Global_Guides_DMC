'use client';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { Dialog } from '@/components/ui/dialog';
import { ImageWithFallback } from '@/components/common/image-with-fallback';
import { ExpandableText } from '@/components/common/expandable-text';
import { useMoney } from '@/components/providers/currency-provider';
import { Clock, MapPin, Tag, ImageIcon } from 'lucide-react';
import type { Activity } from '@/lib/itinerary/types';

const ImgFallback = (
  <div className="w-full h-full flex items-center justify-center bg-navy-900/90 text-white/40">
    <ImageIcon className="w-8 h-8" />
  </div>
);

export function ActivitiesBrowser({ activities, cityName }: { activities: Activity[]; cityName: string }) {
  const money = useMoney();
  const [detail, setDetail] = useState<Activity | null>(null);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger">
        {activities.map((a) => (
          <button key={a.id} type="button" onClick={() => setDetail(a)} className="text-left">
            <Card className="lift overflow-hidden h-full cursor-pointer hover:border-crimson-300 transition-colors">
              <div className="w-full h-40 bg-navy-900">
                <ImageWithFallback src={a.thumb} alt={a.name} className="w-full h-40 object-cover" fallback={ImgFallback} />
              </div>
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-navy-900 text-sm leading-snug">{a.name}</h3>
                  {a.id.startsWith('ACT-') && <Pill variant="success">LIVE</Pill>}
                </div>
                <div className="flex items-center gap-2 text-xs text-[rgb(var(--text-secondary))]">
                  <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{Math.round(a.durationMin / 60)}h {a.durationMin % 60}m</span>
                  <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{cityName}</span>
                </div>
                <div className="pt-1 flex items-baseline justify-between border-t border-border-subtle">
                  <span className="text-[10px] text-[rgb(var(--text-secondary))]">from</span>
                  <span className="font-mono font-bold text-navy-900">{money(a.pricePaise)}</span>
                </div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <Dialog open={!!detail} onClose={() => setDetail(null)} title={detail?.name ?? 'Activity'} size="lg">
        {detail && (
          <div className="space-y-4">
            <div className="w-full h-60 rounded-md overflow-hidden bg-navy-900">
              <ImageWithFallback src={detail.thumb} alt={detail.name} className="w-full h-60 object-cover" fallback={ImgFallback} />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[rgb(var(--text-secondary))]">
              {detail.id.startsWith('ACT-') && <Pill variant="success">LIVE · Hotelbeds</Pill>}
              <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{Math.round(detail.durationMin / 60)}h {detail.durationMin % 60}m</span>
              <span className="inline-flex items-center gap-1"><Tag className="w-3.5 h-3.5" />{detail.category}</span>
              <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{cityName}</span>
            </div>
            {detail.description ? (
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[rgb(var(--text-tertiary))] font-bold mb-1">About this experience</p>
                <ExpandableText text={detail.description} maxChars={320} className="text-sm text-[rgb(var(--text-primary))]" />
              </div>
            ) : (
              <p className="text-sm text-[rgb(var(--text-secondary))]">No description provided for this activity.</p>
            )}
            <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
              <div>
                <p className="text-[11px] text-[rgb(var(--text-secondary))]">From (per person)</p>
                <p className="font-mono font-bold text-xl text-navy-900">{money(detail.pricePaise)}</p>
              </div>
              <p className="text-xs text-[rgb(var(--text-tertiary))] max-w-[200px] text-right">Open the itinerary builder → <span className="font-medium">+ Add Activity</span> to attach this to a customer trip.</p>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
