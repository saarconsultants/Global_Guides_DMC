import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Spinner({ className, size = 'md' }: { className?: string; size?: 'xs' | 'sm' | 'md' | 'lg' }) {
  const dim = { xs: 'w-3 h-3', sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-7 h-7' }[size];
  return <Loader2 className={cn(dim, 'animate-spin text-crimson-700', className)} aria-hidden="true" />;
}

export function CenterSpinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 min-h-[40vh] text-[rgb(var(--text-secondary))]" role="status">
      <Spinner size="lg" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}
