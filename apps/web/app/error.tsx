'use client';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[GlobalError]', error);
    // Auto-file a BugReport so the platform team sees every uncaught client error
    try {
      fetch('/api/bug-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          severity: 'HIGH',
          category: 'BUG',
          title: `[Auto] ${error.message?.slice(0, 180) ?? 'Uncaught client error'}`,
          body: `An uncaught error was thrown while rendering a page.\n\nMessage: ${error.message ?? 'unknown'}\nDigest: ${error.digest ?? '—'}\nStack:\n${(error.stack ?? '').slice(0, 3000)}`,
          pageUrl: typeof window !== 'undefined' ? window.location.href : null,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : null,
        }),
      }).catch(() => {});
    } catch { /* swallow — already in error state */ }
  }, [error]);
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="mx-auto inline-flex items-center justify-center w-20 h-20 rounded-full bg-danger-100 text-danger-500 mb-6">
          <AlertTriangle className="w-9 h-9" />
        </div>
        <p className="text-[11px] uppercase tracking-widest text-danger-500 font-bold">Something went wrong</p>
        <h1 className="mt-3 text-2xl font-bold text-navy-900 tracking-tight">We couldn't render this page.</h1>
        <p className="mt-2 text-sm text-[rgb(var(--text-secondary))]">{error.message ?? 'Unknown error'}</p>
        {error.digest && <p className="mt-1 text-xs font-mono text-[rgb(var(--text-tertiary))]">ref: {error.digest}</p>}
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button onClick={reset}>Try again</Button>
          <Button variant="ghost" onClick={() => (window.location.href = '/dashboard')}>Back to dashboard</Button>
        </div>
      </div>
    </div>
  );
}
