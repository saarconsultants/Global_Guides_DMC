import { Card, CardContent } from './card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  /** Period-over-period delta; renders an up/down/flat chip. */
  delta?: { curr: number; prev: number };
  tone?: 'navy' | 'gold' | 'success' | 'warning';
  mono?: boolean;
}

// Unified KPI / stat tile used across dashboard, leads, bookings, team, admin.
export function StatCard({ label, value, sub, icon, delta, tone = 'navy', mono }: StatCardProps) {
  const valueColor = tone === 'gold' ? 'text-amber-700' : tone === 'success' ? 'text-success-500' : tone === 'warning' ? 'text-warning-500' : 'text-ink';
  // Serif numerals for display tone; keep mono+tabular for currency alignment.
  const valueType = mono ? 'text-3xl font-bold font-mono tabular-nums tracking-tight' : 'font-display text-[1.9rem] font-semibold tracking-tight';
  return (
    <Card className="lift relative overflow-hidden">
      {/* Signature crimson accent stripe */}
      <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-crimson-700 to-crimson-900" aria-hidden />
      <CardContent className="pt-5">
        <div className="flex items-center justify-between gap-2">
          <p className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-[rgb(var(--text-secondary))] font-bold">
            {icon && <span className="text-crimson-700">{icon}</span>}{label}
          </p>
          {delta && <Delta curr={delta.curr} prev={delta.prev} />}
        </div>
        <p className={`mt-1.5 ${valueType} ${valueColor}`}>{value}</p>
        {sub && <p className="mt-1 text-sm text-[rgb(var(--text-secondary))]">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function Delta({ curr, prev }: { curr: number; prev: number }) {
  if (prev === 0 && curr === 0) return <Chip tone="muted" icon={<Minus className="w-3 h-3" />}>—</Chip>;
  if (prev === 0) return <Chip tone="up" icon={<TrendingUp className="w-3 h-3" />}>new</Chip>;
  const pct = Math.round(((curr - prev) / prev) * 100);
  if (pct === 0) return <Chip tone="muted" icon={<Minus className="w-3 h-3" />}>flat</Chip>;
  const up = pct > 0;
  return <Chip tone={up ? 'up' : 'down'} icon={up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}>{up ? '+' : ''}{pct}%</Chip>;
}

function Chip({ tone, icon, children }: { tone: 'up' | 'down' | 'muted'; icon: React.ReactNode; children: React.ReactNode }) {
  const cls = tone === 'up' ? 'text-success-600 bg-success-500/10' : tone === 'down' ? 'text-danger-500 bg-danger-500/10' : 'text-[rgb(var(--text-tertiary))] bg-surface-2';
  return <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cls}`}>{icon}{children}</span>;
}
