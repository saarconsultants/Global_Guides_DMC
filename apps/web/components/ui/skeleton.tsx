import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div role="status" aria-label="Loading" className={cn('animate-pulse rounded-md bg-navy-100/70', className)} {...props} />;
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3" style={{ width: `${100 - i * 8}%` }} />
      ))}
    </div>
  );
}

export function SkeletonRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-border-subtle">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-3 pr-4"><Skeleton className="h-3.5 w-full max-w-[160px]" /></td>
      ))}
    </tr>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-lg bg-surface border border-border-subtle p-6 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}
