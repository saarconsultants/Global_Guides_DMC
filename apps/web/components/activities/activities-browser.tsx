'use client';
import { useState } from 'react';
import { Pill } from '@/components/ui/pill';
import { Dialog } from '@/components/ui/dialog';
import { ImageWithFallback } from '@/components/common/image-with-fallback';
import { ExpandableText } from '@/components/common/expandable-text';
import { useMoney } from '@/components/providers/currency-provider';
import { Clock, MapPin, Tag, Ticket } from 'lucide-react';
import type { Activity } from '@/lib/itinerary/types';
import { supplierOf, fmtDuration, unitPrice, listOnlyLabel } from '@/lib/activities/format';
import { ActivityInfo, ActivityOptions, ListingCheck } from '@/components/activities/activity-info';
import { ActivityFilterBar, LoadMore, useActivityFilters, useLoadMore } from '@/components/activities/activity-filters';

/**
 * No supplier photo: the same ink plate the stay card uses, so the two
 * fallbacks agree across the surface family.
 */
const ImgFallback = (
  <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-ink text-white">
    <Ticket className="w-7 h-7 text-amber-500" />
    <span className="label text-white/50">Tour</span>
  </div>
);

/** The promises worth seeing before opening the details. */
function cardFacts(a: Activity): string[] {
  const options = a.options ?? [];
  return [
    a.supplierName,
    options.some((o) => o.instantConfirmation) && 'Instant confirmation',
    options.some((o) => o.freeCancellation) && 'Free cancellation',
  ].filter(Boolean) as string[];
}

export function ActivitiesBrowser({ activities, cityName, travellers, date }: { activities: Activity[]; cityName: string; travellers: number; date?: string }) {
  const money = useMoney();
  const [detail, setDetail] = useState<Activity | null>(null);
  const filters = useActivityFilters(activities);
  const page = useLoadMore(filters.filtered);
  const fromPrice = (a: Activity) => (a.pricePaise > 0 ? money(a.pricePaise) : 'Price on request');

  return (
    <>
      <ActivityFilterBar f={filters} total={activities.length} />
      {filters.filtered.length === 0 && <p className="text-sm text-[rgb(var(--text-secondary))] text-center py-10">Nothing matches these filters.</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {page.visible.map((a) => (
          <button key={a.id} type="button" onClick={() => setDetail(a)} className="text-left h-full">
            <article className="group h-full flex flex-col rounded-lg bg-surface border border-border-subtle shadow-sm overflow-hidden lift">
              <div className="w-full h-40 bg-navy-50 relative">
                <ImageWithFallback src={a.thumb} alt={a.name} className="w-full h-40 object-cover" fallback={ImgFallback} />
                <span className="absolute top-2.5 left-2.5">{a.listOnly ? <Pill variant="warning">{listOnlyLabel(a)}</Pill> : supplierOf(a) ? <Pill variant="live">Live</Pill> : <Pill variant="warning">Sample</Pill>}</span>
              </div>
              <div className="px-4 pt-3.5 pb-3 flex-1">
                <h3 className="font-bold text-ink text-[15px] leading-snug group-hover:text-crimson-700 transition-colors">{a.name}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-medium text-[rgb(var(--text-secondary))]">
                  {fmtDuration(a.durationMin) && <span className="inline-flex items-center gap-1 tnum"><Clock className="w-3.5 h-3.5" />{fmtDuration(a.durationMin)}</span>}
                  <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{cityName}</span>
                  {a.supplierCategory && <span className="inline-flex items-center gap-1"><Tag className="w-3.5 h-3.5" />{a.supplierCategory}</span>}
                </div>
                {cardFacts(a).length > 0 && <p className="mt-1.5 text-[12px] text-[rgb(var(--text-secondary))]">{cardFacts(a).join(' · ')}</p>}
              </div>
              <div className="mt-auto border-t-2 border-dashed border-border-subtle px-4 py-3 flex items-end justify-between">
                {a.listOnly
                  ? <div><div className="label">Listed from</div><div className="money text-[17px] text-ink mt-0.5">{fromPrice(a)}</div></div>
                  : <div><div className="label">{unitPrice(a).basis === 'group' ? 'Private, per group' : 'From, per person'}</div><div className="money text-[17px] text-ink mt-0.5">{money(unitPrice(a).paise)}</div></div>}
                <span className="text-[12.5px] font-bold text-crimson-700">{(a.options?.length ?? 0) > 1 ? `${a.options!.length} options` : 'Details'}</span>
              </div>
            </article>
          </button>
        ))}
      </div>
      <LoadMore m={page} />

      <Dialog open={!!detail} onClose={() => setDetail(null)} title={detail?.name ?? 'Activity'} size="lg">
        {detail && (
          <div className="space-y-4">
            <div className="w-full h-60 rounded-md overflow-hidden bg-navy-50">
              <ImageWithFallback src={detail.thumb} alt={detail.name} className="w-full h-60 object-cover" fallback={ImgFallback} />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[13px] font-medium text-[rgb(var(--text-secondary))]">
              {detail.listOnly ? <Pill variant="warning">{listOnlyLabel(detail)}</Pill> : supplierOf(detail) ? <Pill variant="live">Live · {supplierOf(detail)}</Pill> : <Pill variant="warning">Sample · not bookable</Pill>}
              {fmtDuration(detail.durationMin) && <span className="inline-flex items-center gap-1 tnum"><Clock className="w-3.5 h-3.5" />{fmtDuration(detail.durationMin)}</span>}
              <span className="inline-flex items-center gap-1 capitalize"><Tag className="w-3.5 h-3.5" />{detail.supplierCategory ?? detail.category}</span>
              <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{cityName}</span>
              {detail.supplierName && <span>Operator: {detail.supplierName}{detail.supplierVerified ? ' (verified)' : ''}</span>}
            </div>
            {detail.listOnly ? (
              <>
                <ListingCheck a={detail} adults={travellers} onBookable={setDetail} />
                <ActivityInfo a={detail} />
              </>
            ) : detail.leamigo ? (
              <>
                <ActivityOptions a={detail} date={date} />
                <ActivityInfo a={detail} />
              </>
            ) : detail.description ? (
              <div>
                <p className="label mb-1.5">About this experience</p>
                <ExpandableText text={detail.description} maxChars={320} className="text-sm text-ink leading-relaxed" />
              </div>
            ) : (
              <p className="text-sm text-[rgb(var(--text-secondary))]">The supplier has not provided a description for this activity.</p>
            )}
            <div className="flex items-center justify-between pt-3 border-t-2 border-dashed border-border-subtle">
              {detail.listOnly ? (
                <>
                  <div>
                    <p className="label">Listed from</p>
                    <p className="money text-[22px] text-ink mt-0.5">{fromPrice(detail)}</p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="label">{unitPrice(detail).basis === 'group' ? 'Private, per group' : 'From, per person'}</p>
                    <p className="money text-[22px] text-ink mt-0.5">{money(unitPrice(detail).paise)}</p>
                    {supplierOf(detail) && <p className="text-xs text-[rgb(var(--text-secondary))] mt-0.5 tnum">{money(detail.pricePaise)} for {travellers} traveller{travellers !== 1 ? 's' : ''}</p>}
                  </div>
                  <p className="text-xs text-[rgb(var(--text-secondary))] max-w-[220px] text-right">To attach it to a trip, open the builder and use <span className="font-bold text-ink">Add activity</span> on any day.</p>
                </>
              )}
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
