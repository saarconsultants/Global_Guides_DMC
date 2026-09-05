import { cn } from '@/lib/utils';

interface Props {
  /** Accepted for compatibility; the heading carries its own weight now. */
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: Props) {
  return (
    <header className={cn('flex flex-col items-start gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between', className)}>
      <div className="min-w-0 flex-1">
        <h1 className="text-[28px] leading-[1.1] font-extrabold tracking-[-0.02em] text-ink">{title}</h1>
        {description && <p className="text-[14.5px] text-[rgb(var(--text-secondary))] mt-2 max-w-2xl leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </header>
  );
}
