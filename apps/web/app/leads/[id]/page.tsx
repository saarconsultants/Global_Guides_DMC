import { db } from '@/lib/db/client';
import { Card, CardContent } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { requireAgency } from '@/lib/auth/ctx';
import { formatDateShort } from '@/lib/utils';
import { getDisplayMoney } from '@/lib/money-server';
import { setLeadStatusAction } from '@/app/actions/leads';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mail, Phone, FileText, ExternalLink, MessageCircle, Sparkles } from 'lucide-react';
import { LeadNotesPanel } from '@/components/leads/notes-panel';
import { ActionForm } from '@/components/ui/action-form';

export const dynamic = 'force-dynamic';

const statusVariant: Record<string, 'info' | 'neutral' | 'warning' | 'success' | 'danger'> = {
  NEW: 'info', QUOTED: 'neutral', FOLLOWUP: 'warning', BOOKED: 'success', LOST: 'danger',
};
const proposalStatusVariant: Record<string, 'info' | 'neutral' | 'success' | 'danger'> = {
  DRAFT: 'neutral', SENT: 'info', VIEWED: 'info', ACCEPTED: 'success', BOOKED: 'success', DECLINED: 'danger',
};

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { fmt } = await getDisplayMoney();
  const actor = await requireAgency();
  const { id } = await params;
  const lead = await db.lead.findFirst({
    where: { id, agencyId: actor.agencyId },
    include: { proposals: { orderBy: { createdAt: 'desc' } } },
  });
  if (!lead) notFound();

  // Notes — fetched separately so we can join author names
  const noteRows = await db.leadNote.findMany({
    where: { leadId: id }, orderBy: { createdAt: 'desc' }, take: 100,
  });
  const authorIds = Array.from(new Set(noteRows.map((n) => n.authorId).filter(Boolean) as string[]));
  const authors = authorIds.length ? await db.user.findMany({ where: { id: { in: authorIds } }, select: { id: true, name: true, email: true } }) : [];
  const authorMap = new Map(authors.map((a) => [a.id, a.name ?? a.email] as const));
  const notes = noteRows.map((n) => ({
    id: n.id, body: n.body, kind: n.kind,
    authorName: n.authorId ? authorMap.get(n.authorId) ?? null : null,
    createdAt: n.createdAt.toISOString(),
  }));

  const totalQuoted = lead.proposals.reduce((s, p) => s + Number(p.pricePaise), 0);
  const latestProposal = lead.proposals[0];

  // Build a simple activity timeline from lead + proposal events
  const events: Array<{ at: Date; title: string; sub?: string; icon: 'create' | 'quote' | 'view' | 'accept' | 'decline' | 'book' }> = [];
  events.push({ at: lead.createdAt, title: `Lead created · ${lead.source}`, sub: `Status: ${lead.status}`, icon: 'create' });
  for (const p of lead.proposals) {
    events.push({ at: p.createdAt, title: `Proposal ${p.code} sent`, sub: `${p.name} · ${fmt(p.pricePaise)}`, icon: 'quote' });
    if (p.lastViewedAt) events.push({ at: p.lastViewedAt, title: `Customer viewed ${p.code}`, icon: 'view' });
    if (p.acceptedAt)   events.push({ at: p.acceptedAt,   title: `Customer accepted ${p.code}`, icon: 'accept' });
    if (p.status === 'DECLINED') events.push({ at: p.updatedAt, title: `Customer declined ${p.code}`, icon: 'decline' });
    if (p.status === 'BOOKED')   events.push({ at: p.updatedAt, title: `Booked from ${p.code}`, icon: 'book' });
  }
  events.sort((a, b) => b.at.getTime() - a.at.getTime());

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 space-y-6">
      <Link href="/leads" className="inline-flex items-center gap-1.5 text-sm text-[rgb(var(--text-secondary))] hover:text-navy-900"><ArrowLeft className="w-4 h-4" />Back to leads</Link>

      <PageHeader
        eyebrow="Lead"
        title={lead.customerName}
        description={`${lead.customerEmail ?? '—'} · ${lead.customerPhone ?? '—'} · Created ${formatDateShort(lead.createdAt)} via ${lead.source}`}
        actions={
          <>
            <ActionForm action={setLeadStatusAction.bind(null, lead.id)} success="Lead status updated" className="inline-flex items-center gap-2">
              <select name="status" defaultValue={lead.status} className="h-10 rounded-md border border-border bg-surface px-3 text-sm">
                {Object.keys(statusVariant).map((s) => <option key={s}>{s}</option>)}
              </select>
              <Button size="sm" variant="secondary" type="submit">Update</Button>
            </ActionForm>
            <Link href="/itinerary/new"><Button className="gap-1.5"><Sparkles className="w-4 h-4" />New proposal</Button></Link>
          </>
        }
      />

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6">
          {/* KPI strip */}
          <div className="grid gap-3 grid-cols-3 stagger">
            <Card className="lift"><CardContent className="pt-5">
              <p className="text-[11px] uppercase tracking-widest text-[rgb(var(--text-secondary))] font-bold">Proposals</p>
              <p className="mt-1 text-3xl font-bold text-navy-900">{lead.proposals.length}</p>
            </CardContent></Card>
            <Card className="lift"><CardContent className="pt-5">
              <p className="text-[11px] uppercase tracking-widest text-[rgb(var(--text-secondary))] font-bold">Total quoted</p>
              <p className="mt-1 text-2xl font-bold text-navy-900 font-mono tabular-nums">{fmt(BigInt(totalQuoted))}</p>
            </CardContent></Card>
            <Card className="lift"><CardContent className="pt-5">
              <p className="text-[11px] uppercase tracking-widest text-[rgb(var(--text-secondary))] font-bold">Status</p>
              <p className="mt-1.5"><Pill variant={statusVariant[lead.status] ?? 'neutral'}>{lead.status}</Pill></p>
            </CardContent></Card>
          </div>

          {/* Trip request summary */}
          <Card>
            <CardContent className="pt-6 space-y-2">
              <h2 className="text-lg font-semibold text-navy-900">Trip request</h2>
              <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div><dt className="text-[rgb(var(--text-secondary))] text-xs uppercase tracking-widest font-bold">Destinations</dt><dd className="mt-0.5 font-mono">{lead.destinations || '—'}</dd></div>
                <div><dt className="text-[rgb(var(--text-secondary))] text-xs uppercase tracking-widest font-bold">From</dt><dd className="mt-0.5">{lead.originCity ?? '—'}</dd></div>
                <div><dt className="text-[rgb(var(--text-secondary))] text-xs uppercase tracking-widest font-bold">Travel date</dt><dd className="mt-0.5">{lead.travelDate ? formatDateShort(lead.travelDate) : '—'}</dd></div>
                <div><dt className="text-[rgb(var(--text-secondary))] text-xs uppercase tracking-widest font-bold">Nights</dt><dd className="mt-0.5 font-mono">{lead.nights ?? '—'}</dd></div>
              </dl>
            </CardContent>
          </Card>

          {/* Notes & activity */}
          <LeadNotesPanel leadId={lead.id} notes={notes} currentUserId={actor.userId} isOwner={actor.role === 'AGENCY_OWNER'} />

          {/* Proposals */}
          <section>
            <h2 className="text-xl font-semibold text-navy-900 mb-3">Proposals ({lead.proposals.length})</h2>
            <Card><CardContent className="pt-2">
              {lead.proposals.length === 0 ? (
                <EmptyState dense icon={<FileText className="w-7 h-7" />} title="No proposals yet" body="Build a trip and save it — it'll be linked to this lead." primary={{ label: 'Build a proposal', href: '/itinerary/new' }} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-[11px] uppercase tracking-wider text-crimson-700 font-bold border-b-[1.5px] border-crimson-100"><th className="py-3 pr-4">Code</th><th>Trip</th><th>Created</th><th className="text-right">Price</th><th>Status</th><th></th></tr></thead>
                    <tbody>
                      {lead.proposals.map((p) => (
                        <tr key={p.id} className="border-b border-border-subtle hover:bg-surface-2 transition-colors group">
                          <td className="py-3 pr-4 font-mono text-xs"><Link href={`/itinerary/${p.id}/customize` as any} className="text-crimson-700 hover:underline">{p.code}</Link></td>
                          <td className="py-3 pr-4">{p.name}</td>
                          <td className="py-3 pr-4 text-[rgb(var(--text-secondary))] text-xs">{formatDateShort(p.createdAt)}</td>
                          <td className="py-3 pr-4 font-mono text-right">{fmt(p.pricePaise)}</td>
                          <td className="py-3 pr-4"><Pill variant={proposalStatusVariant[p.status] ?? 'neutral'}>{p.status}</Pill></td>
                          <td className="py-3 pr-4 text-right">
                            <a href={`/p/${p.shareToken}`} target="_blank" rel="noreferrer" className="text-xs text-crimson-700 hover:underline opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 transition-opacity inline-flex items-center gap-1">Open <ExternalLink className="w-3 h-3" /></a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent></Card>
          </section>
        </div>

        {/* Right rail: contact + timeline */}
        <aside className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-3">
              <h3 className="text-sm font-semibold text-navy-900">Reach the customer</h3>
              <div className="space-y-2 text-sm">
                {lead.customerEmail && (
                  <a href={`mailto:${lead.customerEmail}`} className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-navy-50 transition-colors">
                    <Mail className="w-4 h-4 text-crimson-700" /><span className="flex-1 truncate">{lead.customerEmail}</span>
                  </a>
                )}
                {lead.customerPhone && (
                  <>
                    <a href={`tel:${lead.customerPhone}`} className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-navy-50 transition-colors">
                      <Phone className="w-4 h-4 text-crimson-700" /><span className="flex-1">{lead.customerPhone}</span>
                    </a>
                    <a href={`https://wa.me/${lead.customerPhone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-navy-50 transition-colors">
                      <MessageCircle className="w-4 h-4 text-[#25D366]" /><span className="flex-1">WhatsApp</span>
                    </a>
                    {latestProposal && (
                      <a href={`https://wa.me/${lead.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${lead.customerName.split(' ')[0]}, here's the proposal I prepared for you (${latestProposal.code}): ${typeof window === 'undefined' ? '' : window.location.origin}/p/${latestProposal.shareToken}`)}`} target="_blank" rel="noreferrer" className="block px-3 py-2 rounded-md bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 text-xs font-semibold transition-colors text-center">Send latest proposal on WhatsApp</a>
                    )}
                  </>
                )}
                {!lead.customerEmail && !lead.customerPhone && (
                  <p className="text-xs text-[rgb(var(--text-secondary))]">No contact info on file. Save a proposal with customer details next time and they'll appear here.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Activity timeline */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-sm font-semibold text-navy-900 mb-3">Activity</h3>
              <ol className="relative border-l-2 border-crimson-500/20 pl-4 space-y-3">
                {events.map((e, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[19px] top-1 w-3 h-3 rounded-full bg-crimson-700 border-2 border-canvas" />
                    <p className="text-xs text-navy-900 font-medium">{e.title}</p>
                    {e.sub && <p className="text-[11px] text-[rgb(var(--text-secondary))]">{e.sub}</p>}
                    <p className="text-[10px] text-[rgb(var(--text-tertiary))] mt-0.5">{e.at.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
