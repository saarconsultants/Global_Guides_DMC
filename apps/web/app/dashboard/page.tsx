import Link from 'next/link';
import { promoSrc, regionSrc } from '@/lib/promos';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { EmptyState } from '@/components/ui/empty-state';
import { WelcomeCard } from '@/components/dashboard/welcome-card';
import { PromoCarousel, type PromoBanner } from '@/components/dashboard/promo-carousel';
import { DashboardSearch } from '@/components/dashboard/dashboard-search';
import { RouteCode } from '@/components/ui/pass';
import { requireAgency } from '@/lib/auth/ctx';
import { db } from '@/lib/db/client';
import { formatDateShort } from '@/lib/utils';
import { getDisplayMoney } from '@/lib/money-server';
import { StatCard } from '@/components/ui/stat-card';
import { cloneAndRedirectAction } from '@/app/actions/clone-template';
import { ArrowRight, Eye, MessageCircleQuestion, Clock, CheckCircle2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

const DAY_MS = 24 * 60 * 60 * 1000;

const DESTINATIONS: Array<{ city: string; country: string; code: string; img: string; tint: string }> = [
  { city: 'Paris',     country: 'France',      code: 'PAR', img: 'paris.jpg',     tint: 'from-[#5B6E9E] to-[#1E2A4A]' },
  { city: 'Dubai',     country: 'UAE',         code: 'DXB', img: 'dubai.jpg',     tint: 'from-[#C89A5B] to-[#6A4416]' },
  { city: 'Bali',      country: 'Indonesia',   code: 'DPS', img: 'bali.jpg',      tint: 'from-[#3E8E68] to-[#123B2A]' },
  { city: 'Singapore', country: 'Singapore',   code: 'SIN', img: 'singapore.jpg', tint: 'from-[#7E5BA6] to-[#2B1B47]' },
  { city: 'Zurich',    country: 'Switzerland', code: 'ZRH', img: 'alps.jpg',      tint: 'from-[#6B8FA8] to-[#20364A]' },
  { city: 'Bangkok',   country: 'Thailand',    code: 'BKK', img: 'bangkok.jpg',   tint: 'from-[#C4763B] to-[#59280E]' },
];

export default async function DashboardPage() {
  const { fmt } = await getDisplayMoney();
  const actor = await requireAgency();

  const now = Date.now();
  const since30 = new Date(now - 30 * DAY_MS);
  const since60 = new Date(now - 60 * DAY_MS);
  const since48h = new Date(now - 2 * DAY_MS);
  const since24h = new Date(now - 1 * DAY_MS);

  const [
    leadCount, propCount, bookedCount,
    leadPrev, propPrev, bookedPrev,
    wallet, user, agency, totalProposals, viewedAny,
    newLeads, viewedNoResponse, sentNotViewed,
    templates,
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
      orderBy: { createdAt: 'desc' }, take: 4,
      select: { id: true, customerName: true, destinations: true, createdAt: true, source: true },
    }),
    db.proposal.findMany({
      where: { agencyId: actor.agencyId, status: { in: ['VIEWED', 'SENT'] }, lastViewedAt: { not: null, lt: since24h } },
      orderBy: { lastViewedAt: 'desc' }, take: 4,
      include: { lead: { select: { customerName: true } } },
    }),
    db.proposal.findMany({
      where: { agencyId: actor.agencyId, status: 'SENT', lastViewedAt: null, createdAt: { lt: since48h } },
      orderBy: { createdAt: 'desc' }, take: 4,
      include: { lead: { select: { customerName: true } } },
    }),
    db.itineraryTemplate.findMany({ where: { published: true }, orderBy: { createdAt: 'desc' }, take: 3 }),
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

  const banners: PromoBanner[] = [
    {
      key: 'ai',
      kicker: 'AI Itinerary Builder',
      title: 'Type a few cities.',
      titleAccent: 'Get a trip.',
      body: 'Destinations in, routed day-by-day plan out — hotels, transfers and activities loaded straight into the builder. Quote in minutes, not hours.',
      cta: { label: 'Build a trip with AI', href: '/itinerary/new?ai=1' },
      cta2: { label: 'Browse templates', href: '/suggested' },
      img: promoSrc('banner-ai.jpg'),
      tint: 'from-crimson-500 via-crimson-700 to-crimson-900',
      ghost: 'magic',
    },
    {
      key: 'sea',
      kicker: 'Season Special · South-East Asia',
      title: 'Bali & Thailand are',
      titleAccent: 'selling fast.',
      body: 'Peak-season wholesale rates are live — beach resorts, private transfers and day tours ready to package for your customers.',
      cta: { label: 'Explore packages', href: '/suggested?region=SE_ASIA' },
      cta2: { label: 'Search hotels', href: '/hotels?city=DPS' },
      img: promoSrc('banner-sea.jpg'),
      tint: 'from-[#0E5E4A] via-[#0A4436] to-[#062B22]',
      ghost: 'islands',
    },
    {
      key: 'brand',
      kicker: 'Your brand, front and centre',
      title: 'Proposals that look like',
      titleAccent: 'your company.',
      body: 'Every PDF, share page and voucher carries your logo and colours. Customers see a polished brand — and accept online in one tap.',
      cta: { label: 'Set up branding', href: '/settings' },
      cta2: { label: 'Marketing flyers', href: '/marketing' },
      img: promoSrc('banner-brand.jpg'),
      tint: 'from-[#1E2A4A] via-[#131C33] to-[#0A0F1E]',
      ghost: 'brand',
    },
  ];

  return (
    <div>
      <div className="mx-auto max-w-7xl px-6 pt-6 lg:pt-7">
        {/* ── Shop window + the pass ── */}
        <PromoCarousel banners={banners} />
      </div>
      <DashboardSearch />

      <div className="mx-auto max-w-7xl px-6 py-10 lg:py-12 space-y-12">
        {/* ── Ready to sell + your desk ── */}
        <section className="grid gap-5 lg:grid-cols-[1fr_1fr_1fr_320px]">
          <div className="lg:col-span-3">
            <div className="flex items-end justify-between mb-4">
              <h2 className="text-[20px] font-extrabold tracking-[-0.01em] text-ink">Ready to sell</h2>
              <Link href="/suggested" className="text-sm text-crimson-700 hover:underline font-bold inline-flex items-center gap-1">All packages <ArrowRight className="w-3.5 h-3.5" /></Link>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {templates.map((t) => {
                const dests = JSON.parse(t.destinations) as any[];
                const codes = dests.map((d) => d.cityCode).filter(Boolean);
                const src = t.hero ?? regionSrc(t.region);
                return (
                  <article key={t.id} className="group flex flex-col rounded-lg bg-surface border border-border-subtle shadow-sm overflow-hidden lift">
                    <div className="relative h-[150px] bg-navy-900">
                      {src && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                      {codes.length > 0 && <div className="absolute left-3 bottom-3"><RouteCode codes={codes} /></div>}
                    </div>
                    <div className="px-4 pt-3.5 pb-3">
                      <h3 className="text-[16px] font-bold tracking-[-0.01em] text-ink group-hover:text-crimson-700 transition-colors truncate">{t.title}</h3>
                      <div className="mt-3 grid grid-cols-4 gap-2">
                        <div><div className="label">Nights</div><div className="mt-1 font-mono font-bold text-[14px] tnum">{t.totalNights}</div></div>
                        <div><div className="label">Cities</div><div className="mt-1 font-mono font-bold text-[14px] tnum">{dests.length}</div></div>
                        <div><div className="label">Style</div><div className="mt-1 font-bold text-[13px] truncate">{t.category.charAt(0) + t.category.slice(1).toLowerCase()}</div></div>
                        <div><div className="label">Region</div><div className="mt-1 font-bold text-[13px] truncate">{REGION_LABEL[t.region] ?? t.region}</div></div>
                      </div>
                    </div>
                    <div className="mt-auto border-t-2 border-dashed border-border-subtle px-4 py-3 flex items-center justify-between">
                      <div>
                        <div className="label">From, per adult</div>
                        <div className="mt-0.5 money text-[19px] text-ink">{fmt(t.startingPricePaise)}</div>
                      </div>
                      <form action={cloneAndRedirectAction.bind(null, t.id)}>
                        <Button type="submit" size="sm">Use this</Button>
                      </form>
                    </div>
                  </article>
                );
              })}
              {templates.length === 0 && (
                <div className="md:col-span-3"><EmptyState dense title="No packages published yet" body="Suggested itineraries appear here once the platform team publishes them." /></div>
              )}
            </div>
          </div>

          <aside className="lg:mt-[44px]">
            <Card className="h-full">
              <CardContent className="pt-4">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-[15px] font-extrabold text-ink inline-flex items-center gap-2">On your desk {attentionCount > 0 && <Pill variant="live">{attentionCount}</Pill>}</h2>
                  <span className="text-[12px] text-[rgb(var(--text-tertiary))]">{greeting}, {firstName}</span>
                </div>
                {attentionCount === 0 ? (
                  <EmptyState dense icon={<CheckCircle2 className="w-6 h-6 text-success-500" />} title="Inbox zero" body="No open follow-ups. Start a trip or use a package." />
                ) : (
                  <ul className="mt-3 -mx-1">
                    {newLeads.map((l) => (
                      <li key={'l' + l.id} className="border-t border-dashed border-border-subtle first:border-0">
                        <Link href={`/leads/${l.id}` as any} className="flex items-center gap-3 px-1 py-2.5 rounded-md hover:bg-surface-2 transition-colors">
                          <span className="w-8 h-8 rounded-md bg-action-100 text-action-600 inline-flex items-center justify-center flex-shrink-0"><MessageCircleQuestion className="w-4 h-4" /></span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13.5px] font-bold text-ink truncate">{l.customerName}</span>
                            <span className="block font-mono text-[11px] text-[rgb(var(--text-secondary))] truncate tnum">{l.destinations} · {relTime(l.createdAt)}</span>
                          </span>
                          <Pill variant="live">New</Pill>
                        </Link>
                      </li>
                    ))}
                    {viewedNoResponse.map((p) => (
                      <li key={'v' + p.id} className="border-t border-dashed border-border-subtle">
                        <Link href={`/itinerary/${p.id}/customize` as any} className="flex items-center gap-3 px-1 py-2.5 rounded-md hover:bg-surface-2 transition-colors">
                          <span className="w-8 h-8 rounded-md bg-amber-100 text-amber-900 inline-flex items-center justify-center flex-shrink-0"><Eye className="w-4 h-4" /></span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13.5px] font-bold text-ink truncate">{p.lead?.customerName ?? p.name}</span>
                            <span className="block font-mono text-[11px] text-[rgb(var(--text-secondary))] truncate tnum">{p.code} · viewed {relTime(p.lastViewedAt!)}</span>
                          </span>
                          <Pill variant="warning">Viewed</Pill>
                        </Link>
                      </li>
                    ))}
                    {sentNotViewed.map((p) => (
                      <li key={'s' + p.id} className="border-t border-dashed border-border-subtle">
                        <Link href={`/itinerary/${p.id}/customize` as any} className="flex items-center gap-3 px-1 py-2.5 rounded-md hover:bg-surface-2 transition-colors">
                          <span className="w-8 h-8 rounded-md bg-navy-50 text-navy-500 inline-flex items-center justify-center flex-shrink-0"><Clock className="w-4 h-4" /></span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13.5px] font-bold text-ink truncate">{p.lead?.customerName ?? p.name}</span>
                            <span className="block font-mono text-[11px] text-[rgb(var(--text-secondary))] truncate tnum">{p.code} · sent {relTime(p.createdAt)} · not opened</span>
                          </span>
                          <Pill>Sent</Pill>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <Link href="/leads" className="mt-3 inline-flex items-center gap-1 text-[13px] font-bold text-crimson-700 hover:underline">All leads <ArrowRight className="w-3.5 h-3.5" /></Link>
              </CardContent>
            </Card>
          </aside>
        </section>

        {showWelcome && (
          <WelcomeCard
            firstName={firstName}
            steps={[
              { done: !!agency?.logoUrl,        title: 'Brand the customer view', body: 'Upload your logo and brand colours so every proposal shows your identity, not ours.', cta: { label: agency?.logoUrl ? 'Edit branding' : 'Set up branding', href: '/settings' } },
              { done: totalProposals > 0,       title: 'Build your first trip',    body: 'Drag-reorder cities, pick hotels and activities, save as proposal — under 10 minutes.', cta: { label: 'Start a trip', href: '/itinerary/new' } },
              { done: totalProposals > 0,       title: 'Send to a customer',       body: 'After saving, share the link via WhatsApp or email. They can accept without logging in.', cta: { label: 'See proposals', href: '/proposals' } },
              { done: viewedAny > 0,            title: 'Track who opened it',      body: 'Status moves from DRAFT to SENT, VIEWED and ACCEPTED automatically.', cta: { label: 'View leads', href: '/leads' } },
              { done: (wallet?.walletPaise ?? 0n) > 0n, title: 'Set markup + recharge', body: 'Pick your default markup and prepay your wallet so bookings confirm instantly.', cta: { label: 'Sales settings', href: '/settings/sales' } },
            ]}
          />
        )}

        {/* ── Where next ── */}
        <section>
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-[20px] font-extrabold tracking-[-0.01em] text-ink">Where next</h2>
            <Link href="/hotels" className="text-sm text-crimson-700 hover:underline font-bold inline-flex items-center gap-1">Search hotels <ArrowRight className="w-3.5 h-3.5" /></Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {DESTINATIONS.map((d) => {
              const src = promoSrc(d.img);
              return (
                <Link key={d.code} href={`/hotels?city=${d.code}` as any} className={`relative aspect-[4/5] rounded-lg overflow-hidden group bg-gradient-to-b ${d.tint} lift`}>
                  {src && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt={d.city} className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />
                  <div className="absolute top-3 left-3"><RouteCode codes={[d.code]} light /></div>
                  <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                    <p className="font-extrabold text-[17px] leading-tight tracking-[-0.01em]">{d.city}</p>
                    <p className="text-[12px] text-white/75">{d.country}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ── Last 30 days ── */}
        <section>
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-[20px] font-extrabold tracking-[-0.01em] text-ink">Last 30 days</h2>
            <Link href="/statement" className="text-sm text-crimson-700 hover:underline font-bold inline-flex items-center gap-1">Statement <ArrowRight className="w-3.5 h-3.5" /></Link>
          </div>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <StatCard label="Leads"     value={String(leadCount)}   delta={{ curr: leadCount, prev: leadPrev }}     sub="enquiries" />
            <StatCard label="Proposals" value={String(propCount)}   delta={{ curr: propCount, prev: propPrev }}     sub="quotes sent" />
            <StatCard label="Converted" value={String(bookedCount)} delta={{ curr: bookedCount, prev: bookedPrev }} sub={`${convRate}% win rate`} tone="gold" />
            <StatCard label="Wallet"    value={fmt(wallet?.walletPaise ?? 0n)} sub="recharge for instant bookings" mono />
          </div>
        </section>
      </div>
    </div>
  );
}

const REGION_LABEL: Record<string, string> = {
  EUROPE: 'Europe', SE_ASIA: 'SE Asia', MIDDLE_EAST: 'Middle East', INDIAN_SUB: 'Indian Sub', OCEANIA: 'Oceania', AFRICA: 'Africa', AMERICAS: 'Americas',
};

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
