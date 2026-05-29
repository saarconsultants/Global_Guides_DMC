'use client';

interface Props {
  agency: {
    name: string;
    tagline: string | null;
    logoUrl: string | null;
    primaryColor: string | null;
    accentColor: string | null;
  };
}

function shade(hex: string, percent: number) {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 0xff) + Math.round(255 * percent / 100)));
  const g = Math.max(0, Math.min(255, ((n >> 8)  & 0xff) + Math.round(255 * percent / 100)));
  const b = Math.max(0, Math.min(255, ( n        & 0xff) + Math.round(255 * percent / 100)));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

export function BrandingPreview({ agency }: Props) {
  const primary = agency.primaryColor ?? '#0369A1';
  const accent  = agency.accentColor  ?? '#C9A24A';
  const heroBg  = `linear-gradient(135deg, ${primary} 0%, ${shade(primary, -25)} 65%, #081428 100%)`;
  const name    = agency.name || 'Your agency';
  const tagline = agency.tagline || 'Smarter outbound trips, faster.';

  return (
    <div className="space-y-3 sticky top-24">
      <p className="text-[11px] uppercase tracking-widest text-[rgb(var(--text-secondary))] font-bold">Customer preview</p>
      <div className="rounded-xl overflow-hidden shadow-lg border border-border-subtle bg-surface">
        {/* Faux browser chrome */}
        <div className="bg-navy-50 px-3 py-2 flex items-center gap-1.5 border-b border-border-subtle">
          <span className="w-2.5 h-2.5 rounded-full bg-danger-500/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-warning-500/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-success-500/60" />
          <span className="ml-3 text-[10px] text-[rgb(var(--text-tertiary))] font-mono truncate">app.globalguides.com/p/abc…</span>
        </div>

        {/* Hero */}
        <div className="relative overflow-hidden text-white" style={{ background: heroBg }}>
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl" style={{ background: `${accent}40` }} />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full blur-3xl" style={{ background: `${primary}66` }} />
          <div className="relative p-5">
            <div className="flex items-center gap-2 mb-3">
              {agency.logoUrl ? (
                <img src={agency.logoUrl} alt={name} className="h-8 w-auto rounded bg-white/95 p-1" />
              ) : (
                <span className="h-8 w-8 rounded bg-white/20 backdrop-blur-md flex items-center justify-center text-sm font-extrabold">{(name || '?').slice(0, 1)}</span>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold leading-tight truncate">{name}</p>
                <p className="text-[10px] text-white/70 leading-tight truncate">{tagline}</p>
              </div>
            </div>
            <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: accent }}>Trip Proposal · GG-12345</p>
            <h2 className="mt-1 text-xl font-bold leading-tight">Paris &amp; Amsterdam</h2>
            <p className="mt-1 font-display italic text-xs" style={{ color: accent }}>A journey we built for you.</p>
            <div className="mt-3 flex items-center gap-2">
              <button className="text-[11px] font-semibold px-3 py-1.5 rounded" style={{ background: accent, color: '#081428' }}>Accept proposal</button>
              <button className="text-[11px] font-semibold px-3 py-1.5 rounded border border-white/40 text-white">Request changes</button>
            </div>
          </div>
        </div>

        {/* Body chip */}
        <div className="p-3 border-t border-border-subtle text-xs text-[rgb(var(--text-secondary))]">
          <p>✓ Day-by-day plan · Hotels · Transfers</p>
          <p className="mt-0.5 text-[10px] text-[rgb(var(--text-tertiary))]">Powered by Global Guides DMC</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-md p-2 border border-border-subtle" title="Primary brand colour">
          <div className="h-6 rounded" style={{ background: primary }} />
          <p className="mt-1 text-[10px] font-mono text-[rgb(var(--text-secondary))]">{primary}</p>
        </div>
        <div className="rounded-md p-2 border border-border-subtle" title="Accent colour (CTA + sparkles)">
          <div className="h-6 rounded" style={{ background: accent }} />
          <p className="mt-1 text-[10px] font-mono text-[rgb(var(--text-secondary))]">{accent}</p>
        </div>
      </div>
    </div>
  );
}
