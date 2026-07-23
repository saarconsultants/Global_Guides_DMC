import { db } from '@/lib/db/client';
import { Card, CardContent } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDateShort, formatINR } from '@/lib/utils';
import { Building2, Plus, ExternalLink } from 'lucide-react';
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
    <div className="p-8 space-y-6 ambient">
      <PageHeader
        eyebrow="Platform"
        title="Agencies"
        description="Every tenant on the platform. Onboard manually or share the public signup link."
        actions={
          <Link href="/admin/agencies/new"><Button className="gap-1.5"><Plus className="w-4 h-4" />Onboard agency</Button></Link>
        }
      />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 stagger">
        {[
          { l: 'Total agencies', v: String(rows.length), s: 'on the platform' },
          { l: 'Active',         v: String(rows.filter((a) => a.status === 'ACTIVE').length), s: 'serving customers' },
          { l: 'Suspended',      v: String(rows.filter((a) => a.status === 'SUSPENDED').length), s: 'paused or paywall' },
          { l: 'Wallet float',   v: formatINR(totalWallet), s: 'across all agencies', mono: true },
        ].map((k) => (
          <Card key={k.l} className="lift">
            <CardContent className="pt-5">
              <p className="text-[11px] uppercase tracking-widest text-[rgb(var(--text-secondary))] font-bold">{k.l}</p>
              <p className={`mt-1 text-3xl font-bold tracking-tight text-navy-900 ${k.mono ? 'font-mono' : ''}`}>{k.v}</p>
              <p className="text-xs text-[rgb(var(--text-secondary))] mt-0.5">{k.s}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-2">
          {rows.length === 0 ? (
            <EmptyState
              icon={<Building2 className="w-7 h-7" />}
              title="No agencies yet"
              body="Onboard an agency manually or share the public signup link with prospective travel agencies."
              primary={{ label: 'Onboard first agency', href: '/admin/agencies/new' }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-crimson-700 font-bold border-b-[1.5px] border-crimson-100">
                    <th className="py-3 pr-4 font-semibold">Code</th>
                    <th className="py-3 pr-4 font-semibold">Agency</th>
                    <th className="py-3 pr-4 font-semibold">Status</th>
                    <th className="py-3 pr-4 font-semibold text-right">Users</th>
                    <th className="py-3 pr-4 font-semibold text-right">Proposals</th>
                    <th className="py-3 pr-4 font-semibold text-right">Bookings</th>
                    <th className="py-3 pr-4 font-semibold text-right">Markup</th>
                    <th className="py-3 pr-4 font-semibold text-right">Wallet</th>
                    <th className="py-3 pr-4 font-semibold">Joined</th>
                    <th className="py-3 pr-4 font-semibold"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => (
                    <tr key={a.id} className="border-b border-border-subtle hover:bg-surface-2 transition-colors group">
                      <td className="py-3 pr-4 font-mono text-xs"><Link href={`/admin/agencies/${a.id}` as any} className="text-crimson-700 hover:underline">{a.code}</Link></td>
                      <td className="py-3 pr-4 font-medium">
                        <Link href={`/admin/agencies/${a.id}` as any} className="inline-flex items-center gap-2 hover:text-crimson-700 transition-colors">
                          {a.logoUrl ? <img src={a.logoUrl} alt="" className="w-6 h-6 rounded object-cover bg-white border border-border-subtle" /> : <span className="w-6 h-6 rounded-full border border-border-subtle" style={{ background: a.primaryColor ?? '#0369A1' }} />}
                          <span>
                            {a.name}
                            <span className="block text-xs text-[rgb(var(--text-secondary))] font-normal">/{a.slug}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="py-3 pr-4"><Pill variant={statusVariant[a.status] ?? 'neutral'}>{a.status}</Pill></td>
                      <td className="py-3 pr-4 font-mono text-right">{a._count.users}</td>
                      <td className="py-3 pr-4 font-mono text-right">{a._count.proposals}</td>
                      <td className="py-3 pr-4 font-mono text-right">{a._count.bookings}</td>
                      <td className="py-3 pr-4 font-mono text-right">{a.markupPct}%</td>
                      <td className="py-3 pr-4 font-mono text-right">{formatINR(a.walletPaise)}</td>
                      <td className="py-3 pr-4 text-[rgb(var(--text-secondary))] text-xs">{formatDateShort(a.createdAt)}</td>
                      <td className="py-3 pr-4 text-right">
                        <Link href={`/admin/agencies/${a.id}` as any} className="text-xs text-crimson-700 hover:underline opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 transition-opacity inline-flex items-center gap-1">Open <ExternalLink className="w-3 h-3" /></Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
