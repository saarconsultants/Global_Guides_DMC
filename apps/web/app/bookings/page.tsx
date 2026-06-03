import { db } from '@/lib/db/client';
import { Card, CardContent } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { requireAgency } from '@/lib/auth/ctx';
import { formatDateShort } from '@/lib/utils';
import { getDisplayMoney } from '@/lib/money-server';
import { Briefcase, FileCheck } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  CONFIRMED: 'success', PENDING: 'warning', CANCELLED: 'danger',
};

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { fmt } = await getDisplayMoney();
  const actor = await requireAgency();
  const sp = await searchParams;
  const where: any = { agencyId: actor.agencyId };
  if (sp.status) where.status = sp.status;

  const rows = await db.booking.findMany({
    where, orderBy: { bookedAt: 'desc' },
    include: { proposal: { include: { lead: true } } },
    take: 100,
  });

  const totalSpend = rows.filter((b) => b.status === 'CONFIRMED').reduce((s, b) => s + b.paidPaise, 0n);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 space-y-6">
      <PageHeader
        title="My bookings"
        description="Confirmed and pending bookings. Each row links back to the proposal it was converted from."
        actions={<Link href="/itinerary/new"><Button>New trip</Button></Link>}
      />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 stagger">
        <Card className="lift"><CardContent className="pt-5">
          <p className="text-[11px] uppercase tracking-widest text-[rgb(var(--text-secondary))] font-bold">Total bookings</p>
          <p className="mt-1 text-3xl font-bold text-navy-900">{rows.length}</p>
        </CardContent></Card>
        <Card className="lift"><CardContent className="pt-5">
          <p className="text-[11px] uppercase tracking-widest text-[rgb(var(--text-secondary))] font-bold">Confirmed</p>
          <p className="mt-1 text-3xl font-bold text-success-500">{rows.filter((b) => b.status === 'CONFIRMED').length}</p>
        </CardContent></Card>
        <Card className="lift"><CardContent className="pt-5">
          <p className="text-[11px] uppercase tracking-widest text-[rgb(var(--text-secondary))] font-bold">Pending</p>
          <p className="mt-1 text-3xl font-bold text-warning-500">{rows.filter((b) => b.status === 'PENDING').length}</p>
        </CardContent></Card>
        <Card className="lift"><CardContent className="pt-5">
          <p className="text-[11px] uppercase tracking-widest text-[rgb(var(--text-secondary))] font-bold">Confirmed value</p>
          <p className="mt-1 text-2xl font-bold text-navy-900 font-mono tabular-nums">{fmt(totalSpend)}</p>
        </CardContent></Card>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-[rgb(var(--text-secondary))] mr-1">Filter:</span>
        <FilterPill href="/bookings" label="All" active={!sp.status} />
        {['PENDING', 'CONFIRMED', 'CANCELLED'].map((s) => (
          <FilterPill key={s} href={`/bookings?status=${s}`} label={s} active={sp.status === s} />
        ))}
      </div>

      <Card>
        <CardContent className="pt-2">
          {rows.length === 0 ? (
            <EmptyState
              icon={<Briefcase className="w-7 h-7" />}
              title="No bookings yet"
              body="Once a customer accepts a proposal and you convert it to a booking, it'll appear here with PNRs and status."
              primary={{ label: 'See proposals', href: '/proposals' }}
              secondary={{ label: 'Build a new trip', href: '/itinerary/new' }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-[rgb(var(--text-secondary))] border-b border-border-subtle">
                    <th className="py-3 pr-4 font-semibold">Proposal #</th>
                    <th className="py-3 pr-4 font-semibold">Customer</th>
                    <th className="py-3 pr-4 font-semibold">Trip</th>
                    <th className="py-3 pr-4 font-semibold">Travel</th>
                    <th className="py-3 pr-4 font-semibold">Booked</th>
                    <th className="py-3 pr-4 font-semibold text-right">Paid</th>
                    <th className="py-3 pr-4 font-semibold">Status</th>
                    <th className="py-3 pr-4 font-semibold">PNRs</th>
                    <th className="py-3 pl-4 font-semibold text-right">Voucher</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((b) => (
                    <tr key={b.id} className="border-b border-border-subtle hover:bg-surface-2 transition-colors">
                      <td className="py-3 pr-4 font-mono text-xs"><Link href={`/itinerary/${b.proposal.id}/customize` as any} className="text-crimson-700 hover:underline">{b.proposal.code}</Link></td>
                      <td className="py-3 pr-4">{b.proposal.lead?.customerName ?? '—'}</td>
                      <td className="py-3 pr-4">{b.proposal.name}</td>
                      <td className="py-3 pr-4">{formatDateShort(b.proposal.travelDate)}</td>
                      <td className="py-3 pr-4 text-[rgb(var(--text-secondary))]">{formatDateShort(b.bookedAt)}</td>
                      <td className="py-3 pr-4 font-mono text-right">{fmt(b.paidPaise)}</td>
                      <td className="py-3 pr-4"><Pill variant={statusVariant[b.status] ?? 'neutral'}>{b.status}</Pill></td>
                      <td className="py-3 pr-4 font-mono text-xs text-[rgb(var(--text-secondary))]">{b.pnrs ?? '—'}</td>
                      <td className="py-3 pl-4 text-right">
                        <a href={`/api/booking-voucher/${b.proposal.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-crimson-700 hover:underline" title="Download voucher PDF"><FileCheck className="w-3.5 h-3.5" />Voucher</a>
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

function FilterPill({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link href={href as any} className={`px-3 h-8 inline-flex items-center rounded-full text-xs font-medium border transition-colors cursor-pointer ${active ? 'bg-navy-900 text-white border-navy-900' : 'bg-surface text-navy-700 border-border hover:bg-navy-50'}`}>{label}</Link>
  );
}
