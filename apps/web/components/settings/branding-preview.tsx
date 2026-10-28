'use client';
import { Check } from 'lucide-react';

interface Props {
  agency: {
    name: string;
    tagline: string | null;
    logoUrl: string | null;
    primaryColor: string | null;
    accentColor: string | null;
  };
}

export function BrandingPreview({ agency }: Props) {
  const primary = agency.primaryColor ?? '#0369A1';
  const accent  = agency.accentColor  ?? '#C9A24A';
  const name    = agency.name || 'Your agency';
  const tagline = agency.tagline || 'Smarter outbound trips, faster.';

  return (
    <div className="space-y-3 lg:sticky lg:top-24">
      <p className="label">Customer preview</p>
      <div className="rounded-lg overflow-hidden shadow-lg border border-border-subtle bg-surface">
        {/* Faux browser chrome */}
        <div className="bg-navy-50 px-3 py-2 flex items-center gap-1.5 border-b border-border-subtle">
          <span className="w-2.5 h-2.5 rounded-full bg-danger-500/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-warning-500/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-success-500/60" />
          <span className="ml-3 text-[10px] text-[rgb(var(--text-tertiary))] font-mono truncate">app.globalguides.com/p/abc…</span>
        </div>

        {/* Hero — mirrors the customer page: flat ink band, logo on a white plate. */}
        <div className="bg-ink text-white p-5">
          <div className="flex items-center gap-2 mb-3">
            {agency.logoUrl ? (
              <span className="h-8 rounded bg-white px-1 flex items-center"><img src={agency.logoUrl} alt={name} className="h-6 w-auto max-w-[90px] object-contain" /></span>
            ) : (
              <span className="h-8 w-8 rounded bg-white text-ink flex items-center justify-center text-sm font-extrabold">{(name || '?').slice(0, 1)}</span>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold leading-tight truncate">{name}</p>
              <p className="text-[10px] text-white/70 leading-tight truncate">{tagline}</p>
            </div>
          </div>
          <h2 className="mt-1 text-xl font-bold leading-tight">Paris &amp; Amsterdam</h2>
          <p className="mt-1 text-xs text-white/75">Your trip proposal from {name}.</p>
        </div>
        {/* Price stub in the primary colour, accent on the secondary action. */}
        <div className="px-4 py-3 text-white flex items-center justify-between gap-2" style={{ background: primary }}>
          <div>
            <p className="text-[9px] uppercase tracking-[0.14em] font-bold text-white/75">Trip total</p>
            <p className="money text-[16px] leading-tight">₹1,84,500</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10.5px] font-bold px-2.5 py-1.5 rounded bg-white" style={{ color: primary }}>Accept</span>
            <span className="text-[10.5px] font-bold px-2.5 py-1.5 rounded" style={{ background: accent, color: '#081428' }}>Changes</span>
          </div>
        </div>

        {/* Body chip */}
        <div className="p-3 border-t border-border-subtle text-xs text-[rgb(var(--text-secondary))]">
          <p className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5" />Day-by-day plan · Hotels · Transfers</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-md p-2 border border-border-subtle">
          <div className="h-6 rounded" style={{ background: primary }} />
          <p className="mt-1.5 label">Primary</p>
          <p className="text-[10px] font-mono text-[rgb(var(--text-secondary))]">{primary}</p>
        </div>
        <div className="rounded-md p-2 border border-border-subtle">
          <div className="h-6 rounded" style={{ background: accent }} />
          <p className="mt-1.5 label">Accent</p>
          <p className="text-[10px] font-mono text-[rgb(var(--text-secondary))]">{accent}</p>
        </div>
      </div>
    </div>
  );
}
