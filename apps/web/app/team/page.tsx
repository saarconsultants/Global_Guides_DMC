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
import { roleLabel } from '@/lib/labels';

export const dynamic = 'force-dynamic';

const WINDOWS = [
  { key: '30', label: '30 days', days: 30 },
  { key: '90', label: '90 days', days: 90 },
  { key: 'all', label: 'All time', days: undefined },
] as const;


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
    <div className="shell py-8 lg:py-10 space-y-6">
      <PageHeader
        title="Team performance"
        description="How your counsellors are converting enquiries into bookings. Compare proposals sent, win rate, and revenue."
        actions={
          <div className="inline-flex rounded-md border border-border-subtle overflow-hidden">
            {WINDOWS.map((w) => (
              <Link
                key={w.key}
                href={`/team?d=${w.key}` as any}
                className={`px-3.5 h-9 inline-flex items-center text-[13px] font-bold transition-colors ${w.key === win.key ? 'bg-ink text-white' : 'bg-surface text-navy-700 hover:bg-surface-2'}`}
              >
                {w.label}
              </Link>
            ))}
          </div>
        }
      />

      {/* Summary KPIs */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Proposals sent" value={String(totals.sent)} icon={<Send className="w-4 h-4" />} />
        <StatCard label="Won (accepted + booked)" value={String(totals.won)} icon={<Trophy className="w-4 h-4" />} />
        <StatCard label="Win rate" value={`${totals.conversionPct}%`} icon={<TrendingUp className="w-4 h-4" />} />
        <div className="col-span-2 lg:col-span-1"><StatCard label="Revenue (won)" value={fmt(totals.revenuePaise)} icon={<Crown className="w-4 h-4" />} mono /></div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <h2 className="text-[18px] font-extrabold text-ink inline-flex items-center gap-2 mb-4 tracking-[-0.01em]"><Users2 className="w-4 h-4 text-crimson-700" />By counsellor</h2>

          {!hasData ? (
            <EmptyState
              dense
              icon={<Users2 className="w-7 h-7 text-[rgb(var(--text-tertiary))]" />}
              title="No activity yet"
              body="Once your team starts sending proposals, their conversion stats will show up here."
            />
          ) : (
            <>
            {/* Phones: one row per counsellor, numbers in a 4-cell grid. */}
            <ul className="md:hidden divide-y divide-border-subtle">
              {rows.map((r) => {
                const isMe = r.userId === actor.userId;
                const isLeader = leader && r.userId === leader.userId;
                return (
                  <li key={r.userId} className="py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold text-ink break-words inline-flex items-center gap-1.5">{r.name}{isLeader && <Trophy className="w-3.5 h-3.5 text-navy-500" aria-label="Top performer" />}{isMe && <span className="text-[12px] font-semibold text-[rgb(var(--text-secondary))]">(you)</span>}</div>
                        <div className="text-[12px] text-[rgb(var(--text-secondary))]">{roleLabel(r.role)}</div>
                      </div>
                      <span className="money text-[15px] text-ink whitespace-nowrap">{fmt(r.revenuePaise)}</span>
                    </div>
                    <dl className="mt-2 grid grid-cols-4 gap-2 text-center">
                      {([['Sent', r.sent], ['Viewed', r.viewed], ['Won', r.won], ['Win rate', r.sent ? `${r.conversionPct}%` : '—']] as const).map(([l, v]) => (
                        <div key={l} className="rounded-md bg-surface-2 py-1.5">
                          <dt className="label text-[9.5px]">{l}</dt>
                          <dd className="mt-0.5 text-[14px] font-bold text-ink tnum">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </li>
                );
              })}
              <li className="py-3 flex items-center justify-between text-[13px] font-bold text-ink">
                <span>Team total · {totals.sent} sent · {totals.won} won · {totals.conversionPct}%</span>
                <span className="money">{fmt(totals.revenuePaise)}</span>
              </li>
            </ul>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left label border-b border-border">
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
                      <tr key={r.userId} className={`border-b border-border-subtle/60 ${isMe ? 'bg-surface-2' : ''}`}>
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-ink">{r.name}</span>
                            {isLeader && <Trophy className="w-3.5 h-3.5 text-navy-500" aria-label="Top performer" />}
                            {isMe && <span className="text-[12px] font-semibold text-[rgb(var(--text-secondary))]">(you)</span>}
                            <span className="label">{roleLabel(r.role)}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-[rgb(var(--text-secondary))]">{r.drafts}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums">{r.sent}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-[rgb(var(--text-secondary))]">{r.viewed}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-ink">{r.won}</td>
                        <td className="py-2.5 px-3 text-right">
                          <ConvBadge pct={r.conversionPct} sent={r.sent} />
                        </td>
                        <td className="py-2.5 pl-3 text-right money">{fmt(r.revenuePaise)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border-subtle font-semibold text-ink">
                    <td className="py-2.5 pr-3">Team total</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{totals.drafts}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{totals.sent}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{totals.viewed}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{totals.won}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{totals.conversionPct}%</td>
                    <td className="py-2.5 pl-3 text-right money">{fmt(totals.revenuePaise)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            </>
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
  return <Pill variant={pct >= 40 ? 'success' : 'neutral'}>{pct}%</Pill>;
}
