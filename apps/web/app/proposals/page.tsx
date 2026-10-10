import { Card, CardContent } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
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
        description="Quotes you've prepared. Click a row to open it. Customer views update status automatically."
        actions={<ButtonLink href="/itinerary/new">New proposal</ButtonLink>}
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
              {Object.keys(statusVariant).map((s) => <option key={s}>{s}</option>)}
            </select>
            <Button variant="secondary" className="gap-1.5"><Filter className="w-4 h-4" />Filter</Button>
            {(sp.q || sp.status) && <Link href="/proposals" className="text-xs text-danger-500 hover:underline">× clear</Link>}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-2">
          {rows.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-7 h-7" />}
              title="No proposals yet"
              body="Build a trip and click Save As Proposal. Your saved quotes will live here, with status updates the moment your customer opens the share link."
              primary={{ label: 'Build a proposal', href: '/itinerary/new' }}
              secondary={{ label: 'See templates', href: '/suggested' }}
            />
          ) : (
            <div className="overflow-x-auto">
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
                      <td className="py-3 pr-4"><Pill variant={statusVariant[p.status] ?? 'neutral'}>{p.status}</Pill></td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
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
                            <a href={`/api/booking-voucher/${p.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-success-600 hover:underline" title="Download booking voucher"><FileCheck className="w-3 h-3" />Voucher</a>
                          )}
                          <div className="inline-flex items-center gap-3 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 transition-opacity">
                            <a href={`/p/${p.shareToken}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-crimson-700 hover:underline" title="Open customer link">
                              Open <ExternalLink className="w-3 h-3" />
                            </a>
                          <a href={`/api/proposal-pdf/${p.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-[rgb(var(--text-secondary))] hover:text-crimson-700" title="Download branded PDF"><Download className="w-3 h-3" />PDF</a>
                          <form action={reviseProposalAction.bind(null, p.id)} className="inline">
                            <button className="inline-flex items-center gap-1 text-xs text-[rgb(var(--text-secondary))] hover:text-crimson-700" title="Create a revised version (v2)"><GitBranch className="w-3 h-3" />Revise</button>
                          </form>
                          <form action={duplicateProposalAction.bind(null, p.id)} className="inline">
                            <button className="inline-flex items-center gap-1 text-xs text-[rgb(var(--text-secondary))] hover:text-crimson-700" title="Duplicate as a new draft"><Copy className="w-3 h-3" />Copy</button>
                          </form>
                          </div>
                        </div>
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
