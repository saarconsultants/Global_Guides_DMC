import { Card, CardContent } from '@/components/ui/card';
import { ButtonLink } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { statusLabel } from '@/lib/labels';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { StatCard } from '@/components/ui/stat-card';
import { listLeads } from '@/lib/db/proposals';
import { formatDateShort, formatDayMonth } from '@/lib/utils';
import { getDisplayMoney } from '@/lib/money-server';
import { LeadActions } from '@/components/leads/lead-actions';
import { ClipboardList, HelpCircle, Plus } from 'lucide-react';
import { FilterBar } from '@/components/ui/filter-bar';
import Link from 'next/link';
import { RouteCode } from '@/components/ui/pass';

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
    { l: 'Last lead',    v: last ? formatDayMonth(last.createdAt) : '—', s: 'most recent' },
  ];

  return (
    <div className="shell py-8 lg:py-10 space-y-6">
      <PageHeader
        title="My leads"
        description="Every enquiry, proposal request, and customer interaction in one place."
        actions={
          <>
            <ButtonLink href="https://wa.me/918378073375?text=Hi%20Global%20Guides%20ops%2C%20I%20need%20help%20with%20a%20lead." target="_blank" rel="noreferrer" variant="secondary" className="gap-1.5"><HelpCircle className="w-4 h-4" />I need help</ButtonLink>
            <ButtonLink href="/itinerary/new" className="gap-1.5"><Plus className="w-4 h-4" />New lead</ButtonLink>
          </>
        }
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => <StatCard key={k.l} label={k.l} value={k.v} sub={k.s} />)}
      </div>

      <Card>
        <CardContent className="pt-5">
          <FilterBar
            action="/leads"
            q={sp.q}
            searchLabel="Search leads"
            searchPlaceholder="Search by customer name, email, phone or destination…"
            status={{ value: sp.status, label: 'Filter by status', options: [{ value: '', label: 'All statuses' }, ...Object.keys(statusVariant).map((s) => ({ value: s, label: statusLabel(s) }))] }}
            clearHref="/leads"
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-2">
          {rows.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="w-7 h-7" />}
              title="No leads yet"
              body="Save a proposal to auto-create your first lead. Leads appear here as soon as you click Save as proposal in the builder."
              primary={{ label: 'Create your first trip', href: '/itinerary/new' }}
              secondary={{ label: 'Browse templates', href: '/suggested' }}
            />
          ) : (
            <>
            {/* Phones: stacked cards instead of a sideways-scrolling table. */}
            <ul className="md:hidden divide-y divide-border-subtle">
              {rows.map((l) => {
                const latest = l.proposals?.[0];
                return (
                  <li key={l.id} className="py-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/leads/${l.id}` as any} className="inline-flex items-center min-h-6 hit-area font-bold text-ink hover:text-crimson-700 break-words">{l.customerName}</Link>
                        {l.customerPhone && <div className="text-[12.5px] text-[rgb(var(--text-secondary))]">{l.customerPhone}</div>}
                      </div>
                      <Pill variant={statusVariant[l.status] ?? 'neutral'}>{statusLabel(l.status)}</Pill>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-[rgb(var(--text-secondary))]">
                      <RouteCode codes={l.destinations.split(',').map((c) => c.trim()).filter(Boolean)} />
                      {l.originCity && <span>from {l.originCity}</span>}
                    </div>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-[12.5px] tnum">
                      <span className="text-[rgb(var(--text-secondary))]">
                        Travel <span className="font-mono text-ink">{l.travelDate ? formatDateShort(l.travelDate) : '—'}</span>
                        {l.nights != null && <> · {l.nights}N</>} · Created <span className="font-mono">{formatDateShort(l.createdAt)}</span>
                      </span>
                      {latest && <span><span className="font-mono text-[12px] font-bold">{latest.code}</span> <span className="money font-bold">{fmt(latest.pricePaise)}</span></span>}
                    </div>
                    <LeadActions
                      lead={{ id: l.id, customerName: l.customerName, customerEmail: l.customerEmail, customerPhone: l.customerPhone, status: l.status }}
                      latestProposalId={latest?.id ?? null}
                    />
                  </li>
                );
              })}
            </ul>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-[13.5px] tnum">
                <thead>
                  <tr className="text-left label border-b border-border">
                    <th className="py-3 pr-4 font-bold">Customer</th>
                    <th className="py-3 pr-4 font-bold">Phone</th>
                    <th className="py-3 pr-4 font-bold">Created</th>
                    <th className="py-3 pr-4 font-bold">Destinations</th>
                    <th className="py-3 pr-4 font-bold">From</th>
                    <th className="py-3 pr-4 font-bold">Travel</th>
                    <th className="py-3 pr-4 font-bold text-right">Nights</th>
                    <th className="py-3 pr-4 font-bold">Status</th>
                    <th className="py-3 pr-4 font-bold">Latest quote</th>
                    <th className="py-3 pl-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((l) => {
                    const latest = l.proposals?.[0];
                    return (
                      <tr key={l.id} className="border-b border-border-subtle hover:bg-surface-2 transition-colors">
                        <td className="py-3 pr-4 font-bold text-ink"><Link href={`/leads/${l.id}` as any} className="hover:text-crimson-700">{l.customerName}</Link></td>
                        <td className="py-3 pr-4 text-[rgb(var(--text-secondary))]">{l.customerPhone ?? '—'}</td>
                        <td className="py-3 pr-4 font-mono text-[12.5px] whitespace-nowrap text-[rgb(var(--text-secondary))]">{formatDateShort(l.createdAt)}</td>
                        <td className="py-3 pr-4"><RouteCode codes={l.destinations.split(',').map((c) => c.trim()).filter(Boolean)} /></td>
                        <td className="py-3 pr-4">{l.originCity ?? '—'}</td>
                        <td className="py-3 pr-4 font-mono text-[12.5px] whitespace-nowrap">{l.travelDate ? formatDateShort(l.travelDate) : '—'}</td>
                        <td className="py-3 pr-4 text-right tnum">{l.nights ?? '—'}</td>
                        <td className="py-3 pr-4"><Pill variant={statusVariant[l.status] ?? 'neutral'}>{statusLabel(l.status)}</Pill></td>
                        <td className="py-3 pr-4">{latest ? <span><span className="font-mono text-[12px] font-bold">{latest.code}</span> <span className="money">{fmt(latest.pricePaise)}</span></span> : <span className="text-[rgb(var(--text-tertiary))]">—</span>}</td>
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
