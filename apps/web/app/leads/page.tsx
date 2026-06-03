import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { listLeads } from '@/lib/db/proposals';
import { formatDateShort } from '@/lib/utils';
import { getDisplayMoney } from '@/lib/money-server';
import { LeadActions } from '@/components/leads/lead-actions';
import { ClipboardList, HelpCircle, Plus, Search, Filter } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const statusVariant: Record<string, 'neutral' | 'info' | 'success' | 'warning' | 'danger'> = {
  NEW: 'info', QUOTED: 'neutral', FOLLOWUP: 'warning', BOOKED: 'success', LOST: 'danger',
};

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { fmt } = await getDisplayMoney();
  const sp = await searchParams;
  const rows = await listLeads({ q: sp.q, status: sp.status });
  const total = rows.length;
  const converted = rows.filter((r) => r.status === 'BOOKED').length;
  const convRate = total > 0 ? Math.round((converted / total) * 100) : 0;
  const last = rows[0];

  const kpis = [
    { l: 'Total leads',  v: String(total),     s: 'all-time' },
    { l: 'Converted',    v: String(converted), s: 'now booked' },
    { l: 'Conv. rate',   v: total ? `${convRate}%` : '—', s: 'booked / total' },
    { l: 'Last lead',    v: last ? formatDateShort(last.createdAt) : '—', s: 'most recent' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 space-y-6">
      <PageHeader
        title="My leads"
        description="Every enquiry, proposal request, and customer interaction in one place."
        actions={
          <>
            <a href="https://wa.me/918378073375?text=Hi%20Global%20Guides%20ops%2C%20I%20need%20help%20with%20a%20lead." target="_blank" rel="noreferrer" className="inline-flex"><Button variant="secondary" className="gap-1.5"><HelpCircle className="w-4 h-4" />I need help</Button></a>
            <Link href="/itinerary/new"><Button className="gap-1.5"><Plus className="w-4 h-4" />New lead</Button></Link>
          </>
        }
      />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 stagger">
        {kpis.map((k) => (
          <Card key={k.l} className="lift">
            <CardContent className="pt-5">
              <p className="text-[11px] uppercase tracking-widest text-[rgb(var(--text-secondary))] font-bold">{k.l}</p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-navy-900">{k.v}</p>
              <p className="text-xs text-[rgb(var(--text-secondary))] mt-0.5">{k.s}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-5">
          <form method="GET" action="/leads" className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--text-tertiary))]" />
              <Input name="q" defaultValue={sp.q ?? ''} placeholder="Search by customer name, email, phone or destination…" className="pl-9" />
            </div>
            <select name="status" defaultValue={sp.status ?? ''} className="h-10 rounded-sm border border-border bg-surface px-3 text-sm">
              <option value="">All statuses</option>
              {Object.keys(statusVariant).map((s) => <option key={s}>{s}</option>)}
            </select>
            <Button variant="secondary" className="gap-1.5"><Filter className="w-4 h-4" />Filter</Button>
            {(sp.q || sp.status) && <Link href="/leads" className="text-xs text-danger-500 hover:underline">× clear</Link>}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-2">
          {rows.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="w-7 h-7" />}
              title="No leads yet"
              body="Save a proposal to auto-create your first lead. Leads appear here as soon as you click Save As Proposal in the builder."
              primary={{ label: 'Create your first trip', href: '/itinerary/new' }}
              secondary={{ label: 'Browse templates', href: '/suggested' }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-[rgb(var(--text-secondary))] border-b border-border-subtle">
                    <th className="py-3 pr-4 font-semibold">Customer</th>
                    <th className="py-3 pr-4 font-semibold">Phone</th>
                    <th className="py-3 pr-4 font-semibold">Created</th>
                    <th className="py-3 pr-4 font-semibold">Destinations</th>
                    <th className="py-3 pr-4 font-semibold">From</th>
                    <th className="py-3 pr-4 font-semibold">Travel</th>
                    <th className="py-3 pr-4 font-semibold">Nights</th>
                    <th className="py-3 pr-4 font-semibold">Status</th>
                    <th className="py-3 pr-4 font-semibold">Latest quote</th>
                    <th className="py-3 pl-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((l) => {
                    const latest = l.proposals?.[0];
                    return (
                      <tr key={l.id} className="border-b border-border-subtle hover:bg-surface-2 transition-colors">
                        <td className="py-3 pr-4 font-medium"><Link href={`/leads/${l.id}` as any} className="hover:text-crimson-700">{l.customerName}</Link></td>
                        <td className="py-3 pr-4 text-[rgb(var(--text-secondary))]">{l.customerPhone ?? '—'}</td>
                        <td className="py-3 pr-4 text-[rgb(var(--text-secondary))]">{formatDateShort(l.createdAt)}</td>
                        <td className="py-3 pr-4 font-mono text-xs">{l.destinations}</td>
                        <td className="py-3 pr-4">{l.originCity ?? '—'}</td>
                        <td className="py-3 pr-4">{l.travelDate ? formatDateShort(l.travelDate) : '—'}</td>
                        <td className="py-3 pr-4 font-mono">{l.nights ?? '—'}</td>
                        <td className="py-3 pr-4"><Pill variant={statusVariant[l.status] ?? 'neutral'}>{l.status}</Pill></td>
                        <td className="py-3 pr-4 font-mono text-xs">{latest ? `${latest.code} · ${fmt(latest.pricePaise)}` : '—'}</td>
                        <td className="py-3 pl-4">
                          <LeadActions
                            lead={{ id: l.id, customerName: l.customerName, customerEmail: l.customerEmail, customerPhone: l.customerPhone, status: l.status }}
                            latestProposalId={latest?.id ?? null}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
