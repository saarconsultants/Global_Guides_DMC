'use client';
import { useState, useEffect, useRef } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { Spinner } from '@/components/ui/spinner';
import { useMoney } from '@/components/providers/currency-provider';
import { activitiesForCity } from '@/lib/itinerary/mock-inventory';
import { supplierOf, fmtDuration, withOption, forTrip } from '@/lib/activities/format';
import { ActivityInfo, ActivityOptions } from '@/components/activities/activity-info';
import { ActivityFilterBar, useActivityFilters, LoadMore, useLoadMore } from '@/components/activities/activity-filters';
import { ExpandableText } from '@/components/common/expandable-text';
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
  // When set, we search live activities for that date. Without it we stay mock-only.
  date?: string;             // YYYY-MM-DD of the day this activity is for
  paxAdults?: number;
  paxChildren?: number;
}

type Source = 'live' | 'mock' | 'unsupported-city' | 'loading';

export function AddActivityModal({ open, onClose, cityCode, cityName, slot, onPick, onClear, currentId, date, paxAdults = 2, paxChildren = 0 }: Props) {
  const money = useMoney();
  const [liveActivities, setLiveActivities] = useState<Activity[]>([]);
  const [source, setSource] = useState<Source>('mock');
  const [warning, setWarning] = useState<string | undefined>();
  const [detail, setDetail] = useState<Activity | null>(null);
  const [timing, setTiming] = useState<Activity | null>(null);   // timed Leamigo activity awaiting a start time
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
          console.error("[supplier-search]", r.error); setWarning(r.error);
          setLiveActivities([]);
          return;
        }
        setSource(r.source);
        if (r.warning) console.error("[supplier-search]", r.warning); setWarning(r.warning);
        setLiveActivities(r.activities);
      })
      .catch((e) => {
        if (myReq !== requestId.current) return;
        setSource('mock');
        console.error("[supplier-search]", e); setWarning(String(e?.message ?? e));
        setLiveActivities([]);
      });
  }, [open, cityCode, date, paxAdults, paxChildren]);

  // Reset the search box + detail view whenever the modal opens or context changes.
  useEffect(() => { if (open) { setDetail(null); setTiming(null); } }, [open, cityCode, slot]);

  // Activities that need a start time go through the time picker first.
  const choose = (a: Activity) => {
    if (a.listOnly) return;
    if (a.leamigo?.timed && date) { setTiming(a); return; }
    onPick(forTrip(a)); onClose();
  };

  // The search returns live activities from every supplier, or sample ones
  // when nothing live is available — never a mix. Without a date we can't
  // search, so sample inventory is shown.
  const merged = date && liveActivities.length ? liveActivities : activitiesForCity(cityCode);
  const party = paxAdults + paxChildren;

  const filters = useActivityFilters(merged);
  const filtered = filters.filtered;
  const page = useLoadMore(filtered);

  return (
    <Dialog open={open} onClose={onClose} title={timing ? 'Choose a start time' : detail ? 'Activity details' : `Add activity — ${slot} in ${cityName}`} size="lg">
      {timing && date ? (
        <StartTimePicker a={timing} date={date} slot={slot} onBack={() => setTiming(null)} onConfirm={(a) => { onPick(forTrip(a)); onClose(); }} />
      ) : detail ? (
        <ActivityDetail
          a={detail}
          date={date}
          isCurrent={detail.id === currentId}
          onBack={() => setDetail(null)}
          onOption={(o) => setDetail(withOption(detail, o))}
          onAdd={() => choose(detail)}
        />
      ) : (
      <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-[rgb(var(--text-secondary))]">{merged.length === 0 ? 'No options' : `${merged.length} options`}</p>
        <SourceBadge source={source} liveCount={liveActivities.filter((a) => !a.listOnly).length} />
      </div>

      {source !== 'loading' && merged.length > 0 && (
        <div className="mb-3"><ActivityFilterBar f={filters} total={merged.length} /></div>
      )}

      {warning && source !== 'live' && (
        <div className="rounded-md border border-warning-500/30 bg-amber-50 text-amber-700 px-3 py-2 text-xs mb-3">
          Live prices couldn&apos;t load. Try again in a minute. Showing sample prices for now.
        </div>
      )}

      {source === 'loading' ? (
        <div className="text-center py-12 text-sm text-[rgb(var(--text-secondary))]">
          <Spinner size="sm" className="inline mr-2" /> Searching live activities in {cityName}…
        </div>
      ) : merged.length === 0 ? (
        <p className="text-sm text-[rgb(var(--text-secondary))] text-center py-12">No activities for {cityName} yet.</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-[rgb(var(--text-secondary))] text-center py-12">Nothing matches these filters.</p>
      ) : (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          {page.visible.map((a) => (
            <div
              key={a.id}
              onClick={() => setDetail(a)}
              className={`p-4 rounded-md border flex items-start gap-4 cursor-pointer transition-colors hover:border-crimson-300 hover:bg-surface-2/40 ${a.id === currentId ? 'border-crimson-500 bg-crimson-50/40' : 'border-border-subtle bg-surface'}`}
            >
              {a.thumb && (
                <img src={a.thumb} alt="" loading="lazy" className="w-24 h-24 rounded-md object-cover bg-navy-900 flex-shrink-0" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ink text-sm inline-flex items-center gap-2">
                  {a.name}
                  {a.listOnly ? <Pill variant="warning">Not bookable yet</Pill> : supplierOf(a) ? <Pill variant="success">Live · {supplierOf(a)}</Pill> : <Pill variant="warning">Sample</Pill>}
                </p>
                <div className="mt-1 flex items-center gap-2 text-xs text-[rgb(var(--text-secondary))]">
                  {fmtDuration(a.durationMin) && <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{fmtDuration(a.durationMin)}</span>}
                  <Pill variant="neutral">{a.supplierCategory ?? a.category}</Pill>
                  {a.supplierName && <span>{a.supplierName}</span>}
                </div>
                {a.description && (
                  <p className="mt-1.5 text-xs text-[rgb(var(--text-secondary))] line-clamp-2">{a.description}</p>
                )}
                <span className="mt-1.5 inline-flex items-center gap-0.5 text-[11px] font-medium text-crimson-700">View details <ChevronRight className="w-3 h-3" /></span>
              </div>
              <div className="text-right flex-shrink-0">
                {a.listOnly ? (
                  <>
                    <p className="font-mono font-semibold text-ink">{a.pricePaise > 0 ? money(a.pricePaise) : 'Price on request'}</p>
                    <p className="text-[11px] text-[rgb(var(--text-secondary))]">listed from</p>
                  </>
                ) : (
                  <>
                    <p className="font-mono font-semibold text-ink">{money(a.pricePaise)}</p>
                    <p className="text-[11px] text-[rgb(var(--text-secondary))]">for {party} traveller{party !== 1 ? 's' : ''}</p>
                    <Button size="sm" className="mt-2" onClick={(e) => { e.stopPropagation(); choose(a); }} disabled={a.id === currentId}>
                      {a.id === currentId ? 'Added' : 'Add'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
          <LoadMore m={page} />
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

function ActivityDetail({ a, date, isCurrent, onBack, onAdd, onOption }: { a: Activity; date?: string; isCurrent: boolean; onBack: () => void; onAdd: () => void; onOption: (o: NonNullable<Activity['options']>[number]) => void }) {
  const money = useMoney();
  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm text-crimson-700 hover:underline">
        <ArrowLeft className="w-4 h-4" /> Back to results
      </button>

      {a.thumb && (
        <img src={a.thumb} alt={a.name} className="w-full h-56 rounded-md object-cover bg-navy-900" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
      )}

      <div>
        <h3 className="text-lg font-semibold text-ink inline-flex items-center gap-2">
          {a.name}
          {a.listOnly ? <Pill variant="warning">Not bookable yet</Pill> : supplierOf(a) ? <Pill variant="success">Live · {supplierOf(a)}</Pill> : <Pill variant="warning">Sample</Pill>}
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[rgb(var(--text-secondary))]">
          {fmtDuration(a.durationMin) && <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{fmtDuration(a.durationMin)}</span>}
          <span className="inline-flex items-center gap-1"><Tag className="w-3.5 h-3.5" />{a.supplierCategory ?? a.category}</span>
          {a.supplierName && <span>Operator: {a.supplierName}</span>}
        </div>
      </div>

      {a.listOnly ? (
        <ActivityInfo a={a} />
      ) : a.leamigo ? (
        <>
          <ActivityOptions a={a} chosenOptionId={a.leamigo.optionId} onChoose={onOption} date={date} />
          <ActivityInfo a={a} chosenOptionId={a.leamigo.optionId} />
        </>
      ) : a.description ? (
        <div>
          <p className="label mb-1">About this experience</p>
          <ExpandableText text={a.description} maxChars={300} className="text-sm text-[rgb(var(--text-primary))]" />
        </div>
      ) : (
        <p className="text-sm text-[rgb(var(--text-secondary))]">No description provided for this activity.</p>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
        {a.listOnly ? (
          <>
            <div>
              <p className="text-[11px] text-[rgb(var(--text-secondary))]">Listed from</p>
              <p className="money text-xl text-ink">{a.pricePaise > 0 ? money(a.pricePaise) : 'Price on request'}</p>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-xs text-[rgb(var(--text-secondary))] max-w-[240px] text-right">The supplier hasn&apos;t released a bookable option for this yet.</p>
              <Button variant="ghost" onClick={onBack}>Back</Button>
            </div>
          </>
        ) : (<>
        <div>
          <p className="text-[11px] text-[rgb(var(--text-secondary))]">Price for this trip{a.perPersonPaise && a.priceBasis !== 'group' ? ` · ${money(a.perPersonPaise)} per person` : a.priceBasis === 'group' ? ' · private, whole group' : ''}</p>
          <p className="money text-xl text-ink">{money(a.pricePaise)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onBack}>Back</Button>
          <Button onClick={onAdd} disabled={isCurrent}>{isCurrent ? 'Already added' : 'Add to this day'}</Button>
        </div>
        </>)}
      </div>
    </div>
  );
}

function SourceBadge({ source, liveCount }: { source: Source; liveCount: number }) {
  if (source === 'loading') return null;
  if (source === 'live') return <Pill variant="success">{liveCount} with live prices</Pill>;
  if (source === 'unsupported-city') return <Pill variant="warning">Sample prices — live rates aren&apos;t available for this city</Pill>;
  return <Pill variant="warning">Sample prices — live rates unavailable right now</Pill>;
}

interface TimeOption { start: string; end?: string; available: boolean; seatsLeft: number | null; ticketId: string | null; pricePaise: number | null }
const SLOT_DEFAULT = { morning: '09:00', afternoon: '14:00', evening: '18:00' } as const;

/** Start-time step for Leamigo activities that need one. */
function StartTimePicker({ a, date, slot, onBack, onConfirm }: { a: Activity; date: string; slot: 'morning' | 'afternoon' | 'evening'; onBack: () => void; onConfirm: (a: Activity) => void }) {
  const money = useMoney();
  const lm = a.leamigo!;
  const [state, setState] = useState<'loading' | 'ready' | 'error' | 'soldout'>('loading');
  const [times, setTimes] = useState<TimeOption[]>([]);
  const [anyTime, setAnyTime] = useState(false);
  const [chosen, setChosen] = useState<string>(lm.startTime ?? '');
  const [error, setError] = useState<string>();

  useEffect(() => {
    let live = true;
    fetch('/api/activity-times', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activityId: lm.activityId, optionId: lm.optionId, ticketId: lm.ticketId, quantity: lm.quantity, lines: lm.lines, date }) })
      .then((r) => r.json())
      .then((r) => {
        if (!live) return;
        if (!r.ok) { setError(r.error); setState('error'); return; }
        if (!r.available) { setState('soldout'); return; }
        setTimes(r.times); setAnyTime(r.anyTime);
        if (!lm.startTime) {
          const want = SLOT_DEFAULT[slot];
          const open = (r.times as TimeOption[]).filter((t) => t.available);
          setChosen(r.anyTime ? want : (open.find((t) => t.start >= want) ?? open[0])?.start ?? '');
        }
        setState('ready');
      })
      .catch(() => { if (live) { setError("Start times couldn't load. Try again in a minute."); setState('error'); } });
    return () => { live = false; };
  }, [lm.activityId, lm.optionId, lm.ticketId, lm.quantity, lm.startTime, date, slot]);

  const pick = times.find((t) => t.start === chosen);
  const valid = anyTime ? /^\d{2}:\d{2}$/.test(chosen) : !!pick?.available;
  const confirm = () => {
    if (!valid) return;
    onConfirm({
      ...a,
      pricePaise: pick?.pricePaise ?? a.pricePaise,
      leamigo: { ...lm, startTime: chosen, ticketId: (lm.lines?.length ?? 0) > 1 ? lm.ticketId : pick?.ticketId ?? lm.ticketId, lines: (lm.lines?.length ?? 0) > 1 ? lm.lines : undefined },
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="font-semibold text-ink">{a.name}</p>
        <p className="text-xs text-[rgb(var(--text-secondary))] mt-0.5">{new Date(date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} · {lm.quantity} ticket{lm.quantity !== 1 ? 's' : ''}</p>
      </div>

      {state === 'loading' && <div className="py-8 text-center text-sm text-[rgb(var(--text-secondary))]"><Spinner size="sm" className="inline mr-2" />Checking start times…</div>}
      {state === 'error' && <div role="alert" className="rounded-md border border-warning-500/30 bg-amber-50 text-amber-700 px-3 py-2 text-xs">{error}</div>}
      {state === 'soldout' && <div role="alert" className="rounded-md border border-warning-500/30 bg-amber-50 text-amber-700 px-3 py-2 text-xs">Sold out on this day. Pick another day or another activity.</div>}

      {state === 'ready' && (anyTime ? (
        <label className="block text-sm">
          <span className="label block mb-1">Start time</span>
          <input type="time" className="control" value={chosen} onChange={(e) => setChosen(e.target.value)} />
          <span className="block text-xs text-[rgb(var(--text-secondary))] mt-1">The supplier accepts any start time on this day.</span>
        </label>
      ) : (
        <fieldset>
          <legend className="label mb-2">Available start times</legend>
          <div className="flex flex-wrap gap-2">
            {times.map((t) => (
              <button key={t.start} type="button" disabled={!t.available} onClick={() => setChosen(t.start)} aria-pressed={chosen === t.start}
                className={`min-h-[44px] px-3 py-1.5 rounded-md border text-sm text-left disabled:opacity-40 disabled:line-through transition-[color,background-color,border-color,transform] duration-150 ease-out active:scale-[0.97] ${chosen === t.start ? 'bg-ink text-white border-ink' : 'border-border-subtle hover:border-crimson-300'}`}>
                <span className="font-mono font-semibold">{t.start}{t.end ? `–${t.end}` : ''}</span>
                {t.pricePaise !== null && <span className="block text-[11px] opacity-80">{money(t.pricePaise)}</span>}
                {t.available && t.seatsLeft !== null && t.seatsLeft <= 5 && <span className="block text-[11px] opacity-80">{t.seatsLeft} left</span>}
              </button>
            ))}
          </div>
        </fieldset>
      ))}

      <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
        <p className="money text-lg text-ink">{money(pick?.pricePaise ?? a.pricePaise)}</p>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onBack}>Back</Button>
          <Button onClick={confirm} disabled={state !== 'ready' || !valid}>Add at {chosen || '—'}</Button>
        </div>
      </div>
    </div>
  );
}
