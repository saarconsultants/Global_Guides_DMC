import { Card, CardContent } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
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
    <div className="mx-auto max-w-7xl px-6 py-10 space-y-6">
      <PageHeader
        title="My proposals"
        description="Quotes you've prepared. Click a row to open it. Customer views update status automatically."
        actions={<Link href="/itinerary/new"><Button>New proposal</Button></Link>}
      />

      <Card>
        <CardContent className="pt-5">
          <form method="GET" action="/proposals" className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--text-tertiary))]" />
              <Input name="q" defaultValue={sp.q ?? ''} placeholder="Search by code, customer name, trip or destination…" className="pl-9" />
            </div>
            <select name="status" defaultValue={sp.status ?? ''} className="h-10 rounded-sm border border-border bg-surface px-3 text-sm">
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
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-crimson-700 font-bold border-b-[1.5px] border-crimson-100">
                    <th className="py-3 pr-4 font-semibold">Proposal #</th>
                    <th className="py-3 pr-4 font-semibold">Customer</th>
                    <th className="py-3 pr-4 font-semibold">Trip</th>
                    <th className="py-3 pr-4 font-semibold">Travel</th>
                    <th className="py-3 pr-4 font-semibold">Created</th>
                    <th className="py-3 pr-4 font-semibold text-right">Price</th>
                    <th className="py-3 pr-4 font-semibold">Status</th>
                    <th className="py-3 pr-4 font-semibold">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id} className="border-b border-border-subtle/70 even:bg-surface-2/30 hover:bg-surface-2 transition-colors group">
                      <td className="py-3 pr-4 font-mono text-xs">
                        <Link href={`/itinerary/${p.id}/customize` as any} className="text-crimson-700 hover:underline">{p.code}</Link>
                        {(p as any).version > 1 && <span className="ml-1.5 text-[10px] text-[rgb(var(--text-tertiary))]">v{(p as any).version}</span>}
                      </td>
                      <td className="py-3 pr-4">{p.lead?.customerName ?? '—'}</td>
                      <td className="py-3 pr-4">{p.name}</td>
                      <td className="py-3 pr-4">{formatDateShort(p.travelDate)}</td>
                      <td className="py-3 pr-4 text-[rgb(var(--text-secondary))]">{formatDateShort(p.createdAt)}</td>
                      <td className="py-3 pr-4 font-mono text-right">{fmt(p.pricePaise)}</td>
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
