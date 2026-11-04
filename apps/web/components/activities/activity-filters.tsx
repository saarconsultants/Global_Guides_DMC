'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import type { Activity } from '@/lib/itinerary/types';

type Sort = 'price_low' | 'price_high' | 'name';
type Length = 'any' | 'short' | 'half' | 'long';

const best = (a: Activity) => a.options?.find((o) => o.optionId === a.leamigo?.optionId) ?? a.options?.[0];

/** Search, filter and sort over everything a supplier returned. Each is opt-in; nothing is hidden by default. */
export function useActivityFilters(activities: Activity[]) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [length, setLength] = useState<Length>('any');
  const [instant, setInstant] = useState(false);
  const [freeCancel, setFreeCancel] = useState(false);
  const [openDate, setOpenDate] = useState(false);
  const [bookable, setBookable] = useState(false);
  const [sort, setSort] = useState<Sort>('price_low');

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of activities) { const c = a.supplierCategory ?? a.category; counts.set(c, (counts.get(c) ?? 0) + 1); }
    return [...counts.entries()].sort((x, y) => y[1] - x[1]);
  }, [activities]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = activities.filter((a) => {
      if (q && !`${a.name} ${a.description ?? ''} ${a.supplierCategory ?? a.category}`.toLowerCase().includes(q)) return false;
      if (category !== 'all' && (a.supplierCategory ?? a.category) !== category) return false;
      if (length === 'short' && !(a.durationMin > 0 && a.durationMin <= 240)) return false;
      if (length === 'half' && !(a.durationMin > 240 && a.durationMin <= 480)) return false;
      if (length === 'long' && !(a.durationMin > 480)) return false;
      if (instant && !best(a)?.instantConfirmation) return false;
      if (freeCancel && !(a.options?.some((o) => o.freeCancellation) ?? a.leamigo?.freeCancellation)) return false;
      if (openDate && !a.options?.some((o) => o.bookingType === 'open_dated')) return false;
      if (bookable && a.listOnly) return false;
      return true;
    });
    // What can be booked comes first; within each group, the chosen order. No listed price sorts last.
    const low = (a: Activity) => a.pricePaise || Number.MAX_SAFE_INTEGER;
    return [...rows].sort((x, y) => Number(!!x.listOnly) - Number(!!y.listOnly)
      || (sort === 'name' ? x.name.localeCompare(y.name) : sort === 'price_high' ? y.pricePaise - x.pricePaise : low(x) - low(y)));
  }, [activities, query, category, length, instant, freeCancel, openDate, bookable, sort]);

  const hasListOnly = useMemo(() => activities.some((a) => a.listOnly), [activities]);

  return { filtered, categories, hasListOnly, bookable, setBookable, query, setQuery, category, setCategory, length, setLength, instant, setInstant, freeCancel, setFreeCancel, openDate, setOpenDate, sort, setSort };
}

const STEP = 60;

/** Big cities have hundreds of results: all are searchable and filterable, drawn in batches as the agent scrolls. */
export function useLoadMore<T>(rows: T[]) {
  const [count, setCount] = useState(STEP);
  const sentinel = useRef<HTMLDivElement | null>(null);
  useEffect(() => { setCount(STEP); }, [rows]);
  const more = rows.length > count;
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !more) return;
    const io = new IntersectionObserver((seen) => { if (seen.some((s) => s.isIntersecting)) setCount((c) => c + STEP); }, { rootMargin: '400px' });
    io.observe(el);
    return () => io.disconnect();
  }, [more, count]);
  return { visible: rows.slice(0, count), more, shown: Math.min(count, rows.length), total: rows.length, sentinel, showMore: () => setCount((c) => c + STEP) };
}

export function LoadMore({ m }: { m: Pick<ReturnType<typeof useLoadMore>, 'more' | 'shown' | 'total' | 'sentinel' | 'showMore'> }) {
  if (!m.more) return null;
  return (
    <div ref={m.sentinel} className="flex items-center justify-center gap-3 py-4">
      <span className="text-xs text-[rgb(var(--text-secondary))] tnum">Showing {m.shown} of {m.total}</span>
      <button type="button" onClick={m.showMore} className="h-10 px-4 rounded-sm border border-border bg-surface text-sm font-bold text-ink hover:border-border-strong transition-colors">Show more</button>
    </div>
  );
}

const selectCls = 'h-10 rounded-sm border border-border bg-surface px-2 text-sm';

export function ActivityFilterBar({ f, total }: { f: ReturnType<typeof useActivityFilters>; total: number }) {
  const toggle = (label: string, on: boolean, set: (v: boolean) => void) => (
    <button type="button" aria-pressed={on} onClick={() => set(!on)}
      className={`h-10 px-3 rounded-sm border text-sm font-medium transition-colors ${on ? 'border-crimson-700 bg-crimson-50 text-crimson-700' : 'border-border bg-surface text-ink-soft hover:border-border-strong'}`}>{label}</button>
  );
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--text-tertiary))]" />
        <input type="search" aria-label="Search activities" value={f.query} onChange={(e) => f.setQuery(e.target.value)} placeholder="Search by name, type or description"
          className="h-10 w-full rounded-sm border border-border bg-surface pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-crimson-500" autoComplete="off" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Category" className={selectCls} value={f.category} onChange={(e) => f.setCategory(e.target.value)}>
          <option value="all">All categories</option>
          {f.categories.map(([c, n]) => <option key={c} value={c}>{c} ({n})</option>)}
        </select>
        <select aria-label="Duration" className={selectCls} value={f.length} onChange={(e) => f.setLength(e.target.value as typeof f.length)}>
          <option value="any">Any duration</option>
          <option value="short">Up to 4 hours</option>
          <option value="half">4 to 8 hours</option>
          <option value="long">Over 8 hours</option>
        </select>
        <select aria-label="Sort" className={selectCls} value={f.sort} onChange={(e) => f.setSort(e.target.value as typeof f.sort)}>
          <option value="price_low">Price: low to high</option>
          <option value="price_high">Price: high to low</option>
          <option value="name">Name: A to Z</option>
        </select>
        {toggle('Instant confirmation', f.instant, f.setInstant)}
        {toggle('Free cancellation', f.freeCancel, f.setFreeCancel)}
        {toggle('Open date', f.openDate, f.setOpenDate)}
        {f.hasListOnly && toggle('Bookable now', f.bookable, f.setBookable)}
        <span className="ml-auto text-xs text-[rgb(var(--text-secondary))] tnum">{f.filtered.length} of {total}</span>
      </div>
    </div>
  );
}
