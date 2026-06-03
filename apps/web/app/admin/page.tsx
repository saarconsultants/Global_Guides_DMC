import { Card, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { db } from '@/lib/db/client';
import { platformCommissionTotalPaise } from '@/lib/db/commissions';
import { formatINR, formatDateShort } from '@/lib/utils';
import Link from 'next/link';
import { ArrowUpRight, FileText } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminOverview() {
  const [agencyCount, proposalCount, bookingCount, totalCommission, recent] = await Promise.all([
    db.agency.count(),
    db.proposal.count(),
    db.booking.count(),
    platformCommissionTotalPaise(),
    db.proposal.findMany({ orderBy: { createdAt: 'desc' }, take: 8, include: { agency: { select: { name: true, code: true } } } }),
  ]);

  const kpis = [
    { l: 'Agencies',     v: String(agencyCount),  s: 'on the platform' },
    { l: 'Proposals',    v: String(proposalCount), s: 'created' },
    { l: 'Bookings',     v: String(bookingCount), s: 'confirmed' },
    { l: 'Your revenue', v: formatINR(totalCommission), s: 'commission ledger total', gold: true },
  ];

  return (
    <div className="p-8 space-y-8 ambient">
      <PageHeader
        eyebrow="Platform"
        title="Overview"
        description="Everything across every agency. The agencies see only their own slice; you see the whole picture."
      />
      <section className="grid gap-4 grid-cols-2 lg:grid-cols-4 stagger">
        {kpis.map((k) => (
          <StatCard key={k.l} label={k.l} value={String(k.v)} sub={k.s} tone={k.gold ? 'gold' : 'navy'} mono={/[₹$€£]/.test(String(k.v))} />
        ))}
      </section>

      <section>
        <h2 className="text-xl font-semibold text-navy-900 mb-3">Latest proposals across all agencies</h2>
        <Card>
          <CardContent className="pt-2">
            {recent.length === 0 ? (
              <EmptyState
                icon={<FileText className="w-7 h-7" />}
                title="No proposals yet"
                body="Once any agency saves their first proposal, it'll show up here in real-time."
                primary={{ label: 'Publish a starter template', href: '/admin/templates' }}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-[rgb(var(--text-secondary))] border-b border-border-subtle">
                      <th className="py-3 pr-4 font-semibold">Code</th>
                      <th className="py-3 pr-4 font-semibold">Agency</th>
                      <th className="py-3 pr-4 font-semibold">Trip</th>
                      <th className="py-3 pr-4 font-semibold">Travel</th>
                      <th className="py-3 pr-4 font-semibold text-right">Price</th>
                      <th className="py-3 pr-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((p) => (
                      <tr key={p.id} className="border-b border-border-subtle hover:bg-surface-2 transition-colors">
                        <td className="py-3 pr-4 font-mono text-xs">{p.code}</td>
                        <td className="py-3 pr-4 font-medium">{p.agency.name}</td>
                        <td className="py-3 pr-4">{p.name}</td>
                        <td className="py-3 pr-4">{formatDateShort(p.travelDate)}</td>
                        <td className="py-3 pr-4 font-mono text-right">{formatINR(p.pricePaise)}</td>
                        <td className="py-3 pr-4">{p.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-wrap gap-3">
        <Link href="/admin/agencies" className="inline-flex items-center gap-1.5 text-sm text-crimson-700 hover:underline font-medium">Manage agencies <ArrowUpRight className="w-3.5 h-3.5" /></Link>
        <Link href="/admin/templates" className="inline-flex items-center gap-1.5 text-sm text-crimson-700 hover:underline font-medium">Publish a new template <ArrowUpRight className="w-3.5 h-3.5" /></Link>
        <Link href="/admin/commissions" className="inline-flex items-center gap-1.5 text-sm text-crimson-700 hover:underline font-medium">Adjust commission rules <ArrowUpRight className="w-3.5 h-3.5" /></Link>
      </section>
    </div>
  );
}
