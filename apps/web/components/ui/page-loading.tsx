import { Skeleton } from './skeleton';

// Route-level loading skeletons (used by app/**/loading.tsx). Renders instantly
// on navigation while the server component fetches, so pages never flash blank.

function Header() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-7 w-56" />
      <Skeleton className="h-4 w-80 max-w-full" />
    </div>
  );
}

function StatsRow({ n = 4 }: { n?: number }) {
  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="rounded-lg bg-surface border border-border-subtle p-5 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

function TableBlock({ rows = 6 }: { rows?: number }) {
  return (
    <div className="rounded-lg bg-surface border border-border-subtle p-4 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3.5 w-16 ml-auto" />
        </div>
      ))}
    </div>
  );
}

function CardGrid({ n = 6 }: { n?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="rounded-lg bg-surface border border-border-subtle overflow-hidden">
          <Skeleton className="h-40 w-full rounded-none" />
          <div className="p-4 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PageLoading({ variant = 'list' }: { variant?: 'list' | 'search' | 'dashboard' }) {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10 space-y-6" aria-busy="true">
      <Header />
      {variant === 'dashboard' && <><StatsRow /><div className="grid gap-6 lg:grid-cols-2"><TableBlock rows={4} /><TableBlock rows={4} /></div></>}
      {variant === 'list' && <><StatsRow /><TableBlock /></>}
      {variant === 'search' && <><Skeleton className="h-28 w-full rounded-lg" /><CardGrid /></>}
    </div>
  );
}
