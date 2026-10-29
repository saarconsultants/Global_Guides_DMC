import Link from 'next/link';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AutoSubmitSelect } from './auto-submit-select';

/**
 * FilterBar — the one list-filter pattern (search + optional status select +
 * optional chips) on ONE row from md up, wrapping on mobile.
 *
 * It is a plain GET <form>, so it works from a server component and the
 * filters live in the URL. There is no "Filter" button: the search submits on
 * Enter, the status select submits as soon as it changes, and chips are links.
 *
 * Usage (server component, e.g. app/leads/page.tsx):
 *
 *   <FilterBar
 *     action="/leads"
 *     q={sp.q}
 *     searchPlaceholder="Search by name, phone or destination"
 *     searchLabel="Search leads"
 *     status={{
 *       value: sp.status,
 *       label: 'Filter by status',
 *       options: [{ value: '', label: 'All statuses' }, { value: 'NEW', label: 'New' }],
 *     }}
 *     keep={{ view: sp.view }}            // other params to carry through the form
 *     clearHref="/leads"                  // shows "Clear" when anything is filtered
 *   >
 *     <FilterChip href="/leads?mine=1" active={sp.mine === '1'}>Mine</FilterChip>
 *   </FilterBar>
 */
export interface FilterBarProps {
  /** URL the GET form submits to (usually the current page path). */
  action: string;
  /** Current search text (from searchParams). */
  q?: string;
  /** Name of the search param. Default "q". */
  searchName?: string;
  searchPlaceholder?: string;
  /** Accessible label for the search box. */
  searchLabel?: string;
  /** Optional status dropdown; submits on change. */
  status?: {
    name?: string; // default "status"
    value?: string;
    label?: string; // accessible label
    options: { value: string; label: string }[];
  };
  /** Extra params to keep when the form submits (rendered as hidden inputs; empty values skipped). */
  keep?: Record<string, string | undefined | null>;
  /** When set and a search/status is active, shows a "Clear" link to this URL. */
  clearHref?: string;
  /** Chips (use <FilterChip>) or any extra controls, laid out after the select. */
  children?: React.ReactNode;
  className?: string;
}

export function FilterBar({
  action, q, searchName = 'q', searchPlaceholder = 'Search', searchLabel, status, keep, clearHref, children, className,
}: FilterBarProps) {
  const statusName = status?.name ?? 'status';
  const active = Boolean(q) || Boolean(status?.value);
  return (
    <form method="GET" action={action} role="search" className={cn('flex flex-col gap-2 md:flex-row md:items-center', className)}>
      {keep && Object.entries(keep).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}

      <div className="relative flex-1 min-w-0">
        <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--text-tertiary))]" />
        <input
          type="search"
          name={searchName}
          defaultValue={q ?? ''}
          aria-label={searchLabel ?? searchPlaceholder}
          placeholder={searchPlaceholder}
          enterKeyHint="search"
          className="h-11 w-full rounded-md border border-border bg-surface pl-10 pr-3.5 text-[15px] font-medium text-ink placeholder:text-[rgb(var(--text-tertiary))] placeholder:font-normal transition-colors duration-150 ease-standard hover:border-border-strong focus:border-crimson-700 focus:outline-none focus:ring-2 focus:ring-crimson-700/15"
        />
      </div>

      {(status || children || (clearHref && active)) && (
        <div className="flex flex-wrap items-center gap-2 md:flex-nowrap md:shrink-0">
          {status && (
            <AutoSubmitSelect
              name={statusName}
              defaultValue={status.value ?? ''}
              aria-label={status.label ?? 'Filter by status'}
              className="w-auto min-w-[160px] flex-1 md:flex-none"
            >
              {status.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </AutoSubmitSelect>
          )}
          {children}
          {clearHref && active && (
            <Link href={clearHref as any} className="inline-flex items-center gap-1 h-9 px-2 rounded-md text-[13px] font-semibold text-navy-700 hover:bg-navy-50 hover:text-ink">
              <X className="w-3.5 h-3.5" />Clear
            </Link>
          )}
        </div>
      )}

      {/* Lets Enter submit in every browser; invisible because filtering is instant. */}
      <button type="submit" className="sr-only" tabIndex={-1}>Search</button>
    </form>
  );
}

/** A filter chip link: 36px, hairline; selected = crimson border, crimson text, crimson-50 fill. */
export function FilterChip({ href, active, children, className }: { href: string; active?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={href as any}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'inline-flex items-center gap-1.5 h-9 px-3 rounded-md border text-[13px] font-semibold whitespace-nowrap transition-[color,background-color,border-color,transform] duration-150 ease-out active:scale-[0.97]',
        active ? 'border-crimson-700 bg-crimson-50 text-crimson-700' : 'border-border bg-surface text-ink-soft hover:border-border-strong',
        className,
      )}
    >
      {children}
    </Link>
  );
}
