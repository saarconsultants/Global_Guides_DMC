// Shared building blocks for the platform-admin area. Server-safe (no hooks),
// so every admin page can use them without becoming a client component.
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { cn, formatDateShort } from '@/lib/utils';

/** One admin container: 16px mobile gutter, same max width on every page. */
export function AdminPage({ children, narrow, className }: { children: React.ReactNode; narrow?: boolean; className?: string }) {
  return (
    <div className={cn('w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6', narrow ? 'max-w-3xl lg:mx-0' : 'max-w-7xl', className)}>
      {children}
    </div>
  );
}

/** The single filter-chip style used across admin: crimson wash + crimson border when active. */
export function FilterChip({ href, label, active, count }: { href: string; label: string; active: boolean; count?: number }) {
  return (
    <Link
      href={href as any}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'inline-flex items-center gap-1.5 h-8 px-3 rounded-[10px] border text-[13px] font-semibold whitespace-nowrap transition-colors',
        active
          ? 'border-crimson-700 bg-crimson-50 text-crimson-700'
          : 'border-border bg-surface text-ink-soft hover:border-border-strong hover:text-ink',
      )}
    >
      {label}
      {count != null && <span className={cn('tnum text-[12px] font-bold', active ? 'text-crimson-700' : 'text-[rgb(var(--text-tertiary))]')}>{count}</span>}
    </Link>
  );
}

/** A row of chips with a caps label in front. */
export function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="label mr-1">{label}</span>
      {children}
    </div>
  );
}

/** Crimson mono code that links to its record. */
export function CodeLink({ href, code }: { href: string; code: string }) {
  return (
    <Link href={href as any} className="font-mono text-[12.5px] font-bold text-crimson-700 hover:underline whitespace-nowrap">
      {code}
    </Link>
  );
}

/** Printed date: mono, uppercased, never wraps. */
export function PrintedDate({ d, className }: { d: string | Date; className?: string }) {
  return <span className={cn('font-mono uppercase whitespace-nowrap text-[12px]', className)}>{formatDateShort(d)}</span>;
}

/** Styled disclosure (native <details>, works without JS). */
export function Disclosure({ summary, children, className, defaultOpen }: { summary: React.ReactNode; children: React.ReactNode; className?: string; defaultOpen?: boolean }) {
  return (
    <details className={cn('group', className)} open={defaultOpen}>
      <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer select-none inline-flex items-center gap-1.5 min-h-8 text-[13px] font-semibold text-ink-soft hover:text-ink">
        <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
        {summary}
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}

/** A label + value pair for the stacked mobile rows. */
export function RowFact({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="label">{label}</p>
      <div className="mt-1 text-[14px] font-semibold text-ink truncate">{children}</div>
    </div>
  );
}

/** Compact empty state: a small ghost pass beside the message. Keeps empty cards short. */
export function GhostEmpty({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 py-2">
      <div aria-hidden className="w-[92px] h-[52px] shrink-0 rounded-md border-2 border-dashed border-border flex overflow-hidden bg-surface">
        <div className="flex-1 p-2 space-y-1.5">
          <div className="h-1.5 w-3/4 rounded bg-navy-100" />
          <div className="h-1.5 w-1/2 rounded bg-navy-100" />
          <div className="h-1.5 w-2/3 rounded bg-navy-100" />
        </div>
        <div className="w-0 border-l-2 border-dashed border-border" />
        <div className="w-6 bg-navy-50 flex items-center justify-center"><span className="barcode h-6 w-3 text-navy-200" /></div>
      </div>
      <div className="min-w-0">
        <p className="text-[15px] font-bold text-ink">{title}</p>
        {body && <p className="text-[13px] text-[rgb(var(--text-secondary))] mt-0.5 leading-relaxed">{body}</p>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}
