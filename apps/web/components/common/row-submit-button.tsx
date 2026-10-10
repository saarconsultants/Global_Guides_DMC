'use client';
// Small text-style submit button for server-action forms inside table rows /
// mobile cards. Shows a spinner + pending label while the action runs so the
// tap visibly registers, and keeps a ≥24px hit area.
import { useFormStatus } from 'react-dom';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

interface Props {
  icon?: React.ReactNode;
  label: string;
  pendingLabel?: string;
  title?: string;
  className?: string;
}

export function RowSubmitButton({ icon, label, pendingLabel, title, className }: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      title={title}
      className={cn(
        'inline-flex items-center gap-1 min-h-6 text-xs text-[rgb(var(--text-secondary))] hover:text-crimson-700 disabled:cursor-wait disabled:opacity-70',
        className,
      )}
    >
      {pending ? <Spinner size="xs" /> : icon}
      {pending ? (pendingLabel ?? `${label}…`) : label}
    </button>
  );
}
