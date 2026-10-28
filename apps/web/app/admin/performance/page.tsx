import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { EmptyState } from '@/components/ui/empty-state';
import { requireSuperAdmin } from '@/lib/auth/ctx';
import { platformPerformance } from '@/lib/db/performance';
import { formatINR } from '@/lib/utils';
import { StatCard } from '@/components/ui/stat-card';
import { BarChart3 } from 'lucide-react';
import { AdminPage, FilterChip, FilterRow } from '@/components/admin/admin-ui';

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
    <AdminPage>
      <PageHeader
        title="Performance"
        description="Conversion and revenue by agency across the platform."
      />

      <FilterRow label="Window">
        {WINDOWS.map((w) => (
          <FilterChip key={w.key} href={`/admin/performance?d=${w.key}`} label={w.label} active={w.key === win.key} />
        ))}
      </FilterRow>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <StatCard label="Agencies" value={String(totals.agencies)} sub="on the platform" />
        <StatCard label="Counsellors" value={String(totals.counsellors)} sub="on agency teams" />
        <StatCard label="Proposals sent" value={String(totals.sent)} sub={win.label} />
        <StatCard label="Win rate" value={`${totals.conversionPct}%`} sub="sent → won" />
        <div className="col-span-2 lg:col-span-1">
          <StatCard label="Revenue (won)" value={formatINR(totals.revenuePaise)} sub={win.label} mono />
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <h2 className="text-[17px] font-bold text-ink tracking-[-0.01em] mb-4">By agency</h2>

          {!hasData ? (
            <EmptyState dense icon={<BarChart3 className="w-7 h-7 text-[rgb(var(--text-tertiary))]" />} title="No proposals in this window" body="Pick a wider time range or wait for agencies to start quoting." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left label border-b border-border">
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
                      <td className="py-2.5 pr-3 whitespace-nowrap">
                        <Link href={`/admin/agencies/${r.agencyId}` as any} className="font-medium text-ink hover:text-crimson-700">{r.agencyName}</Link>
                        <span className="ml-2 font-mono text-[11.5px] font-bold text-crimson-700">{r.code}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-[rgb(var(--text-secondary))]">{r.counsellors}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{r.sent}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-ink">{r.won}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-[rgb(var(--text-secondary))]">{r.booked}</td>
                      <td className="py-2.5 px-3 text-right">
                        {r.sent === 0 ? <span className="text-[rgb(var(--text-tertiary))]">—</span> : <Pill variant={r.conversionPct >= 40 ? 'success' : 'neutral'}>{r.conversionPct}%</Pill>}
                      </td>
                      <td className="py-2.5 pl-3 text-right money whitespace-nowrap">{formatINR(r.revenuePaise)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border-subtle font-semibold text-ink">
                    <td className="py-2.5 pr-3">Platform total</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{totals.counsellors}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{totals.sent}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{totals.won}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{totals.booked}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{totals.conversionPct}%</td>
                    <td className="py-2.5 pl-3 text-right money whitespace-nowrap">{formatINR(totals.revenuePaise)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminPage>
  );
}
