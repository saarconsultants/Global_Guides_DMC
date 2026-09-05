import { Card, CardContent } from './card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  delta?: { curr: number; prev: number };
  tone?: 'navy' | 'gold' | 'success' | 'warning';
  mono?: boolean;
}

// A stat is one cell of the label grid: caps label, big tabular value, delta.
export function StatCard({ label, value, sub, icon, delta, tone = 'navy', mono }: StatCardProps) {
  const valueColor = tone === 'gold' ? 'text-amber-700' : tone === 'success' ? 'text-success-500' : tone === 'warning' ? 'text-warning-500' : 'text-ink';
  const valueType = mono ? 'money text-[28px]' : 'text-[30px] font-extrabold tnum tracking-[-0.02em]';
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between gap-2">
          <p className="label inline-flex items-center gap-1.5">{icon && <span className="text-crimson-700">{icon}</span>}{label}</p>
          {delta && <Delta curr={delta.curr} prev={delta.prev} />}
        </div>
        <p className={`mt-2 leading-none ${valueType} ${valueColor}`}>{value}</p>
        {sub && <p className="mt-2 text-[13px] text-[rgb(var(--text-secondary))]">{sub}</p>}
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
  const cls = tone === 'up' ? 'text-success-600 bg-success-100' : tone === 'down' ? 'text-danger-500 bg-danger-100' : 'text-[rgb(var(--text-tertiary))] bg-surface-2';
  return <span className={`inline-flex items-center gap-0.5 text-[10.5px] font-bold px-1.5 py-0.5 rounded-[5px] tnum ${cls}`}>{icon}{children}</span>;
}
