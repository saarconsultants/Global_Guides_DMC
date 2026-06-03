import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { EmptyState } from '@/components/ui/empty-state';
import { requireSuperAdmin } from '@/lib/auth/ctx';
import { platformPerformance } from '@/lib/db/performance';
import { formatINR } from '@/lib/utils';
import { StatCard } from '@/components/ui/stat-card';
import { BarChart3, Building2, Send, Trophy, TrendingUp, Users2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

const WINDOWS = [
  { key: '30', label: '30 days', days: 30 },
  { key: '90', label: '90 days', days: 90 },
  { key: 'all', label: 'All time', days: undefined },
] as const;

interface PageProps { searchParams: Promise<{ d?: string }> }

export default async function AdminPerformancePage({ searchParams }: PageProps) {
  await requireSuperAdmin();
  const sp = await searchParams;
  const win = WINDOWS.find((w) => w.key === sp.d) ?? WINDOWS[1];
  const { rows, totals } = await platformPerformance({ windowDays: win.days });

  const hasData = rows.some((r) => r.sent > 0);

  return (
    <div className="px-5 lg:px-8 py-8 space-y-8">
      <PageHeader
        eyebrow="Platform admin"
        title="Performance"
        description="Conversion and revenue by agency across the whole platform."
        actions={
          <div className="inline-flex rounded-md border border-border-subtle overflow-hidden">
            {WINDOWS.map((w) => (
              <Link
                key={w.key}
                href={`/admin/performance?d=${w.key}` as any}
                className={`px-3 py-1.5 text-sm transition-colors ${w.key === win.key ? 'bg-crimson-900 text-white' : 'bg-surface text-[rgb(var(--text-secondary))] hover:bg-surface-2'}`}
              >
                {w.label}
              </Link>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Agencies" value={String(totals.agencies)} icon={<Building2 className="w-4 h-4" />} />
        <StatCard label="Counsellors" value={String(totals.counsellors)} icon={<Users2 className="w-4 h-4" />} />
        <StatCard label="Proposals sent" value={String(totals.sent)} icon={<Send className="w-4 h-4" />} />
        <StatCard label="Win rate" value={`${totals.conversionPct}%`} icon={<TrendingUp className="w-4 h-4" />} />
        <StatCard label="Revenue (won)" value={formatINR(totals.revenuePaise)} icon={<Trophy className="w-4 h-4" />} mono tone="gold" />
      </div>

      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold text-navy-900 inline-flex items-center gap-2 mb-4"><BarChart3 className="w-4 h-4 text-crimson-700" />By agency</h2>

          {!hasData ? (
            <EmptyState dense icon={<BarChart3 className="w-7 h-7 text-[rgb(var(--text-tertiary))]" />} title="No proposals in this window" body="Pick a wider time range or wait for agencies to start quoting." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-[rgb(var(--text-secondary))] border-b border-border-subtle">
                    <th className="py-2 pr-3 font-semibold">Agency</th>
                    <th className="py-2 px-3 font-semibold text-right">Team</th>
                    <th className="py-2 px-3 font-semibold text-right">Sent</th>
                    <th className="py-2 px-3 font-semibold text-right">Won</th>
                    <th className="py-2 px-3 font-semibold text-right">Booked</th>
                    <th className="py-2 px-3 font-semibold text-right">Win rate</th>
                    <th className="py-2 pl-3 font-semibold text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.agencyId} className="border-b border-border-subtle/60">
                      <td className="py-2.5 pr-3">
                        <Link href={`/admin/agencies` as any} className="font-medium text-navy-900 hover:text-crimson-700">{r.agencyName}</Link>
                        <span className="ml-2 text-[10px] font-mono text-[rgb(var(--text-tertiary))]">{r.code}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-[rgb(var(--text-secondary))]">{r.counsellors}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{r.sent}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-navy-900">{r.won}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-[rgb(var(--text-secondary))]">{r.booked}</td>
                      <td className="py-2.5 px-3 text-right">
                        {r.sent === 0 ? <span className="text-[rgb(var(--text-tertiary))]">—</span> : <Pill variant={(r.conversionPct >= 40 ? 'success' : r.conversionPct >= 20 ? 'warning' : 'neutral') as any}>{r.conversionPct}%</Pill>}
                      </td>
                      <td className="py-2.5 pl-3 text-right font-mono tabular-nums">{formatINR(r.revenuePaise)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border-subtle font-semibold text-navy-900">
                    <td className="py-2.5 pr-3">Platform total</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{totals.counsellors}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{totals.sent}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{totals.won}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{totals.booked}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{totals.conversionPct}%</td>
                    <td className="py-2.5 pl-3 text-right font-mono tabular-nums">{formatINR(totals.revenuePaise)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
