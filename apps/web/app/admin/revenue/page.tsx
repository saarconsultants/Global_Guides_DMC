import { db } from '@/lib/db/client';
import { Card, CardContent } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { listAllCommissions, platformCommissionTotalPaise } from '@/lib/db/commissions';
import { formatINR } from '@/lib/utils';
import { Download, X } from 'lucide-react';
import { AdminPage, FilterChip, FilterRow, GhostEmpty, PrintedDate } from '@/components/admin/admin-ui';
import { productLabel } from '@/components/admin/commission-labels';
import Link from 'next/link';
import { ButtonLink } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

interface Props { searchParams: Promise<{ days?: string; agency?: string; product?: string }> }

const RANGES = [
  { key: '7',   label: 'Last 7 days' },
  { key: '30',  label: 'Last 30 days' },
  { key: '90',  label: 'Last 90 days' },
  { key: '365', label: 'Last 12 months' },
  { key: 'all', label: 'All time' },
];

export default async function AdminRevenuePage({ searchParams }: Props) {
  const sp = await searchParams;
  const days = sp.days ?? '30';

  let since: Date | undefined;
  if (days !== 'all') {
    since = new Date(); since.setDate(since.getDate() - parseInt(days, 10));
  }

  const [totalAllTime, rows, agencies] = await Promise.all([
    platformCommissionTotalPaise(),
    listAllCommissions({ take: 1000 }),
    db.agency.findMany({ select: { id: true, name: true, code: true } }),
  ]);

  const filtered = rows.filter((r) => {
    if (since && r.createdAt < since) return false;
    if (sp.agency  && r.agencyId !== sp.agency) return false;
    if (sp.product && r.productType !== sp.product) return false;
    return true;
  });

  const totalWindow = filtered.reduce((s, r) => s + r.amountPaise, 0n);

  const byCat = new Map<string, bigint>();
  for (const r of filtered) byCat.set(r.productType, (byCat.get(r.productType) ?? 0n) + r.amountPaise);

  const byAgency = new Map<string, { name: string; code: string; amount: bigint; count: number }>();
  for (const r of filtered) {
    const cur = byAgency.get(r.agencyId);
    if (cur) { cur.amount += r.amountPaise; cur.count++; }
    else {
      const a = agencies.find((x) => x.id === r.agencyId);
      byAgency.set(r.agencyId, { name: a?.name ?? '—', code: a?.code ?? '—', amount: r.amountPaise, count: 1 });
    }
  }
  const topAgencies = [...byAgency.entries()].sort((a, b) => Number(b[1].amount - a[1].amount)).slice(0, 5);
  const maxAmt = topAgencies[0]?.[1].amount ?? 1n;

  const topProducts = [...byCat.entries()].sort((a, b) => Number(b[1] - a[1]));
  const maxProd = topProducts[0]?.[1] ?? 1n;

  const windowLabel = RANGES.find((r) => r.key === days)?.label ?? '';

  return (
    <AdminPage>
      <PageHeader
        title="Revenue ledger"
        description="Every commission the platform has earned. Filter by time, agency or product."
        actions={
          <>
            <span className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-border-subtle bg-surface text-[13px] text-[rgb(var(--text-secondary))]">
              All-time <span className="money text-ink text-[14px]">{formatINR(totalAllTime)}</span>
            </span>
            <ButtonLink href={`/api/export/revenue?days=${days}`} external variant="secondary" className="gap-1.5"><Download className="w-4 h-4" />Export CSV</ButtonLink>
          </>
        }
      />

      <FilterRow label="Window">
        {RANGES.map((r) => {
          const params = new URLSearchParams({ days: r.key });
          if (sp.agency)  params.set('agency',  sp.agency);
          if (sp.product) params.set('product', sp.product);
          return <FilterChip key={r.key} href={`/admin/revenue?${params}`} label={r.label} active={days === r.key} />;
        })}
        {(sp.agency || sp.product) && (
          <Link href={`/admin/revenue?days=${days}` as any} className="inline-flex items-center gap-1 min-h-8 ml-1 text-[13px] font-semibold text-crimson-700 hover:underline"><X className="w-3.5 h-3.5" />Clear filters</Link>
        )}
      </FilterRow>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Commission" value={formatINR(totalWindow)} sub={windowLabel} mono />
        <StatCard label="Entries" value={String(filtered.length)} sub={windowLabel} />
        <StatCard label="Avg per entry" value={formatINR(filtered.length ? totalWindow / BigInt(filtered.length) : 0n)} sub="commission" mono />
        <StatCard label="Earning agencies" value={String(byAgency.size)} sub={windowLabel} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <Card>
          <CardContent className="pt-5">
            <h2 className="text-[15px] font-bold text-ink mb-3">Top earning agencies</h2>
            {topAgencies.length === 0 ? (
              <GhostEmpty title="No earnings yet" body="Agencies show up here once commission is recorded." />
            ) : (
              <ul className="space-y-2.5">
                {topAgencies.map(([id, a]) => {
                  const pct = Number(a.amount * 100n / maxAmt);
                  return (
                    <li key={id}>
                      <div className="flex items-baseline justify-between gap-3 text-sm mb-1">
                        <Link href={`/admin/agencies/${id}` as any} className="font-medium text-ink hover:text-crimson-700 truncate">{a.name}</Link>
                        <span className="whitespace-nowrap text-[13px] text-[rgb(var(--text-secondary))]"><span className="money text-ink">{formatINR(a.amount)}</span> · {a.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden"><div className="h-full bg-ink-soft" style={{ width: `${Math.max(2, pct)}%` }} /></div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <h2 className="text-[15px] font-bold text-ink mb-3">Where it came from</h2>
            {topProducts.length === 0 ? (
              <GhostEmpty title="No breakdown yet" body="Commission by product appears once there are entries." />
            ) : (
              <ul className="space-y-2.5">
                {topProducts.map(([cat, amt]) => {
                  const pct = Number(amt * 100n / maxProd);
                  return (
                    <li key={cat}>
                      <div className="flex items-baseline justify-between gap-3 text-sm mb-1">
                        <Link href={`/admin/revenue?days=${days}&product=${cat}` as any} className="font-medium text-ink hover:text-crimson-700">{productLabel(cat)}</Link>
                        <span className="money text-[13px] text-ink whitespace-nowrap">{formatINR(amt)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden"><div className="h-full bg-ink-soft" style={{ width: `${Math.max(2, pct)}%` }} /></div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className={filtered.length === 0 ? 'pt-4 pb-4' : 'pt-2'}>
          {filtered.length === 0 ? (
            <GhostEmpty title="No commission in this window" body="Try a longer time window, or clear filters." />
          ) : (
            <>
              {/* Mobile + tablet: stacked rows */}
              <ul className="lg:hidden divide-y divide-border-subtle">
                {filtered.slice(0, 200).map((r) => {
                  const a = agencies.find((x) => x.id === r.agencyId);
                  return (
                    <li key={r.id} className="py-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-ink truncate">{a?.name ?? '—'}</p>
                        <p className="text-[12.5px] text-[rgb(var(--text-secondary))] mt-0.5"><PrintedDate d={r.createdAt} /> · {productLabel(r.productType)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="money text-[16px] text-ink">{formatINR(r.amountPaise)}</p>
                        <p className="text-[12px] text-[rgb(var(--text-secondary))]">on <span className="money">{formatINR(r.basisPaise)}</span></p>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* Desktop: table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left label border-b border-border"><th className="py-3 pr-4">Date</th><th className="py-3 pr-4">Agency</th><th className="py-3 pr-4">Proposal</th><th className="py-3 pr-4">Product</th><th className="py-3 pr-4 text-right">Basis</th><th className="py-3 pr-4 text-right">Amount</th><th className="py-3 w-full">Note</th></tr></thead>
                  <tbody>
                    {filtered.slice(0, 200).map((r) => {
                      const a = agencies.find((x) => x.id === r.agencyId);
                      return (
                        <tr key={r.id} className="border-b border-border-subtle hover:bg-surface-2 transition-colors">
                          <td className="py-3 pr-4 text-[rgb(var(--text-secondary))]"><PrintedDate d={r.createdAt} /></td>
                          <td className="py-3 pr-4 whitespace-nowrap">{a ? <Link href={`/admin/agencies/${a.id}` as any} className="hover:text-crimson-700">{a.name}</Link> : '—'}</td>
                          <td className="py-3 pr-4 font-mono text-xs whitespace-nowrap">{r.proposalId.slice(0, 10)}…</td>
                          <td className="py-3 pr-4"><Pill variant="neutral">{productLabel(r.productType)}</Pill></td>
                          <td className="py-3 pr-4 money text-right whitespace-nowrap text-[rgb(var(--text-secondary))]">{formatINR(r.basisPaise)}</td>
                          <td className="py-3 pr-4 money text-right whitespace-nowrap text-ink">{formatINR(r.amountPaise)}</td>
                          <td className="py-3 text-xs text-[rgb(var(--text-secondary))]">{r.note ?? '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filtered.length > 200 && <p className="text-xs text-[rgb(var(--text-secondary))] text-center pt-4">Showing the 200 most recent of {filtered.length} in this window</p>}
            </>
          )}
        </CardContent>
      </Card>
    </AdminPage>
  );
}
