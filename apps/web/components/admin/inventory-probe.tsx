'use client';

import { useState } from 'react';
import { RefreshCw, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface ProbeResult {
  reachable: boolean;
  status: number | null;
  ms: number;
  detail: string;
  checkedAt: string;
}

function timeAgo(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  return m < 60 ? `${m}m ago` : `${Math.round(m / 60)}h ago`;
}

export function InventoryProbe({ apiKey, live }: { apiKey: string; live: boolean }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProbeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function check() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/inventory-probe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: apiKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'Probe failed');
        setResult(null);
      } else {
        setResult(data);
      }
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-border-subtle/70 flex items-center justify-between gap-3">
      <div className="text-xs min-w-0">
        {error ? (
          <span className="text-danger-500">{error}</span>
        ) : result ? (
          <span className={`inline-flex items-center gap-1.5 ${result.reachable ? 'text-success-600' : 'text-danger-500'}`}>
            {result.reachable ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
            <span className="truncate">{result.detail} · {result.ms}ms · {timeAgo(result.checkedAt)}</span>
          </span>
        ) : (
          <span className="text-[rgb(var(--text-tertiary))]">{live ? 'Reachability not checked yet.' : 'Keys not set — nothing to probe.'}</span>
        )}
      </div>
      <button
        type="button"
        onClick={check}
        disabled={loading || !live}
        className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 h-7 text-xs font-semibold text-navy-700 hover:bg-navy-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        {loading ? 'Checking…' : 'Check now'}
      </button>
    </div>
  );
}
