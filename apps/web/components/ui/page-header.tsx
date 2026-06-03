import { cn } from '@/lib/utils';

interface Props {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ eyebrow, title, description, actions, className }: Props) {
  return (
    <header className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0 flex-1">
        {eyebrow && <p className="text-[11px] uppercase tracking-widest text-crimson-700 font-bold mb-1">{eyebrow}</p>}
        <h1 className="font-display text-3xl font-semibold tracking-tight text-navy-900">{title}</h1>
        {description && <p className="text-sm text-[rgb(var(--text-secondary))] mt-1.5 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </header>
  );
}
