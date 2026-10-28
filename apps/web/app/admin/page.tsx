import { Card, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { db } from '@/lib/db/client';
import { platformCommissionTotalPaise } from '@/lib/db/commissions';
import { formatINR, formatDateShort } from '@/lib/utils';
import Link from 'next/link';
import { ArrowRight, FileText } from 'lucide-react';
import { statusLabel } from '@/lib/labels';
import { AdminPage, PrintedDate } from '@/components/admin/admin-ui';
import { Pill } from '@/components/ui/pill';

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
    { l: 'Your revenue', v: formatINR(totalCommission), s: 'all-time commission', money: true },
  ];

  const tone = (status: string) =>
    status === 'BOOKED' || status === 'ACCEPTED' ? 'success' : status === 'VIEWED' || status === 'SENT' ? 'info' : 'neutral';

  return (
    <AdminPage>
      <PageHeader title="Overview" description="Every agency on the platform at a glance." />
      <section className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <StatCard key={k.l} label={k.l} value={k.v} sub={k.s} mono={k.money} />
        ))}
      </section>

      <section>
        <h2 className="text-[18px] font-extrabold text-ink tracking-[-0.01em] mb-3">Latest proposals</h2>
        <Card>
          <CardContent className="pt-2">
            {recent.length === 0 ? (
              <EmptyState
                icon={<FileText className="w-7 h-7" />}
                title="No proposals yet"
                body="Once any agency saves their first proposal, it'll show up here."
                primary={{ label: 'Publish a starter template', href: '/admin/templates' }}
              />
            ) : (
              <>
                {/* Mobile + tablet: stacked rows */}
                <ul className="lg:hidden divide-y divide-border-subtle">
                  {recent.map((p) => (
                    <li key={p.id} className="py-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-[12.5px] font-bold text-crimson-700 whitespace-nowrap">{p.code}</span>
                        <Pill variant={tone(p.status)}>{statusLabel(p.status)}</Pill>
                      </div>
                      <p className="font-semibold text-ink truncate">{p.name}</p>
                      <div className="flex items-end justify-between gap-3">
                        <div className="min-w-0 text-[13px] text-[rgb(var(--text-secondary))]">
                          <p className="truncate">{p.agency.name}</p>
                          <PrintedDate d={p.travelDate} />
                        </div>
                        <span className="money text-[16px] text-ink whitespace-nowrap">{formatINR(p.pricePaise)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
                {/* Desktop: table */}
                <div className="hidden lg:block overflow-x-auto" tabIndex={0} role="region" aria-label="Latest proposals table">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left label border-b border-border">
                        <th className="py-3 pr-4 font-semibold">Code</th>
                        <th className="py-3 pr-4 font-semibold">Agency</th>
                        <th className="py-3 pr-4 font-semibold w-full">Trip</th>
                        <th className="py-3 pr-4 font-semibold">Travel</th>
                        <th className="py-3 pr-4 font-semibold text-right">Price</th>
                        <th className="py-3 pr-4 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recent.map((p) => (
                        <tr key={p.id} className="border-b border-border-subtle hover:bg-surface-2 transition-colors">
                          <td className="py-3 pr-4"><span className="font-mono text-[12.5px] font-bold text-crimson-700 whitespace-nowrap">{p.code}</span></td>
                          <td className="py-3 pr-4 font-medium whitespace-nowrap">{p.agency.name}</td>
                          <td className="py-3 pr-4">{p.name}</td>
                          <td className="py-3 pr-4"><PrintedDate d={p.travelDate} /></td>
                          <td className="py-3 pr-4 money text-right whitespace-nowrap">{formatINR(p.pricePaise)}</td>
                          <td className="py-3 pr-4"><Pill variant={tone(p.status)}>{statusLabel(p.status)}</Pill></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-wrap gap-x-5 gap-y-2">
        <Link href="/admin/agencies" className="inline-flex items-center gap-1.5 min-h-8 text-sm text-crimson-700 hover:underline font-semibold">Manage agencies <ArrowRight className="w-3.5 h-3.5" /></Link>
        <Link href="/admin/templates" className="inline-flex items-center gap-1.5 min-h-8 text-sm text-crimson-700 hover:underline font-semibold">Publish a template <ArrowRight className="w-3.5 h-3.5" /></Link>
        <Link href="/admin/commissions" className="inline-flex items-center gap-1.5 min-h-8 text-sm text-crimson-700 hover:underline font-semibold">Commission rules <ArrowRight className="w-3.5 h-3.5" /></Link>
      </section>
    </AdminPage>
  );
}
