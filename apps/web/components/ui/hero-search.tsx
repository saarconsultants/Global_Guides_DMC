import { cn } from '@/lib/utils';

// Search hero in the boarding-pass world: a photo band with a headline, then
// the PASS — a white bar of label-grid cells with a perforation before the
// crimson SEARCH stub — overlapping the band's bottom edge.
// Presentational only: the search forms compose these and keep their state.

export function HeroBand({ title, accent, subtitle, img, children }: {
  title: string;
  accent?: string;
  subtitle?: string;
  ghost?: string;               // accepted, unused
  img?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden bg-ink text-white px-6 pt-12 pb-[92px]">
      {img && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,12,18,0.82)_0%,rgba(10,12,18,0.48)_45%,rgba(10,12,18,0.08)_85%)]" />
        </>
      )}
      <div className="relative mx-auto max-w-7xl">
        <h1 className="text-[34px] lg:text-[42px] leading-[1.02] font-extrabold tracking-[-0.02em] max-w-3xl [text-wrap:balance]">
          {title}{accent && <> {accent}</>}
        </h1>
        {subtitle && <p className="mt-3 text-[15px] text-white/80 max-w-2xl">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

/** Pills that sit on the band (One-way / Round-trip, or product switch). */
export function HeroTabs({ children }: { children: React.ReactNode }) {
  return <div className="inline-flex items-center gap-2 mt-6">{children}</div>;
}
export function HeroTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'h-9 px-4 rounded-full text-[13px] font-bold transition-colors border',
        active ? 'bg-amber-500 text-ink border-amber-500' : 'bg-white/12 text-white border-white/25 hover:bg-white/20 backdrop-blur-sm',
      )}
    >
      {children}
    </button>
  );
}

/** The pass: white sheet, overlapping the band's bottom edge. */
export function HeroBar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="relative mx-auto max-w-7xl px-6 -mt-[60px]">
      <div className={cn('bg-surface rounded-lg shadow-xl flex flex-col lg:flex-row lg:items-stretch overflow-hidden', className)}>
        {children}
      </div>
    </div>
  );
}

/** One label-grid cell. */
export function HeroCell({ eyebrow, grow, children, className }: { eyebrow: string; grow?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('relative min-w-0 px-5 py-4 border-b lg:border-b-0 lg:border-r border-border-subtle', grow ? 'lg:flex-[1.35]' : 'lg:flex-1', className)}>
      <p className="label">{eyebrow}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

/** The crimson stub at the pass's end, behind a perforation. */
export function HeroSubmit({ children = 'Search', caption }: { children?: React.ReactNode; caption?: string }) {
  return (
    <>
      <div aria-hidden className="hidden lg:block w-0 border-l-2 border-dashed border-border self-stretch" />
      <button
        type="submit"
        className="relative shrink-0 lg:w-[232px] bg-crimson-700 text-white px-6 lg:pr-14 py-5 lg:py-0 hover:bg-crimson-900 active:bg-crimson-900 transition-colors flex flex-col items-start justify-center gap-1"
      >
        <span aria-hidden className="barcode absolute right-4 top-4 h-7 w-6 text-white/50 hidden lg:block" />
        <span className="inline-flex items-center gap-2 text-[17px] font-extrabold tracking-[0.02em] uppercase">{children}</span>
        {caption && <span className="font-mono text-[11px] tracking-[0.08em] text-white/80 uppercase">{caption}</span>}
      </button>
    </>
  );
}

/** Toggle chip for the options row under the pass. */
export function HeroChip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={!!active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-3 h-9 text-[13px] font-semibold transition-colors',
        active ? 'border-crimson-700 text-crimson-700 bg-crimson-50' : 'border-border bg-surface text-navy-700 hover:border-border-strong',
      )}
    >
      {children}
    </button>
  );
}

/**
 * Date cell: the pass's own mono date over the native control. The input stays
 * a real <input type="date"> (calendar, keyboard, validation) but is made
 * transparent and stretched over the printed value, so the cell reads as a pass
 * date and still behaves as a date field.
 */
export function HeroDate({ value, min, onChange, label, sub }: { value: string; min?: string; onChange: (v: string) => void; label: string; sub?: string }) {
  const d = value ? new Date(value + 'T00:00:00') : null;
  return (
    <div className="relative">
      <div className="font-mono text-[19px] font-bold leading-none text-ink tnum">
        {d ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() : '—'}
      </div>
      {sub && <div className="mt-1 text-[12px] text-[rgb(var(--text-secondary))]">{sub}{d ? ` · ${d.toLocaleDateString('en-GB', { weekday: 'long' })}` : ''}</div>}
      <input
        type="date"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
    </div>
  );
}

/** Borderless control inside a HeroCell: bold value type. */
export const heroControl = 'h-7 w-full border-0 bg-transparent p-0 text-[17px] font-bold text-ink tnum placeholder:text-[rgb(var(--text-tertiary))] placeholder:font-medium focus:outline-none focus:ring-0 rounded-none';
