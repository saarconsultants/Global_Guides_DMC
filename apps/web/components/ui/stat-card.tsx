import { Card } from './card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  /** Optional one-line context under the value, e.g. "quotes sent". */
  sub?: string;
  icon?: React.ReactNode;
  delta?: { curr: number; prev: number };
  /**
   * Value colour. `navy` (default) is ink; `success` / `warning` are semantic.
   * `gold` is kept for compatibility and renders as ink — amber is reserved for
   * live/waiting cells (DESIGN.md › The Live Cell Rule), not for highlighting a KPI.
   */
  tone?: 'navy' | 'gold' | 'success' | 'warning';
  /** The value is money: set in `.money` (Archivo bold tabular, never mono). */
  money?: boolean;
  /** @deprecated legacy name for `money` — kept so existing pages compile. */
  mono?: boolean;
  className?: string;
}

/**
 * One stat cell of the label grid: caps label, big tabular value, optional
 * sub-line and delta chip. The value shrinks on narrow cards and wraps
 * anywhere rather than running into the card edge (2-up at 390px).
 *
 *   <StatCard label="Wallet" value={formatINR(w)} sub="available balance" money />
 */
export function StatCard({ label, value, sub, icon, delta, tone = 'navy', money, mono, className }: StatCardProps) {
  const isMoney = money || mono;
  const valueColor = tone === 'success' ? 'text-success-500' : tone === 'warning' ? 'text-warning-500' : 'text-ink';
  const valueType = isMoney
    ? 'money text-[20px] sm:text-[24px] lg:text-[28px]'
    : 'text-[24px] sm:text-[28px] lg:text-[30px] font-extrabold tnum tracking-[-0.02em]';
  return (
    <Card className={cn('min-w-0', className)}>
      <div className="px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 min-w-0">
          <p className="label inline-flex items-center gap-1.5 min-w-0">
            {icon && <span className="shrink-0 text-navy-500 [&>svg]:w-3.5 [&>svg]:h-3.5">{icon}</span>}
            <span className="truncate">{label}</span>
          </p>
          {delta && <Delta curr={delta.curr} prev={delta.prev} />}
        </div>
        <p className={cn('mt-2 leading-[1.05] [overflow-wrap:anywhere]', valueType, valueColor)}>{value}</p>
        {sub && <p className="mt-1.5 text-[12.5px] leading-snug text-[rgb(var(--text-secondary))] [overflow-wrap:anywhere]">{sub}</p>}
      </div>
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
  return <span className={`shrink-0 inline-flex items-center gap-0.5 text-[10.5px] font-bold px-1.5 py-0.5 rounded-[5px] tnum ${cls}`}>{icon}{children}</span>;
}
