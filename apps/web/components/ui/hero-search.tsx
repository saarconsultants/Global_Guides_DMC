import { cn } from '@/lib/utils';

// Modern "portal" search hero — deep-brand gradient band with a serif headline,
// plus a floating white unified search bar that overlaps the band bottom.
// Presentational only: search forms compose these and keep their own state.

export function HeroBand({ title, accent, subtitle, ghost, img, children }: {
  title: string;                 // plain part of the headline
  accent?: string;               // italic amber tail, e.g. "the world."
  subtitle?: string;
  ghost?: string;                // oversized faint word in the band corner
  img?: string | null;           // /promos/hero-*.jpg — photo behind a brand-tinted scrim
  children?: React.ReactNode;    // tabs etc., rendered under the copy
}) {
  return (
    <div className="relative overflow-hidden bg-[linear-gradient(135deg,#8C1816_0%,#630909_55%,#2E0404_100%)] text-white px-6 pt-10 pb-[76px]">
      {img ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover" />
          {/* Brand-tinted scrim keeps copy legible and the crimson identity over any photo. */}
          <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-[#1F0202]/90 via-[#630909]/65 to-[#2E0404]/35" />
        </>
      ) : (
        <>
          <div aria-hidden className="absolute -top-24 -right-16 w-[340px] h-[340px] rounded-full bg-[radial-gradient(circle,rgba(255,186,6,0.22),transparent_65%)]" />
          <div aria-hidden className="absolute -bottom-32 left-[22%] w-[420px] h-[420px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.07),transparent_60%)]" />
          {ghost && (
            <span aria-hidden className="absolute right-8 bottom-0 font-display italic font-medium text-[110px] leading-none text-white/5 select-none pointer-events-none">
              {ghost}
            </span>
          )}
        </>
      )}
      <div className="relative mx-auto max-w-7xl">
        <h1 className="font-display font-semibold text-[1.9rem] leading-tight tracking-tight">
          {title}{accent && <> <i className="italic text-amber-300">{accent}</i></>}
        </h1>
        {subtitle && <p className="mt-1.5 text-[13.5px] text-white/70">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

/** Segmented pill tabs that sit on the band (e.g. One-way / Round-trip). */
export function HeroTabs({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center bg-white/10 border border-white/15 rounded-full p-[3px] mt-5 backdrop-blur-sm">
      {children}
    </div>
  );
}
export function HeroTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-4 h-8 rounded-full text-[12.5px] font-semibold transition-colors',
        active ? 'bg-white text-crimson-900' : 'text-white/85 hover:text-white',
      )}
    >
      {children}
    </button>
  );
}

/** Floating white search bar overlapping the band bottom. Children = cells + submit. */
export function HeroBar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="relative mx-auto max-w-7xl px-6 -mt-12">
      <div className={cn(
        'bg-surface rounded-2xl border border-border-subtle flex flex-col lg:flex-row lg:items-stretch',
        'divide-y lg:divide-y-0 lg:divide-x divide-border-subtle',
        'shadow-[0_2px_4px_rgba(33,28,23,0.05),0_24px_48px_-16px_rgba(33,28,23,0.25)]',
        className,
      )}>
        {children}
      </div>
    </div>
  );
}

/** One field cell inside the bar: tiny caps eyebrow + a borderless control. */
export function HeroCell({ eyebrow, grow, children, className }: { eyebrow: string; grow?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('relative min-w-0 px-[18px] py-3', grow ? 'lg:flex-[1.4]' : 'lg:flex-1', className)}>
      <p className="text-[10px] uppercase tracking-[0.12em] font-bold text-[rgb(var(--text-tertiary))]">{eyebrow}</p>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

/** The big brand submit at the bar's end. */
export function HeroSubmit({ children = 'Search' }: { children?: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="shrink-0 bg-[linear-gradient(135deg,#8C1816,#630909)] text-white font-bold text-[14.5px] px-8 py-4 lg:py-0 rounded-b-2xl lg:rounded-bl-none lg:rounded-r-2xl hover:brightness-110 active:brightness-95 transition inline-flex items-center justify-center gap-2"
    >
      {children}
    </button>
  );
}

/** Toggle chip for the options row under the bar. */
export function HeroChip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3.5 h-8 text-xs font-semibold transition-colors',
        active
          ? 'border-crimson-700 text-crimson-900 bg-crimson-50/60'
          : 'border-border bg-surface text-[rgb(var(--text-secondary))] hover:border-border-strong',
      )}
    >
      {children}
    </button>
  );
}

/** Shared borderless control style for inputs/selects inside a HeroCell. */
export const heroControl = 'h-7 w-full border-0 bg-transparent p-0 text-[15px] font-semibold text-ink placeholder:text-[rgb(var(--text-tertiary))] placeholder:font-medium focus:outline-none focus:ring-0 rounded-none';
