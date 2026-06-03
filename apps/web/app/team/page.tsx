import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { EmptyState } from '@/components/ui/empty-state';
import { requireAgency } from '@/lib/auth/ctx';
import { agentPerformance } from '@/lib/db/performance';
import { getDisplayMoney } from '@/lib/money-server';
import { StatCard } from '@/components/ui/stat-card';
import { Users2, Send, Eye, Trophy, TrendingUp, Crown } from 'lucide-react';

export const dynamic = 'force-dynamic';

const WINDOWS = [
  { key: '30', label: '30 days', days: 30 },
  { key: '90', label: '90 days', days: 90 },
  { key: 'all', label: 'All time', days: undefined },
] as const;

const ROLE_LABEL: Record<string, string> = {
  AGENCY_OWNER: 'Owner', COUNSELLOR: 'Counsellor', OPS: 'Ops', OTHER: '—',
};

interface PageProps { searchParams: Promise<{ d?: string }> }

export default async function TeamPerformancePage({ searchParams }: PageProps) {
  const actor = await requireAgency();
  const { fmt } = await getDisplayMoney();
  const sp = await searchParams;
  const win = WINDOWS.find((w) => w.key === sp.d) ?? WINDOWS[1];
  const { rows, totals } = await agentPerformance(actor.agencyId, { windowDays: win.days });

  const hasData = rows.some((r) => r.sent > 0 || r.drafts > 0);
  const leader = rows.find((r) => r.won > 0);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
      <PageHeader
        eyebrow="Team"
        title="Team performance"
        description="How your counsellors are converting enquiries into bookings. Compare proposals sent, win rate, and revenue."
        actions={
          <div className="inline-flex rounded-md border border-border-subtle overflow-hidden">
            {WINDOWS.map((w) => (
              <Link
                key={w.key}
                href={`/team?d=${w.key}` as any}
                className={`px-3 py-1.5 text-sm transition-colors ${w.key === win.key ? 'bg-crimson-900 text-white' : 'bg-surface text-[rgb(var(--text-secondary))] hover:bg-surface-2'}`}
              >
                {w.label}
              </Link>
            ))}
          </div>
        }
      />

      {/* Summary KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Proposals sent" value={String(totals.sent)} icon={<Send className="w-4 h-4" />} />
        <StatCard label="Won (accepted + booked)" value={String(totals.won)} icon={<Trophy className="w-4 h-4" />} tone="gold" />
        <StatCard label="Win rate" value={`${totals.conversionPct}%`} icon={<TrendingUp className="w-4 h-4" />} />
        <StatCard label="Revenue (won)" value={fmt(totals.revenuePaise)} icon={<Crown className="w-4 h-4" />} mono />
      </div>

      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold text-navy-900 inline-flex items-center gap-2 mb-4"><Users2 className="w-4 h-4 text-crimson-700" />By counsellor</h2>

          {!hasData ? (
            <EmptyState
              dense
              icon={<Users2 className="w-7 h-7 text-[rgb(var(--text-tertiary))]" />}
              title="No activity yet"
              body="Once your team starts sending proposals, their conversion stats will show up here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-[rgb(var(--text-secondary))] border-b border-border-subtle">
                    <th className="py-2 pr-3 font-semibold">Counsellor</th>
                    <th className="py-2 px-3 font-semibold text-right">Drafts</th>
                    <th className="py-2 px-3 font-semibold text-right">Sent</th>
                    <th className="py-2 px-3 font-semibold text-right">Viewed</th>
                    <th className="py-2 px-3 font-semibold text-right">Won</th>
                    <th className="py-2 px-3 font-semibold text-right">Win rate</th>
                    <th className="py-2 pl-3 font-semibold text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const isMe = r.userId === actor.userId;
                    const isLeader = leader && r.userId === leader.userId;
                    return (
                      <tr key={r.userId} className={`border-b border-border-subtle/60 ${isMe ? 'bg-amber-50/50' : ''}`}>
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-navy-900">{r.name}</span>
                            {isLeader && <Crown className="w-3.5 h-3.5 text-gold-500" aria-label="Top performer" />}
                            {isMe && <Pill variant="neutral">You</Pill>}
                            <span className="text-[10px] uppercase tracking-wide text-[rgb(var(--text-tertiary))]">{ROLE_LABEL[r.role] ?? r.role}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-[rgb(var(--text-secondary))]">{r.drafts}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums">{r.sent}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-[rgb(var(--text-secondary))]">{r.viewed}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-navy-900">{r.won}</td>
                        <td className="py-2.5 px-3 text-right">
                          <ConvBadge pct={r.conversionPct} sent={r.sent} />
                        </td>
                        <td className="py-2.5 pl-3 text-right font-mono tabular-nums">{fmt(r.revenuePaise)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border-subtle font-semibold text-navy-900">
                    <td className="py-2.5 pr-3">Team total</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{totals.drafts}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{totals.sent}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{totals.viewed}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{totals.won}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{totals.conversionPct}%</td>
                    <td className="py-2.5 pl-3 text-right font-mono tabular-nums">{fmt(totals.revenuePaise)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          <p className="mt-3 text-[11px] text-[rgb(var(--text-tertiary))]">
            <Eye className="w-3 h-3 inline -mt-0.5 mr-0.5" /> “Won” counts accepted and booked proposals. Win rate = won ÷ sent. Revenue is the customer price of won trips.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ConvBadge({ pct, sent }: { pct: number; sent: number }) {
  if (sent === 0) return <span className="text-[rgb(var(--text-tertiary))]">—</span>;
  const variant = pct >= 40 ? 'success' : pct >= 20 ? 'warning' : 'neutral';
  return <Pill variant={variant as any}>{pct}%</Pill>;
}
