import { db } from '@/lib/db/client';
import { Card, CardContent } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { ButtonLink } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { StatCard } from '@/components/ui/stat-card';
import { formatINR } from '@/lib/utils';
import { statusLabel } from '@/lib/labels';
import { AdminPage, CodeLink, PrintedDate, RowFact } from '@/components/admin/admin-ui';
import { Building2, Plus, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  ACTIVE: 'success', PENDING: 'warning', SUSPENDED: 'danger',
};

export default async function AdminAgenciesPage() {
  const rows = await db.agency.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { users: true, proposals: true, bookings: true } } },
  });
  const totalWallet = rows.reduce((s, a) => s + a.walletPaise, 0n);

  return (
    <AdminPage>
      <PageHeader
        title="Agencies"
        description="Every agency on the platform. Onboard one yourself or share the signup link."
        actions={
          <ButtonLink href="/admin/agencies/new" className="gap-1.5"><Plus className="w-4 h-4" />Onboard agency</ButtonLink>
        }
      />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total agencies" value={String(rows.length)} sub="on the platform" />
        <StatCard label="Active" value={String(rows.filter((a) => a.status === 'ACTIVE').length)} sub="serving customers" />
        <StatCard label="Suspended" value={String(rows.filter((a) => a.status === 'SUSPENDED').length)} sub="paused" />
        <StatCard label="Wallet float" value={formatINR(totalWallet)} sub="across all agencies" mono />
      </div>

      <Card>
        <CardContent className="pt-2">
          {rows.length === 0 ? (
            <EmptyState
              icon={<Building2 className="w-7 h-7" />}
              title="No agencies yet"
              body="Onboard an agency yourself or share the public signup link with travel agencies."
              primary={{ label: 'Onboard first agency', href: '/admin/agencies/new' }}
            />
          ) : (
            <>
              {/* Mobile + tablet: stacked rows */}
              <ul className="lg:hidden divide-y divide-border-subtle">
                {rows.map((a) => (
                  <li key={a.id} className="py-3.5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/admin/agencies/${a.id}` as any} className="flex items-center gap-2.5 min-w-0">
                        <AgencyMark logoUrl={a.logoUrl} color={a.primaryColor} />
                        <span className="min-w-0">
                          <span className="block font-semibold text-ink truncate">{a.name}</span>
                          <span className="block font-mono text-[12px] font-bold text-crimson-700">{a.code}</span>
                        </span>
                      </Link>
                      <Pill variant={statusVariant[a.status] ?? 'neutral'}>{statusLabel(a.status)}</Pill>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <RowFact label="Proposals"><span className="tnum">{a._count.proposals}</span></RowFact>
                      <RowFact label="Markup"><span className="money">{a.markupPct}%</span></RowFact>
                      <RowFact label="Wallet"><span className="money">{formatINR(a.walletPaise)}</span></RowFact>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-[13px] text-[rgb(var(--text-secondary))]">
                      <span>Joined <PrintedDate d={a.createdAt} /></span>
                      <Link href={`/admin/agencies/${a.id}` as any} className="inline-flex items-center gap-1 min-h-8 font-semibold text-crimson-700 hover:underline">Open <ArrowRight className="w-3.5 h-3.5" /></Link>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Desktop: table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left label border-b border-border">
                      <th className="py-3 pr-4 font-semibold">Code</th>
                      <th className="py-3 pr-4 font-semibold w-full">Agency</th>
                      <th className="py-3 pr-4 font-semibold">Status</th>
                      <th className="py-3 pr-4 font-semibold text-right">Users</th>
                      <th className="py-3 pr-4 font-semibold text-right">Proposals</th>
                      <th className="py-3 pr-4 font-semibold text-right">Bookings</th>
                      <th className="py-3 pr-4 font-semibold text-right">Markup</th>
                      <th className="py-3 pr-4 font-semibold text-right">Wallet</th>
                      <th className="py-3 pr-4 font-semibold">Joined</th>
                      <th className="py-3 pr-4 font-semibold"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((a) => (
                      <tr key={a.id} className="border-b border-border-subtle hover:bg-surface-2 transition-colors group">
                        <td className="py-3 pr-4"><CodeLink href={`/admin/agencies/${a.id}`} code={a.code} /></td>
                        <td className="py-3 pr-4 font-medium">
                          <Link href={`/admin/agencies/${a.id}` as any} className="inline-flex items-center gap-2 hover:text-crimson-700 transition-colors">
                            <AgencyMark logoUrl={a.logoUrl} color={a.primaryColor} />
                            <span>
                              {a.name}
                              <span className="block text-xs text-[rgb(var(--text-secondary))] font-normal">/{a.slug}</span>
                            </span>
                          </Link>
                        </td>
                        <td className="py-3 pr-4"><Pill variant={statusVariant[a.status] ?? 'neutral'}>{statusLabel(a.status)}</Pill></td>
                        <td className="py-3 pr-4 tnum text-right">{a._count.users}</td>
                        <td className="py-3 pr-4 tnum text-right">{a._count.proposals}</td>
                        <td className="py-3 pr-4 tnum text-right">{a._count.bookings}</td>
                        <td className="py-3 pr-4 money text-right whitespace-nowrap">{a.markupPct}%</td>
                        <td className="py-3 pr-4 money text-right whitespace-nowrap">{formatINR(a.walletPaise)}</td>
                        <td className="py-3 pr-4 text-[rgb(var(--text-secondary))]"><PrintedDate d={a.createdAt} /></td>
                        <td className="py-3 pr-4 text-right">
                          <Link href={`/admin/agencies/${a.id}` as any} className="text-xs font-semibold text-crimson-700 hover:underline opacity-100 [@media(hover:hover)_and_(pointer:fine)]:lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 transition-opacity inline-flex items-center gap-1 min-h-6 whitespace-nowrap">Open <ArrowRight className="w-3 h-3" /></Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </AdminPage>
  );
}

function AgencyMark({ logoUrl, color }: { logoUrl: string | null; color: string | null }) {
  return logoUrl
    ? <img src={logoUrl} alt="" className="w-7 h-7 shrink-0 rounded object-cover bg-white border border-border-subtle" />
    : <span className="w-7 h-7 shrink-0 rounded-full border border-border-subtle" style={{ background: color ?? '#0369A1' }} />;
}
