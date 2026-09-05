'use client';
import { useState } from 'react';
import { Pill } from '@/components/ui/pill';
import { Dialog } from '@/components/ui/dialog';
import { ImageWithFallback } from '@/components/common/image-with-fallback';
import { ExpandableText } from '@/components/common/expandable-text';
import { useMoney } from '@/components/providers/currency-provider';
import { Clock, MapPin, Tag, Ticket } from 'lucide-react';
import type { Activity } from '@/lib/itinerary/types';

const ImgFallback = (
  <div className="w-full h-full flex items-center justify-center bg-[linear-gradient(135deg,#F2F4F7,#E4E7EC)] text-navy-200">
    <Ticket className="w-9 h-9" />
  </div>
);

export function ActivitiesBrowser({ activities, cityName }: { activities: Activity[]; cityName: string }) {
  const money = useMoney();
  const [detail, setDetail] = useState<Activity | null>(null);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {activities.map((a) => (
          <button key={a.id} type="button" onClick={() => setDetail(a)} className="text-left h-full">
            <article className="group h-full flex flex-col rounded-lg bg-surface border border-border-subtle shadow-sm overflow-hidden lift">
              <div className="w-full h-40 bg-navy-50 relative">
                <ImageWithFallback src={a.thumb} alt={a.name} className="w-full h-40 object-cover" fallback={ImgFallback} />
                {a.id.startsWith('ACT-') && <span className="absolute top-2.5 left-2.5"><Pill variant="live">Live</Pill></span>}
              </div>
              <div className="px-4 pt-3.5 pb-3 flex-1">
                <h3 className="font-bold text-ink text-[15px] leading-snug group-hover:text-crimson-700 transition-colors">{a.name}</h3>
                <div className="mt-2 flex items-center gap-3 text-[12px] font-medium text-[rgb(var(--text-secondary))]">
                  <span className="inline-flex items-center gap-1 tnum"><Clock className="w-3.5 h-3.5" />{Math.floor(a.durationMin / 60)}h{a.durationMin % 60 ? ` ${a.durationMin % 60}m` : ''}</span>
                  <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{cityName}</span>
                </div>
              </div>
              <div className="mt-auto border-t-2 border-dashed border-border-subtle px-4 py-3 flex items-end justify-between">
                <div><div className="label">From, per person</div><div className="money text-[17px] text-ink mt-0.5">{money(a.pricePaise)}</div></div>
                <span className="text-[12.5px] font-bold text-crimson-700">Details</span>
              </div>
            </article>
          </button>
        ))}
      </div>

      <Dialog open={!!detail} onClose={() => setDetail(null)} title={detail?.name ?? 'Activity'} size="lg">
        {detail && (
          <div className="space-y-4">
            <div className="w-full h-60 rounded-md overflow-hidden bg-navy-50">
              <ImageWithFallback src={detail.thumb} alt={detail.name} className="w-full h-60 object-cover" fallback={ImgFallback} />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[13px] font-medium text-[rgb(var(--text-secondary))]">
              {detail.id.startsWith('ACT-') && <Pill variant="live">Live · Hotelbeds</Pill>}
              <span className="inline-flex items-center gap-1 tnum"><Clock className="w-3.5 h-3.5" />{Math.floor(detail.durationMin / 60)}h{detail.durationMin % 60 ? ` ${detail.durationMin % 60}m` : ''}</span>
              <span className="inline-flex items-center gap-1 capitalize"><Tag className="w-3.5 h-3.5" />{detail.category}</span>
              <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{cityName}</span>
            </div>
            {detail.description ? (
              <div>
                <p className="label mb-1.5">About this experience</p>
                <ExpandableText text={detail.description} maxChars={320} className="text-sm text-ink leading-relaxed" />
              </div>
            ) : (
              <p className="text-sm text-[rgb(var(--text-secondary))]">The supplier has not provided a description for this activity.</p>
            )}
            <div className="flex items-center justify-between pt-3 border-t-2 border-dashed border-border-subtle">
              <div>
                <p className="label">From, per person</p>
                <p className="money text-[22px] text-ink mt-0.5">{money(detail.pricePaise)}</p>
              </div>
              <p className="text-xs text-[rgb(var(--text-secondary))] max-w-[220px] text-right">To attach it to a trip, open the builder and use <span className="font-bold text-ink">Add activity</span> on any day.</p>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
