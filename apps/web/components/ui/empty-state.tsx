import { cn } from '@/lib/utils';
import Link from 'next/link';
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

/** A ghost pass: the empty slot drawn with the real geometry of a filled one. */
function GhostPass({ icon }: { icon?: React.ReactNode }) {
  return (
    <div aria-hidden className="mx-auto mb-6 w-[260px] rounded-lg border-2 border-dashed border-border flex overflow-hidden bg-surface/60">
      <div className="flex-1 p-4 space-y-2.5">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-md bg-navy-50 text-navy-500 inline-flex items-center justify-center">{icon}</span>
          <div className="space-y-1.5 flex-1"><div className="h-2 w-2/3 rounded bg-navy-100" /><div className="h-2 w-1/3 rounded bg-navy-100" /></div>
        </div>
        <div className="grid grid-cols-3 gap-2 pt-1">
          {[0, 1, 2].map((i) => <div key={i}><div className="h-1.5 w-8 rounded bg-navy-100" /><div className="mt-1.5 h-2.5 w-6 rounded bg-navy-100" /></div>)}
        </div>
      </div>
      <div className="w-0 border-l-2 border-dashed border-border" />
      <div className="w-16 bg-navy-50 flex items-center justify-center"><span className="barcode h-8 w-6 text-navy-200" /></div>
    </div>
  );
}

export function EmptyState({ icon, title, body, primary, secondary, className, dense }: Props) {
  return (
    <div className={cn('text-center mx-auto max-w-md', dense ? 'py-10' : 'py-16', className)}>
      {dense ? (
        icon ? <div className="mx-auto mb-4 inline-flex items-center justify-center w-12 h-12 rounded-md bg-navy-50 text-navy-500">{icon}</div> : null
      ) : (
        <GhostPass icon={icon} />
      )}
      <h3 className={cn('text-ink tracking-[-0.01em]', dense ? 'text-lg font-bold' : 'text-[22px] font-extrabold')}>{title}</h3>
      {body && <p className="mt-1.5 text-sm text-[rgb(var(--text-secondary))] leading-relaxed">{body}</p>}
      {(primary || secondary) && (
        <div className="mt-6 flex items-center justify-center gap-2">
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
