import { db } from '@/lib/db/client';
import { Card, CardContent } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { listAllCommissions, platformCommissionTotalPaise } from '@/lib/db/commissions';
import { formatINR, formatDateShort } from '@/lib/utils';
import { Coins, TrendingUp, Download } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

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

  return (
    <div className="p-8 space-y-6 ambient">
      <PageHeader
        eyebrow="Platform"
        title="Revenue ledger"
        description="Every commission the platform has booked. Filter by time, agency, or product."
        actions={
          <>
            <Pill variant="gold">All-time · {formatINR(totalAllTime)}</Pill>
            <a href={`/api/export/revenue?days=${days}`} className="inline-flex"><Button variant="secondary" className="gap-1.5"><Download className="w-4 h-4" />Export CSV</Button></a>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-[rgb(var(--text-secondary))] mr-1">Window:</span>
        {RANGES.map((r) => {
          const params = new URLSearchParams({ days: r.key });
          if (sp.agency)  params.set('agency',  sp.agency);
          if (sp.product) params.set('product', sp.product);
          return <FilterPill key={r.key} href={`/admin/revenue?${params}`} label={r.label} active={days === r.key} />;
        })}
        {(sp.agency || sp.product) && <Link href={`/admin/revenue?days=${days}` as any} className="text-xs text-danger-500 hover:underline ml-2">× clear filters</Link>}
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 stagger">
        <Card className="lift relative overflow-hidden bg-gradient-to-br from-crimson-700 to-crimson-900 text-white border-0">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-amber-500/30 blur-2xl" />
          <CardContent className="pt-5 relative">
            <p className="text-[11px] uppercase tracking-widest text-amber-300 font-bold inline-flex items-center gap-1.5"><Coins className="w-3 h-3" />Commission</p>
            <p className="font-mono text-3xl font-bold mt-1">{formatINR(totalWindow)}</p>
            <p className="text-[10px] text-white/70 mt-0.5">{RANGES.find((r) => r.key === days)?.label}</p>
          </CardContent>
        </Card>
        <Card className="lift"><CardContent className="pt-5">
          <p className="text-[11px] uppercase tracking-widest text-[rgb(var(--text-secondary))] font-bold">Entries</p>
          <p className="font-mono text-3xl font-bold mt-1 text-navy-900">{filtered.length}</p>
        </CardContent></Card>
        <Card className="lift"><CardContent className="pt-5">
          <p className="text-[11px] uppercase tracking-widest text-[rgb(var(--text-secondary))] font-bold">Avg per entry</p>
          <p className="font-mono text-3xl font-bold mt-1 text-navy-900">{formatINR(filtered.length ? totalWindow / BigInt(filtered.length) : 0n)}</p>
        </CardContent></Card>
        <Card className="lift"><CardContent className="pt-5">
          <p className="text-[11px] uppercase tracking-widest text-[rgb(var(--text-secondary))] font-bold">Earning agencies</p>
          <p className="font-mono text-3xl font-bold mt-1 text-navy-900">{byAgency.size}</p>
        </CardContent></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="pt-5">
            <h3 className="text-sm font-semibold text-navy-900 mb-3 inline-flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-crimson-700" />Top earning agencies</h3>
            {topAgencies.length === 0 ? (
              <EmptyState dense title="No earnings yet" body="Commission entries appear here as agencies save proposals." />
            ) : (
              <ul className="space-y-2.5">
                {topAgencies.map(([id, a]) => {
                  const pct = Number(a.amount * 100n / maxAmt);
                  return (
                    <li key={id}>
                      <div className="flex items-baseline justify-between text-sm mb-1">
                        <Link href={`/admin/agencies/${id}` as any} className="font-medium text-navy-900 hover:text-crimson-700 truncate max-w-[60%]">{a.name}</Link>
                        <span className="font-mono text-xs text-[rgb(var(--text-secondary))]">{formatINR(a.amount)} <span className="text-[rgb(var(--text-tertiary))]">· {a.count}</span></span>
                      </div>
                      <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden"><div className="h-full bg-gradient-to-r from-crimson-700 to-amber-500" style={{ width: `${Math.max(2, pct)}%` }} /></div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <h3 className="text-sm font-semibold text-navy-900 mb-3">Where it came from</h3>
            {topProducts.length === 0 ? (
              <EmptyState dense title="No breakdown yet" body="Commission by product type appears once you have entries." />
            ) : (
              <ul className="space-y-2.5">
                {topProducts.map(([cat, amt]) => {
                  const pct = Number(amt * 100n / maxProd);
                  return (
                    <li key={cat}>
                      <div className="flex items-baseline justify-between text-sm mb-1">
                        <Link href={`/admin/revenue?days=${days}&product=${cat}` as any} className="font-medium text-navy-900 hover:text-crimson-700">{cat}</Link>
                        <span className="font-mono text-xs text-[rgb(var(--text-secondary))]">{formatINR(amt)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden"><div className="h-full bg-amber-500" style={{ width: `${Math.max(2, pct)}%` }} /></div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-2">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Coins className="w-7 h-7" />}
              title="No commission entries in this window"
              body="Try a longer time window, or clear filters."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs uppercase tracking-wider text-[rgb(var(--text-secondary))] border-b border-border-subtle"><th className="py-3 pr-4">Date</th><th>Agency</th><th>Proposal</th><th>Product</th><th className="text-right">Basis</th><th className="text-right">Amount</th><th>Note</th></tr></thead>
                <tbody>
                  {filtered.slice(0, 200).map((r) => {
                    const a = agencies.find((x) => x.id === r.agencyId);
                    return (
                      <tr key={r.id} className="border-b border-border-subtle hover:bg-surface-2 transition-colors">
                        <td className="py-3 pr-4 text-[rgb(var(--text-secondary))] text-xs">{formatDateShort(r.createdAt)}</td>
                        <td className="py-3 pr-4">{a ? <Link href={`/admin/agencies/${a.id}` as any} className="hover:text-crimson-700">{a.name}</Link> : '—'}</td>
                        <td className="py-3 pr-4 font-mono text-xs">{r.proposalId.slice(0, 10)}…</td>
                        <td className="py-3 pr-4"><Pill variant="neutral">{r.productType}</Pill></td>
                        <td className="py-3 pr-4 font-mono text-right text-[rgb(var(--text-secondary))]">{formatINR(r.basisPaise)}</td>
                        <td className="py-3 pr-4 font-mono text-right font-bold text-amber-700">{formatINR(r.amountPaise)}</td>
                        <td className="py-3 pr-4 text-xs text-[rgb(var(--text-secondary))]">{r.note ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length > 200 && <p className="text-xs text-[rgb(var(--text-secondary))] text-center pt-4">Showing 200 most recent · {filtered.length} total in window</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FilterPill({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link href={href as any} className={`px-3 h-8 inline-flex items-center rounded-full text-xs font-medium border transition-colors cursor-pointer ${active ? 'bg-crimson-900 text-white border-crimson-900' : 'bg-surface text-navy-700 border-border hover:bg-navy-50'}`}>{label}</Link>
  );
}
