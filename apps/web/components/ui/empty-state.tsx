import { cn } from '@/lib/utils';
import { Button, ButtonLink } from './button';

interface Props {
  icon?: React.ReactNode;
  title: string;
  body?: string;
  primary?: { label: string; href?: string; onClick?: () => void };
  secondary?: { label: string; href?: string; onClick?: () => void };
  className?: string;
  dense?: boolean;
}

/**
 * A ghost pass: the empty slot drawn with the real geometry of a filled one
 * (DESIGN.md "Empty & Fallback States"). `small` is the compact size used by
 * `dense` empty states inside cards and side panels.
 */
function GhostPass({ icon, small }: { icon?: React.ReactNode; small?: boolean }) {
  return (
    <div aria-hidden className={cn('mx-auto rounded-lg border-2 border-dashed border-border flex overflow-hidden bg-surface/60', small ? 'mb-4 w-[200px] max-w-full' : 'mb-6 w-[260px] max-w-full')}>
      <div className={cn('flex-1 min-w-0 space-y-2.5', small ? 'p-3' : 'p-4')}>
        <div className="flex items-center gap-3">
          <span className={cn('shrink-0 rounded-md bg-navy-50 text-navy-500 inline-flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4', small ? 'w-7 h-7' : 'w-9 h-9 [&>svg]:w-5 [&>svg]:h-5')}>{icon}</span>
          <div className="space-y-1.5 flex-1"><div className="h-2 w-2/3 rounded bg-navy-100" /><div className="h-2 w-1/3 rounded bg-navy-100" /></div>
        </div>
        <div className="grid grid-cols-3 gap-2 pt-1">
          {[0, 1, 2].map((i) => <div key={i}><div className="h-1.5 w-8 rounded bg-navy-100" /><div className="mt-1.5 h-2.5 w-6 rounded bg-navy-100" /></div>)}
        </div>
      </div>
      <div className="w-0 border-l-2 border-dashed border-border" />
      <div className={cn('bg-navy-50 flex items-center justify-center', small ? 'w-12' : 'w-16')}><span className={cn('barcode text-navy-200', small ? 'h-6 w-5' : 'h-8 w-6')} /></div>
    </div>
  );
}

/**
 * Empty list / empty panel. Always drawn as a ghost pass above the title —
 * never a centred icon-and-sentence block. `dense` = compact ghost pass and
 * tighter spacing for use inside a card or side panel.
 */
export function EmptyState({ icon, title, body, primary, secondary, className, dense }: Props) {
  return (
    <div className={cn('text-center mx-auto max-w-md px-2', dense ? 'py-8' : 'py-16', className)}>
      <GhostPass icon={icon} small={dense} />
      <h2 className={cn('text-ink tracking-[-0.01em]', dense ? 'text-[17px] font-bold' : 'text-[22px] font-extrabold')}>{title}</h2>
      {body && <p className="mt-1.5 text-sm text-[rgb(var(--text-secondary))] leading-relaxed">{body}</p>}
      {(primary || secondary) && (
        <div className={cn('flex flex-wrap items-center justify-center gap-2', dense ? 'mt-4' : 'mt-6')}>
          {primary && (primary.href ? (
            <ButtonLink href={primary.href as any}>{primary.label}</ButtonLink>
          ) : <Button onClick={primary.onClick}>{primary.label}</Button>)}
          {secondary && (secondary.href ? (
            <ButtonLink href={secondary.href as any} variant="ghost">{secondary.label}</ButtonLink>
          ) : <Button variant="ghost" onClick={secondary.onClick}>{secondary.label}</Button>)}
        </div>
      )}
    </div>
  );
}
