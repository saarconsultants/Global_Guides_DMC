import { db } from '@/lib/db/client';
import { Card, CardContent } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { statusLabel } from '@/lib/labels';
import { Button, ButtonLink, buttonVariants } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { requireAgency } from '@/lib/auth/ctx';
import { formatDateShort, formatDayMonth } from '@/lib/utils';
import { getDisplayMoney } from '@/lib/money-server';
import { setLeadStatusAction } from '@/app/actions/leads';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { RouteCode } from '@/components/ui/pass';
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
  // Lead + notes in parallel (notes are discarded if the lead isn't this agency's).
  // Proposals: list columns only, not the itinerary JSON.
  const [lead, noteRows] = await Promise.all([
    db.lead.findFirst({
      where: { id, agencyId: actor.agencyId },
      include: { proposals: { orderBy: { createdAt: 'desc' }, select: { id: true, code: true, name: true, status: true, pricePaise: true, shareToken: true, createdAt: true, updatedAt: true, lastViewedAt: true, acceptedAt: true, destinations: true } } },
    }),
    db.leadNote.findMany({ where: { leadId: id }, orderBy: { createdAt: 'desc' }, take: 100 }),
  ]);
  if (!lead) notFound();

  const authorIds = Array.from(new Set(noteRows.map((n) => n.authorId).filter(Boolean) as string[]));
  const authors = authorIds.length ? await db.user.findMany({ where: { id: { in: authorIds } }, select: { id: true, name: true, email: true } }) : [];
  const authorMap = new Map(authors.map((a) => [a.id, a.name ?? a.email] as const));
  const notes = noteRows.map((n) => ({
    id: n.id, body: n.body, kind: n.kind,
    authorName: n.authorId ? authorMap.get(n.authorId) ?? null : null,
    createdAt: n.createdAt.toISOString(),
  }));

  // Internal seed/import markers never show to agents.
  const sourceLabel = lead.source && lead.source !== 'demo-seed' ? lead.source : null;
  const destCodes = (lead.destinations ?? '').split(',').map((c) => c.trim()).filter(Boolean);
  const h = await headers();
  const origin = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('x-forwarded-host') ?? h.get('host') ?? ''}`;

  const totalQuoted = lead.proposals.reduce((s, p) => s + Number(p.pricePaise), 0);
  const latestProposal = lead.proposals[0];

  // Build a simple activity timeline from lead + proposal events
  const events: Array<{ at: Date; title: string; sub?: string; icon: 'create' | 'quote' | 'view' | 'accept' | 'decline' | 'book' }> = [];
  events.push({ at: lead.createdAt, title: sourceLabel ? `Lead created · ${sourceLabel}` : 'Lead created', sub: `Status: ${statusLabel(lead.status)}`, icon: 'create' });
  for (const p of lead.proposals) {
    events.push({ at: p.createdAt, title: `Proposal ${p.code} sent`, sub: `${p.name} · ${fmt(p.pricePaise)}`, icon: 'quote' });
    if (p.lastViewedAt) events.push({ at: p.lastViewedAt, title: `Customer viewed ${p.code}`, icon: 'view' });
    if (p.acceptedAt)   events.push({ at: p.acceptedAt,   title: `Customer accepted ${p.code}`, icon: 'accept' });
    if (p.status === 'DECLINED') events.push({ at: p.updatedAt, title: `Customer declined ${p.code}`, icon: 'decline' });
    if (p.status === 'BOOKED')   events.push({ at: p.updatedAt, title: `Booked from ${p.code}`, icon: 'book' });
  }
  events.sort((a, b) => b.at.getTime() - a.at.getTime());

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 lg:py-10 space-y-6 overflow-x-clip">
      <Link href="/leads" className="inline-flex items-center gap-1.5 text-sm text-[rgb(var(--text-secondary))] hover:text-ink"><ArrowLeft className="w-4 h-4" />Back to leads</Link>

      <PageHeader
        title={lead.customerName}
        description={[lead.customerEmail, lead.customerPhone, `Created ${formatDateShort(lead.createdAt)}${sourceLabel ? ` via ${sourceLabel}` : ''}`].filter(Boolean).join(' · ')}
        actions={
          <>
            <ActionForm action={setLeadStatusAction.bind(null, lead.id)} success="Lead status updated" className="inline-flex items-center gap-2">
              <select name="status" aria-label="Lead status" defaultValue={lead.status} className="control h-9 w-auto min-w-[140px] text-sm px-3">
                {Object.keys(statusVariant).map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
              </select>
              <Button size="sm" variant="secondary" type="submit">Update</Button>
            </ActionForm>
            <ButtonLink href="/itinerary/new" size="sm" className="gap-1.5"><Sparkles className="w-4 h-4" />New trip</ButtonLink>
          </>
        }
      />

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6 min-w-0">
          {/* KPI strip */}
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
            <Card><CardContent className="pt-5">
              <p className="label">Proposals</p>
              <p className="mt-1 text-3xl font-bold text-ink">{lead.proposals.length}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-5">
              <p className="label">Total quoted</p>
              <p className="mt-1 text-2xl sm:text-xl lg:text-2xl font-bold text-ink money break-words min-w-0">{fmt(BigInt(totalQuoted))}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-5">
              <p className="label">Status</p>
              <p className="mt-1.5"><Pill variant={statusVariant[lead.status] ?? 'neutral'}>{statusLabel(lead.status)}</Pill></p>
            </CardContent></Card>
          </div>

          {/* Trip request summary */}
          <Card>
            <CardContent className="pt-6 space-y-2">
              <h2 className="text-lg font-semibold text-ink">Trip request</h2>
              <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div><dt className="label">Destinations</dt><dd className="mt-1">{destCodes.length ? <RouteCode codes={destCodes} /> : '—'}</dd></div>
                <div><dt className="label">From</dt><dd className="mt-0.5">{lead.originCity ?? '—'}</dd></div>
                <div><dt className="label">Travel date</dt><dd className="mt-0.5 font-mono">{lead.travelDate ? formatDateShort(lead.travelDate) : '—'}</dd></div>
                <div><dt className="label">Nights</dt><dd className="mt-0.5 font-mono">{lead.nights ?? '—'}</dd></div>
              </dl>
            </CardContent>
          </Card>

          {/* Notes & activity */}
          <LeadNotesPanel leadId={lead.id} notes={notes} currentUserId={actor.userId} isOwner={actor.role === 'AGENCY_OWNER'} />

          {/* Proposals */}
          <section>
            <h2 className="text-[18px] font-extrabold text-ink tracking-[-0.01em] mb-3">Proposals ({lead.proposals.length})</h2>
            <Card><CardContent className="pt-2">
              {lead.proposals.length === 0 ? (
                <EmptyState dense icon={<FileText className="w-7 h-7" />} title="No proposals yet" body="Build a trip and save it — it'll be linked to this lead." primary={{ label: 'Build a proposal', href: '/itinerary/new' }} />
              ) : (
                <>
                {/* Phones: stacked rows. */}
                <ul className="md:hidden divide-y divide-border-subtle">
                  {lead.proposals.map((p) => {
                    const codes = proposalCodes(p.destinations);
                    return (
                      <li key={p.id} className="py-3.5 space-y-1.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Link href={`/itinerary/${p.id}/customize` as any} className="inline-flex items-center min-h-6 hit-area font-mono text-[12.5px] font-bold text-crimson-700 hover:underline whitespace-nowrap">{p.code}</Link>
                            <div className="text-[13.5px] text-ink break-words">{p.name}</div>
                          </div>
                          <Pill variant={proposalStatusVariant[p.status] ?? 'neutral'}>{statusLabel(p.status)}</Pill>
                        </div>
                        {codes.length > 0 && <RouteCode codes={codes} />}
                        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[12.5px]">
                          <span className="text-[rgb(var(--text-secondary))]">Created <span className="font-mono">{formatDayMonth(p.createdAt)}</span></span>
                          <span className="money text-[14px] text-ink">{fmt(p.pricePaise)}</span>
                        </div>
                        <a href={`/p/${p.shareToken}`} target="_blank" rel="noreferrer" className="text-xs font-semibold text-crimson-700 hover:underline inline-flex items-center gap-1 min-h-6 hit-area">Open customer link <ExternalLink className="w-3 h-3" /></a>
                      </li>
                    );
                  })}
                </ul>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm tnum">
                    <thead><tr className="text-left label border-b border-border"><th className="py-3 pr-4">Code</th><th className="py-3 pr-4">Trip</th><th className="py-3 pr-4">Created</th><th className="py-3 pr-4 text-right">Price</th><th className="py-3 pr-4">Status</th><th className="py-3"><span className="sr-only">Actions</span></th></tr></thead>
                    <tbody>
                      {lead.proposals.map((p) => {
                        const codes = proposalCodes(p.destinations);
                        return (
                          <tr key={p.id} className="border-b border-border-subtle hover:bg-surface-2 transition-colors">
                            <td className="py-3 pr-4 font-mono text-xs whitespace-nowrap"><Link href={`/itinerary/${p.id}/customize` as any} className="text-crimson-700 hover:underline">{p.code}</Link></td>
                            <td className="py-3 pr-4">{codes.length > 0 ? <RouteCode codes={codes} /> : p.name}</td>
                            <td className="py-3 pr-4 text-[rgb(var(--text-secondary))] font-mono text-xs whitespace-nowrap">{formatDateShort(p.createdAt)}</td>
                            <td className="py-3 pr-4 money text-right whitespace-nowrap">{fmt(p.pricePaise)}</td>
                            <td className="py-3 pr-4"><Pill variant={proposalStatusVariant[p.status] ?? 'neutral'}>{statusLabel(p.status)}</Pill></td>
                            <td className="py-3 text-right">
                              <a href={`/p/${p.shareToken}`} target="_blank" rel="noreferrer" className="text-xs text-crimson-700 hover:underline inline-flex items-center gap-1 min-h-6 hit-area">Open <ExternalLink className="w-3 h-3" /></a>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                </>
              )}
            </CardContent></Card>
          </section>
        </div>

        {/* Right rail: contact + timeline */}
        <aside className="space-y-4 min-w-0">
          <Card>
            <CardContent className="pt-6 space-y-3">
              <h3 className="text-sm font-semibold text-ink">Reach the customer</h3>
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
                      <a href={`https://wa.me/${lead.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${lead.customerName.split(' ')[0]}, here's the proposal I prepared for you (${latestProposal.code}): ${origin}/p/${latestProposal.shareToken}`)}`} target="_blank" rel="noreferrer" className={`${buttonVariants({ variant: 'secondary', size: 'sm' })} w-full gap-1.5 mt-1`}><MessageCircle className="w-4 h-4 text-[#107C41]" aria-hidden />Send latest proposal on WhatsApp</a>
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
              <h3 className="text-sm font-semibold text-ink mb-3">Activity</h3>
              <ol className="relative border-l-2 border-crimson-500/20 pl-4 space-y-3">
                {events.map((e, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[19px] top-1 w-3 h-3 rounded-full bg-crimson-700 border-2 border-canvas" />
                    <p className="text-xs text-ink font-medium">{e.title}</p>
                    {e.sub && <p className="text-[11px] text-[rgb(var(--text-secondary))]">{e.sub}</p>}
                    <p className="text-[10px] font-mono text-[rgb(var(--text-tertiary))] mt-0.5 tnum">{formatDayMonth(e.at)} · {e.at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
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

/** Proposal.destinations is stored JSON (an array of { cityCode, … }). */
function proposalCodes(json: string | null | undefined): string[] {
  try {
    const arr = JSON.parse(json ?? '[]') as Array<{ cityCode?: string }>;
    return Array.isArray(arr) ? arr.map((d) => d.cityCode).filter((c): c is string => !!c) : [];
  } catch {
    return [];
  }
}
