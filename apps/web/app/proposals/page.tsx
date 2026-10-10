import { Card, CardContent } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { statusLabel } from '@/lib/labels';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Button, ButtonLink } from '@/components/ui/button';
import { listProposals } from '@/lib/db/proposals';
import { getWalletBalance } from '@/lib/db/wallet';
import { formatDateShort } from '@/lib/utils';
import { getDisplayMoney } from '@/lib/money-server';
import { FileText, ExternalLink, Copy, Search, Filter, Download, GitBranch, FileCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { duplicateProposalAction } from '@/app/actions/duplicate-proposal';
import { reviseProposalAction } from '@/app/actions/revise-proposal';
import { BookTripModal } from '@/components/bookings/book-trip-modal';
import { RowSubmitButton } from '@/components/common/row-submit-button';

const BOOKABLE = ['SENT', 'VIEWED', 'ACCEPTED'];

export const dynamic = 'force-dynamic';

const statusVariant: Record<string, 'neutral' | 'info' | 'success' | 'warning' | 'danger'> = {
  DRAFT: 'neutral', SENT: 'info', VIEWED: 'info', ACCEPTED: 'success', BOOKED: 'success', DECLINED: 'danger', SUPERSEDED: 'neutral',
};

export default async function ProposalsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { fmt } = await getDisplayMoney();
  const sp = await searchParams;
  const [rows, walletBalance] = await Promise.all([
    listProposals({ q: sp.q, status: sp.status }),
    getWalletBalance(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 lg:py-10 space-y-6">
      <PageHeader
        title="My proposals"
        description="Proposals you've prepared. Click a row to open it. Customer views update status automatically."
        actions={<ButtonLink href="/itinerary/new">New trip</ButtonLink>}
      />

      <Card>
        <CardContent className="pt-5">
          <form method="GET" action="/proposals" className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--text-tertiary))]" />
              <Input name="q" type="search" aria-label="Search proposals" defaultValue={sp.q ?? ''} placeholder="Search by code, customer name, trip or destination…" className="pl-9" />
            </div>
            <select name="status" aria-label="Filter by status" defaultValue={sp.status ?? ''} className="control w-auto min-w-[170px]">
              <option value="">All statuses</option>
              {Object.keys(statusVariant).map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
            </select>
            <Button variant="secondary" className="gap-1.5"><Filter className="w-4 h-4" />Filter</Button>
            {(sp.q || sp.status) && <Link href="/proposals" className="text-xs text-danger-500 hover:underline">Clear filters</Link>}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-2">
          {rows.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-7 h-7" />}
              title="No proposals yet"
              body="Build a trip and click Save as proposal. Your saved proposals will live here, with status updates the moment your customer opens the share link."
              primary={{ label: 'Build a proposal', href: '/itinerary/new' }}
              secondary={{ label: 'See templates', href: '/suggested' }}
            />
          ) : (
            <>
            {/* Phones: stacked cards. Tables would scroll sideways and hide columns at 390px. */}
            <ul className="md:hidden divide-y divide-border-subtle">
              {rows.map((p) => (
                <li key={p.id} className="py-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/itinerary/${p.id}/customize` as any} className="inline-flex items-center min-h-6 font-mono text-[12.5px] font-bold text-crimson-700 hover:underline">{p.code}</Link>
                      {(p as any).version > 1 && <span className="ml-1.5 text-[10px] text-[rgb(var(--text-tertiary))]">v{(p as any).version}</span>}
                      <div className="font-bold text-ink truncate">{p.lead?.customerName ?? '—'}</div>
                      <div className="text-[13px] text-[rgb(var(--text-secondary))] break-words">{p.name}</div>
                    </div>
                    <Pill variant={statusVariant[p.status] ?? 'neutral'}>{statusLabel(p.status)}</Pill>
                  </div>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-[12.5px] tnum">
                    <span className="text-[rgb(var(--text-secondary))]">Travel <span className="text-ink">{formatDateShort(p.travelDate)}</span> · Created {formatDateShort(p.createdAt)}</span>
                    <span className="money font-bold text-[13.5px]">{fmt(p.pricePaise)}</span>
                  </div>
                  <ProposalActions p={p} walletBalance={walletBalance} stacked />
                </li>
              ))}
            </ul>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-[13.5px] tnum">
                <thead>
                  <tr className="text-left label border-b border-border">
                    <th className="py-3 pr-4 font-bold">Proposal #</th>
                    <th className="py-3 pr-4 font-bold">Customer</th>
                    <th className="py-3 pr-4 font-bold">Trip</th>
                    <th className="py-3 pr-4 font-bold">Travel</th>
                    <th className="py-3 pr-4 font-bold">Created</th>
                    <th className="py-3 pr-4 font-semibold text-right">Price</th>
                    <th className="py-3 pr-4 font-bold">Status</th>
                    <th className="py-3 pr-4 font-bold">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id} className="border-b border-border-subtle hover:bg-surface-2 transition-colors group">
                      <td className="py-3 pr-4 font-mono text-[12.5px] font-bold">
                        <Link href={`/itinerary/${p.id}/customize` as any} className="text-crimson-700 hover:underline">{p.code}</Link>
                        {(p as any).version > 1 && <span className="ml-1.5 text-[10px] text-[rgb(var(--text-tertiary))]">v{(p as any).version}</span>}
                      </td>
                      <td className="py-3 pr-4 font-bold text-ink">{p.lead?.customerName ?? '—'}</td>
                      <td className="py-3 pr-4 text-[rgb(var(--text-secondary))]">{p.name}</td>
                      <td className="py-3 pr-4">{formatDateShort(p.travelDate)}</td>
                      <td className="py-3 pr-4 text-[rgb(var(--text-secondary))]">{formatDateShort(p.createdAt)}</td>
                      <td className="py-3 pr-4 money text-right">{fmt(p.pricePaise)}</td>
                      <td className="py-3 pr-4"><Pill variant={statusVariant[p.status] ?? 'neutral'}>{statusLabel(p.status)}</Pill></td>
                      <td className="py-3 pr-4">
                        <ProposalActions p={p} walletBalance={walletBalance} />
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
    </div>
  );
}

