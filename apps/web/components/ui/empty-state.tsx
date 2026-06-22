import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Button } from './button';

interface Props {
  icon?: React.ReactNode;          // 56px line-art SVG
  title: string;
  body?: string;
  primary?: { label: string; href?: string; onClick?: () => void };
  secondary?: { label: string; href?: string; onClick?: () => void };
  className?: string;
  dense?: boolean;                  // smaller padding for table-empty rows
}

export function EmptyState({ icon, title, body, primary, secondary, className, dense }: Props) {
  return (
    <div className={cn('text-center mx-auto max-w-md', dense ? 'py-10' : 'py-20', className)}>
      {icon ? (
        dense ? (
          <div className="mx-auto mb-4 inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-crimson-50 to-amber-50 border border-crimson-100 text-crimson-700">
            {icon}
          </div>
        ) : (
          // Layered stage: soft halo → dashed orbit (amber marker) → gradient disc.
          <div className="relative w-32 h-32 mx-auto mb-6">
            <div className="absolute -inset-7 rounded-full bg-[radial-gradient(closest-side,rgba(255,186,6,0.16),rgba(99,9,9,0.05)_65%,transparent)]" />
            <div className="absolute inset-0 rounded-full border-[1.5px] border-dashed border-crimson-700/25" />
            <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-amber-500 ring-[3px] ring-surface" />
            <div className="absolute inset-[22px] rounded-full bg-gradient-to-br from-crimson-50 to-amber-50 border border-crimson-100 flex items-center justify-center text-crimson-700 shadow-[inset_0_-6px_14px_rgba(99,9,9,0.06),0_10px_24px_-12px_rgba(99,9,9,0.25)]">
              {icon}
            </div>
          </div>
        )
      ) : null}
      <h3 className={cn('text-ink', dense ? 'text-lg font-semibold' : 'font-display text-2xl font-semibold')}>{title}</h3>
      {body && <p className="mt-1.5 text-sm text-[rgb(var(--text-secondary))] leading-relaxed">{body}</p>}
      {(primary || secondary) && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {primary && (primary.href ? (
            <Link href={primary.href as any}><Button>{primary.label}</Button></Link>
          ) : <Button onClick={primary.onClick}>{primary.label}</Button>)}
          {secondary && (secondary.href ? (
            <Link href={secondary.href as any}><Button variant="ghost">{secondary.label}</Button></Link>
          ) : <Button variant="ghost" onClick={secondary.onClick}>{secondary.label}</Button>)}
        </div>
      )}
    </div>
  );
}
