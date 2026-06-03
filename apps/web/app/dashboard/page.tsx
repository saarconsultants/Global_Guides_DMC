import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { WelcomeCard } from '@/components/dashboard/welcome-card';
import { requireAgency } from '@/lib/auth/ctx';
import { db } from '@/lib/db/client';
import { formatINR, formatDateShort } from '@/lib/utils';
import { ArrowRight, Sparkles, Plane, Hotel as HotelIcon, ClipboardList, Receipt, BookOpen, Eye, MessageCircleQuestion, Clock, TrendingUp, TrendingDown, Minus, CheckCircle2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

const DAY_MS = 24 * 60 * 60 * 1000;

export default async function DashboardPage() {
  const actor = await requireAgency();

  const now = Date.now();
  const since30 = new Date(now - 30 * DAY_MS);
  const since60 = new Date(now - 60 * DAY_MS);
  const since48h = new Date(now - 2 * DAY_MS);
  const since24h = new Date(now - 1 * DAY_MS);

  const [
    // Current window
    leadCount, propCount, bookedCount,
    // Prior window (for deltas)
    leadPrev, propPrev, bookedPrev,
    // Misc
    wallet, user, agency, totalProposals, viewedAny,
    // Needs-attention
    newLeads, viewedNoResponse, sentNotViewed,
  ] = await Promise.all([
    db.lead.count({     where: { agencyId: actor.agencyId, createdAt: { gte: since30 } } }),
    db.proposal.count({ where: { agencyId: actor.agencyId, createdAt: { gte: since30 } } }),
    db.proposal.count({ where: { agencyId: actor.agencyId, status: { in: ['ACCEPTED', 'BOOKED'] }, createdAt: { gte: since30 } } }),
    db.lead.count({     where: { agencyId: actor.agencyId, createdAt: { gte: since60, lt: since30 } } }),
    db.proposal.count({ where: { agencyId: actor.agencyId, createdAt: { gte: since60, lt: since30 } } }),
    db.proposal.count({ where: { agencyId: actor.agencyId, status: { in: ['ACCEPTED', 'BOOKED'] }, createdAt: { gte: since60, lt: since30 } } }),
    db.agency.findUnique({ where: { id: actor.agencyId }, select: { walletPaise: true } }),
    db.user.findUnique({ where: { id: actor.userId }, select: { welcomeDismissedAt: true } }),
    db.agency.findUnique({ where: { id: actor.agencyId }, select: { logoUrl: true } }),
    db.proposal.count({ where: { agencyId: actor.agencyId } }),
    db.proposal.count({ where: { agencyId: actor.agencyId, lastViewedAt: { not: null } } }),
    db.lead.findMany({
      where: { agencyId: actor.agencyId, status: 'NEW', proposals: { none: {} } },
      orderBy: { createdAt: 'desc' }, take: 5,
      select: { id: true, customerName: true, destinations: true, createdAt: true, source: true },
    }),
    db.proposal.findMany({
      where: { agencyId: actor.agencyId, status: { in: ['VIEWED', 'SENT'] }, lastViewedAt: { not: null, lt: since24h } },
      orderBy: { lastViewedAt: 'desc' }, take: 5,
      include: { lead: { select: { customerName: true } } },
    }),
    db.proposal.findMany({
      where: { agencyId: actor.agencyId, status: 'SENT', lastViewedAt: null, createdAt: { lt: since48h } },
      orderBy: { createdAt: 'desc' }, take: 5,
      include: { lead: { select: { customerName: true } } },
    }),
  ]);

  const showWelcome = !user?.welcomeDismissedAt;
  const convRate = propCount > 0 ? Math.round((bookedCount / propCount) * 100) : 0;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();
  const firstName = (actor.name ?? actor.email).split(/[\s@]/)[0];

  const attentionCount = newLeads.length + viewedNoResponse.length + sentNotViewed.length;

  return (
    <div className="ambient">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:py-10 space-y-10">

        <PageHeader
          eyebrow={greeting + ', ' + firstName}
          title="Build a trip your client will love."
          description="Start with the AI Suggester, browse curated templates, or compose from scratch."
          actions={
            <>
              <Link href="/suggested"><Button variant="ghost" className="gap-1.5"><Sparkles className="w-4 h-4" />Suggested</Button></Link>
              <Link href="/itinerary/new"><Button className="gap-1.5">New trip<ArrowRight className="w-4 h-4" /></Button></Link>
            </>
          }
        />

        {showWelcome && (
          <WelcomeCard
            firstName={firstName}
            steps={[
              { done: !!agency?.logoUrl,        title: 'Brand the customer view', body: 'Upload your logo + brand colours so every proposal shows your identity, not ours.', cta: { label: agency?.logoUrl ? 'Edit branding' : 'Set up branding', href: '/settings' } },
              { done: totalProposals > 0,       title: 'Build your first trip',    body: 'Drag-reorder cities, pick hotels and activities, save as proposal — under 10 minutes.', cta: { label: 'Start a trip', href: '/itinerary/new' } },
              { done: totalProposals > 0,       title: 'Send to a customer',       body: 'After saving, share the link via WhatsApp or email. They can accept without logging in.', cta: { label: 'See proposals', href: '/proposals' } },
              { done: viewedAny > 0,            title: 'Track who opened it',      body: 'Status updates from DRAFT → SENT → VIEWED → ACCEPTED automatically.', cta: { label: 'View leads', href: '/leads' } },
              { done: (wallet?.walletPaise ?? 0n) > 0n, title: 'Set markup + recharge', body: 'Pick your default markup and prepay your wallet so bookings confirm instantly.', cta: { label: 'Sales settings', href: '/settings/sales' } },
            ]}
          />
        )}

        {/* Hero: needs attention + AI promo */}
        <section className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
          <Card className="overflow-hidden">
            <CardContent className="pt-6">
              <div className="flex items-baseline justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-navy-900 inline-flex items-center gap-2">
                    Needs your attention
                    {attentionCount > 0 && <Pill variant="warning">{attentionCount}</Pill>}
                  </h2>
                  <p className="text-sm text-[rgb(var(--text-secondary))] mt-0.5">Open loops worth a nudge today — leads without quotes, and proposals waiting on the customer.</p>
                </div>
              </div>

              {attentionCount === 0 ? (
                <EmptyState
                  dense
                  icon={<CheckCircle2 className="w-7 h-7 text-success-500" />}
                  title="Inbox zero"
                  body="No open follow-ups. Time to start a new proposal or browse templates."
                />
              ) : (
                <ul className="divide-y divide-border-subtle -mx-2">
                  {newLeads.map((l) => (
                    <li key={'l' + l.id}>
                      <Link href={`/leads/${l.id}` as any} className="flex items-center gap-3 px-2 py-2.5 rounded-md hover:bg-surface-2 transition-colors group">
                        <div className="w-8 h-8 rounded-full bg-info-100 text-info-500 inline-flex items-center justify-center flex-shrink-0">
                          <MessageCircleQuestion className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="font-medium text-navy-900 truncate">{l.customerName}</p>
                            <span className="text-[10px] uppercase tracking-widest text-[rgb(var(--text-tertiary))] font-bold flex-shrink-0">{relTime(l.createdAt)}</span>
                          </div>
                          <p className="text-xs text-[rgb(var(--text-secondary))] truncate">New lead · {l.destinations} {l.source !== 'manual' && <span className="text-[rgb(var(--text-tertiary))]">· via {l.source}</span>}</p>
                        </div>
                        <span className="text-xs text-crimson-700 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Send quote →</span>
                      </Link>
                    </li>
                  ))}
                  {viewedNoResponse.map((p) => (
                    <li key={'v' + p.id}>
                      <Link href={`/itinerary/${p.id}/customize` as any} className="flex items-center gap-3 px-2 py-2.5 rounded-md hover:bg-surface-2 transition-colors group">
                        <div className="w-8 h-8 rounded-full bg-amber-500/15 text-amber-700 inline-flex items-center justify-center flex-shrink-0">
                          <Eye className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="font-medium text-navy-900 truncate">{p.lead?.customerName ?? p.name}</p>
                            <span className="text-[10px] uppercase tracking-widest text-[rgb(var(--text-tertiary))] font-bold flex-shrink-0">{relTime(p.lastViewedAt!)}</span>
                          </div>
                          <p className="text-xs text-[rgb(var(--text-secondary))] truncate">Viewed <span className="font-mono">{p.code}</span> · no response yet — time to nudge</p>
                        </div>
                        <span className="text-xs text-crimson-700 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Follow up →</span>
                      </Link>
                    </li>
                  ))}
                  {sentNotViewed.map((p) => (
                    <li key={'s' + p.id}>
                      <Link href={`/itinerary/${p.id}/customize` as any} className="flex items-center gap-3 px-2 py-2.5 rounded-md hover:bg-surface-2 transition-colors group">
                        <div className="w-8 h-8 rounded-full bg-danger-100 text-danger-500 inline-flex items-center justify-center flex-shrink-0">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="font-medium text-navy-900 truncate">{p.lead?.customerName ?? p.name}</p>
                            <span className="text-[10px] uppercase tracking-widest text-[rgb(var(--text-tertiary))] font-bold flex-shrink-0">{relTime(p.createdAt)}</span>
                          </div>
                          <p className="text-xs text-[rgb(var(--text-secondary))] truncate">Sent <span className="font-mono">{p.code}</span> · never opened — re-share the link</p>
                        </div>
                        <span className="text-xs text-crimson-700 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Reshare →</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* AI suggester */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-crimson-500 via-crimson-700 to-crimson-900 text-white border-0">
            <div className="absolute -top-12 -right-12 w-72 h-72 rounded-full bg-amber-500/25 blur-3xl" />
            <div className="absolute -bottom-12 -left-12 w-60 h-60 rounded-full bg-amber-300/15 blur-3xl" />
            <CardContent className="relative pt-6 pb-7">
              <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-amber-300 font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5" /> AI Itinerary Builder
              </div>
              <h2 className="text-3xl font-bold leading-tight mb-2">
                Type a few cities. <span className="font-display italic text-amber-300">Get a trip.</span>
              </h2>
              <p className="text-white/80 text-sm mb-5 max-w-md">
                Tell us your destinations and total nights. AI assembles hotels, transfers, and day-by-day plans you can edit and send in minutes.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href="/itinerary/new?ai=1"><Button variant="accent" className="gap-2">Try AI suggester <ArrowRight className="w-4 h-4" /></Button></Link>
                <Link href="/suggested"><Button variant="ghost" className="text-white hover:bg-white/10 gap-1.5"><BookOpen className="w-4 h-4" />Browse templates</Button></Link>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* KPI tiles — live, with vs-prior-30d delta */}
        <section>
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-xl font-semibold text-navy-900">Last 30 days <span className="text-xs font-normal text-[rgb(var(--text-secondary))] ml-1.5">vs prior 30</span></h2>
            <Link href="/leads" className="text-sm text-crimson-700 hover:underline font-medium inline-flex items-center gap-1">View all leads <ArrowRight className="w-3.5 h-3.5" /></Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger">
            <KpiCard label="Leads"          value={String(leadCount)}   curr={leadCount}   prev={leadPrev}   sub="enquiries received" />
            <KpiCard label="Proposals sent" value={String(propCount)}   curr={propCount}   prev={propPrev}   sub="quotes prepared" />
            <KpiCard label="Converted"      value={String(bookedCount)} curr={bookedCount} prev={bookedPrev} sub={`${convRate}% conv. rate`} gold />
            <KpiCard label="Wallet balance" value={formatINR(wallet?.walletPaise ?? 0n)}  sub="recharge to enable bookings" mono />
          </div>
        </section>

        {/* Quick actions */}
        <section>
          <h2 className="text-xl font-semibold text-navy-900 mb-4">Get started</h2>
          <div className="grid gap-4 md:grid-cols-3 stagger">
            <QuickCard href="/suggested"     icon={Sparkles}        title="Browse templates"     body="Curated by the platform team. Clone and customise in minutes." pill="New" pillVariant="info" />
            <QuickCard href="/flights"       icon={Plane}            title="Search flights"      body="Live fares via Tripjack. Refundable + non-refundable flagged." pill="Live" pillVariant="success" />
            <QuickCard href="/hotels"        icon={HotelIcon}        title="Search hotels"       body="250k+ live properties via Hotelbeds, with photos and full content."  pill="Live" pillVariant="success" />
            <QuickCard href="/leads"         icon={ClipboardList}    title="My leads"            body="Track every enquiry to booking. Filter, follow up, convert." />
            <QuickCard href="/proposals"     icon={BookOpen}         title="My proposals"        body="See what you've sent, who's viewed, who accepted." />
            <QuickCard href="/statement"     icon={Receipt}          title="Account statement"   body="Wallet ledger, downloadable for accounting." />
          </div>
        </section>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, gold, mono, curr, prev }: { label: string; value: string; sub: string; gold?: boolean; mono?: boolean; curr?: number; prev?: number }) {
  return (
    <Card className="lift">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-widest text-[rgb(var(--text-secondary))] font-bold">{label}</p>
          {curr != null && prev != null && <Delta curr={curr} prev={prev} />}
        </div>
        <p className={`mt-1.5 text-3xl lg:text-4xl font-bold tracking-tight ${gold ? 'text-gold-700' : 'text-navy-900'} ${mono ? 'font-mono tabular-nums' : ''}`}>{value}</p>
        <p className="mt-1.5 text-sm text-[rgb(var(--text-secondary))]">{sub}</p>
      </CardContent>
    </Card>
  );
}

function Delta({ curr, prev }: { curr: number; prev: number }) {
  if (prev === 0 && curr === 0) {
    return <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[rgb(var(--text-tertiary))]"><Minus className="w-3 h-3" /> —</span>;
  }
  if (prev === 0) {
    return <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-success-500"><TrendingUp className="w-3 h-3" /> new</span>;
  }
  const pct = Math.round(((curr - prev) / prev) * 100);
  if (pct === 0) {
    return <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[rgb(var(--text-tertiary))]"><Minus className="w-3 h-3" /> flat</span>;
  }
  const up = pct > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${up ? 'text-success-500' : 'text-danger-500'}`}>
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {up ? '+' : ''}{pct}%
    </span>
  );
}

function QuickCard({ href, icon: Icon, title, body, pill, pillVariant }: { href: string; icon: any; title: string; body: string; pill?: string; pillVariant?: any }) {
  return (
    <Link href={href as any} className="block group">
      <Card className="h-full lift">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-md bg-crimson-50 text-crimson-700 flex items-center justify-center group-hover:bg-crimson-900 group-hover:text-white transition-colors">
              <Icon className="w-5 h-5" />
            </div>
            {pill && <Pill variant={pillVariant}>{pill}</Pill>}
          </div>
          <h3 className="mt-4 text-lg font-semibold text-navy-900">{title}</h3>
          <p className="mt-1 text-sm text-[rgb(var(--text-secondary))]">{body}</p>
          <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-crimson-700 group-hover:gap-2.5 transition-all">
            Open <ArrowRight className="w-4 h-4" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function relTime(d: Date) {
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDateShort(d);
}
