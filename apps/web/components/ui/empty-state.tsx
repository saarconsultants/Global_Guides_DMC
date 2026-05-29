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
        <div className="mx-auto mb-5 inline-flex items-center justify-center w-16 h-16 rounded-full bg-navy-50 text-crimson-700">{icon}</div>
      ) : null}
      <h3 className="text-lg font-semibold text-navy-900">{title}</h3>
      {body && <p className="mt-1.5 text-sm text-[rgb(var(--text-secondary))] leading-relaxed">{body}</p>}
      {(primary || secondary) && (
        <div className="mt-5 flex items-center justify-center gap-2">
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