type ProposalRow = Awaited<ReturnType<typeof listProposals>>[number];

/** Row actions, shared by the desktop table and the phone card list. */
function ProposalActions({ p, walletBalance, stacked }: { p: ProposalRow; walletBalance: bigint | number; stacked?: boolean }) {
  return (
    <div className={`flex flex-wrap items-center ${stacked ? 'gap-x-4 gap-y-1 pt-1' : 'gap-3'}`}>
      {BOOKABLE.includes(p.status) && (
        <BookTripModal
          proposalId={p.id}
          code={p.code}
          tripName={p.name}
          customerName={p.lead?.customerName}
          netCostPaise={Number(p.netCostPaise)}
          balancePaise={Number(walletBalance)}
          accepted={p.status === 'ACCEPTED'}
          variant="link"
        />
      )}
      {p.status === 'BOOKED' && (
        <a href={`/api/booking-voucher/${p.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 min-h-6 text-xs font-semibold text-success-600 hover:underline" title="Download booking voucher"><FileCheck className="w-3 h-3" />Voucher</a>
      )}
      {/* Secondary actions fade in on hover only for real hover devices (mouse) at lg+.
          Touch screens (e.g. iPad landscape) and keyboard focus always see them. */}
      <div className={`inline-flex flex-wrap items-center gap-3 opacity-100 transition-opacity ${stacked ? '' : '[@media(hover:hover)_and_(pointer:fine)]:lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100'}`}>
        <a href={`/p/${p.shareToken}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 min-h-6 text-xs text-crimson-700 hover:underline" title="Open customer link">
          Open <ExternalLink className="w-3 h-3" />
        </a>
        <a href={`/api/proposal-pdf/${p.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 min-h-6 text-xs text-[rgb(var(--text-secondary))] hover:text-crimson-700" title="Download branded PDF"><Download className="w-3 h-3" />PDF</a>
        <form action={reviseProposalAction.bind(null, p.id)} className="inline">
          <RowSubmitButton icon={<GitBranch className="w-3 h-3" />} label="Revise" pendingLabel="Revising…" title="Create a revised version (v2)" />
        </form>
        <form action={duplicateProposalAction.bind(null, p.id)} className="inline">
          <RowSubmitButton icon={<Copy className="w-3 h-3" />} label="Copy" pendingLabel="Copying…" title="Duplicate as a new draft" />
        </form>
      </div>
    </div>
  );
}
