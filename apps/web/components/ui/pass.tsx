import * as React from 'react';
import { cn } from '@/lib/utils';

/*
  The Pass — the world's core object. A white sheet split by a perforation
  into a MAIN panel (the label grid) and a STUB (price + the one action).

    <Pass>
      <PassMain> …fields… </PassMain>
      <PassStub> …price, action… </PassStub>
    </Pass>

  Perforation is vertical on wide screens, horizontal when stacked.
*/

export function Pass({ className, children, interactive, ...props }: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        'group relative flex flex-col lg:flex-row rounded-lg bg-surface border border-border-subtle shadow-sm overflow-hidden',
        interactive && 'lift cursor-pointer',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function PassMain({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex-1 min-w-0 p-4 lg:p-5', className)} {...props}>{children}</div>;
}

/** Tear line between main and stub: notches punched from the page ground. */
export function Perforation({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('relative shrink-0', className)}>
      <div className="lg:hidden perf-x mx-3" />
      <div className="hidden lg:block perf-y h-full" />
    </div>
  );
}

export function PassStub({ className, children, tone = 'paper', ...props }: React.HTMLAttributes<HTMLDivElement> & { tone?: 'paper' | 'crimson' | 'ink' }) {
  const bg = tone === 'crimson' ? 'bg-crimson-700 text-white' : tone === 'ink' ? 'bg-ink text-white' : 'bg-surface-2 text-ink';
  return (
    <div className={cn('shrink-0 lg:w-[220px] p-4 lg:p-5 flex flex-col justify-center gap-2', bg, className)} {...props}>
      {children}
    </div>
  );
}

/** One cell of the label grid: caps label over a bold value, optional sub line. */
export function Field({ label, value, sub, mono, big, className }: { label: string; value: React.ReactNode; sub?: React.ReactNode; mono?: boolean; big?: boolean; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="label">{label}</div>
      <div className={cn('mt-1 text-ink leading-none truncate', mono ? 'font-mono font-bold tnum' : 'font-bold', big ? 'text-[26px] tracking-[-0.02em]' : 'text-[15px]')}>{value}</div>
      {sub && <div className="mt-1 text-[12.5px] text-[rgb(var(--text-secondary))] truncate">{sub}</div>}
    </div>
  );}

/** Route chip: DEL → CDG → AMS in cockpit mono on ink. */
export function RouteCode({ codes, className, light }: { codes: string[]; className?: string; light?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-[6px] px-2 py-1 font-mono text-[11.5px] font-bold tracking-[0.04em] tnum', light ? 'bg-white/90 text-ink' : 'bg-ink text-white', className)}>
      {codes.map((c, i) => (
        <React.Fragment key={i}>{i > 0 && <span className="opacity-60">→</span>}<span>{c}</span></React.Fragment>
      ))}
    </span>
  );
}

/** Big three-letter code with a small name under it (FROM / TO cells). */
export function CityCode({ label, code, name }: { label: string; code: string; name?: string }) {
  return (
    <div className="min-w-0">
      <div className="label">{label}</div>
      <div className="mt-1 font-mono text-[34px] font-bold leading-none tracking-[-0.02em] text-ink tnum">{code}</div>
      {name && <div className="mt-1.5 text-[12.5px] text-[rgb(var(--text-secondary))] truncate">{name}</div>}
    </div>
  );
}
