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
import { Prisma } from '@prisma/client';
import { TEMPLATE_CARD_SELECT } from '@/lib/db/templates';
import { formatDateShort, formatDayMonth } from '@/lib/utils';
import { getDisplayMoney } from '@/lib/money-server';
import { StatCard } from '@/components/ui/stat-card';
import { cloneAndRedirectAction } from '@/app/actions/clone-template';
import { ArrowRight, Eye, MessageCircleQuestion, Clock, CheckCircle2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

const DAY_MS = 24 * 60 * 60 * 1000;

// Only compare periods when both have activity; a 0 on either side would show
// a misleading "−100%" or "new" rather than a real trend.
function trend(curr: number, prev: number) {
  return curr > 0 && prev > 0 ? { curr, prev } : undefined;
}

const DESTINATIONS: Array<{ city: string; country: string; code: string; img: string; tint: string }> = [
  { city: 'Paris',     country: 'France',      code: 'PAR', img: 'paris.jpg',     tint: 'bg-[#1E2A4A]' },
  { city: 'Dubai',     country: 'UAE',         code: 'DXB', img: 'dubai.jpg',     tint: 'bg-[#6A4416]' },
  { city: 'Bali',      country: 'Indonesia',   code: 'DPS', img: 'bali.jpg',      tint: 'bg-[#123B2A]' },
  { city: 'Singapore', country: 'Singapore',   code: 'SIN', img: 'singapore.jpg', tint: 'bg-[#2B1B47]' },
  { city: 'Zurich',    country: 'Switzerland', code: 'ZRH', img: 'alps.jpg',      tint: 'bg-[#20364A]' },
  { city: 'Bangkok',   country: 'Thailand',    code: 'BKK', img: 'bangkok.jpg',   tint: 'bg-[#59280E]' },
];

export default async function DashboardPage() {
  const { fmt } = await getDisplayMoney();
  const actor = await requireAgency();

  const now = Date.now();
  const since30 = new Date(now - 30 * DAY_MS);
  const since60 = new Date(now - 60 * DAY_MS);
  const since48h = new Date(now - 2 * DAY_MS);
  const since24h = new Date(now - 1 * DAY_MS);

  // 7 queries (was 15): the 8 period counts collapse into two FILTERed
  // aggregates, and wallet + logo come with the request-cached actor lookup.
  const ATTENTION_SELECT = { id: true, code: true, name: true, createdAt: true, lastViewedAt: true, lead: { select: { customerName: true } } } as const;
  // Prisma stores DateTime as UTC `timestamp(3)`; compare against UTC-naive
  // values so the raw SQL is independent of the DB session's TimeZone.
  const utc = (d: Date) => Prisma.sql`(${d.toISOString()}::timestamptz AT TIME ZONE 'UTC')`;
  const t30 = utc(since30), t60 = utc(since60);
  const [
    leadCounts, propCounts,
    user,
    newLeads, viewedNoResponse, sentNotViewed,
    templates,
  ] = await Promise.all([
    db.$queryRaw<Array<{ curr: bigint; prev: bigint }>>`
      SELECT COUNT(*) FILTER (WHERE "createdAt" >= ${t30}) AS curr,
             COUNT(*) FILTER (WHERE "createdAt" >= ${t60} AND "createdAt" < ${t30}) AS prev
      FROM "Lead" WHERE "agencyId" = ${actor.agencyId}`,
    db.$queryRaw<Array<{ curr: bigint; prev: bigint; booked: bigint; bookedPrev: bigint; total: bigint; viewed: bigint }>>`
      SELECT COUNT(*) FILTER (WHERE "createdAt" >= ${t30}) AS curr,
             COUNT(*) FILTER (WHERE "createdAt" >= ${t60} AND "createdAt" < ${t30}) AS prev,
             COUNT(*) FILTER (WHERE status IN ('ACCEPTED', 'BOOKED') AND "createdAt" >= ${t30}) AS booked,
             COUNT(*) FILTER (WHERE status IN ('ACCEPTED', 'BOOKED') AND "createdAt" >= ${t60} AND "createdAt" < ${t30}) AS "bookedPrev",
             COUNT(*) AS total,
             COUNT(*) FILTER (WHERE "lastViewedAt" IS NOT NULL) AS viewed
      FROM "Proposal" WHERE "agencyId" = ${actor.agencyId}`,
    db.user.findUnique({ where: { id: actor.userId }, select: { welcomeDismissedAt: true } }),
    db.lead.findMany({
      where: { agencyId: actor.agencyId, status: 'NEW', proposals: { none: {} } },
      orderBy: { createdAt: 'desc' }, take: 4,
      select: { id: true, customerName: true, destinations: true, createdAt: true, source: true },
    }),
    db.proposal.findMany({
      where: { agencyId: actor.agencyId, status: { in: ['VIEWED', 'SENT'] }, lastViewedAt: { not: null, lt: since24h } },
      orderBy: { lastViewedAt: 'desc' }, take: 4,
      select: ATTENTION_SELECT,
    }),
    db.proposal.findMany({
      where: { agencyId: actor.agencyId, status: 'SENT', lastViewedAt: null, createdAt: { lt: since48h } },
      orderBy: { createdAt: 'desc' }, take: 4,
      select: ATTENTION_SELECT,
    }),
    db.itineraryTemplate.findMany({ where: { published: true }, orderBy: { createdAt: 'desc' }, take: 3, select: TEMPLATE_CARD_SELECT }),
  ]);
  const lc = leadCounts[0];
  const pc = propCounts[0];
  const leadCount = Number(lc?.curr ?? 0), leadPrev = Number(lc?.prev ?? 0);
  const propCount = Number(pc?.curr ?? 0), propPrev = Number(pc?.prev ?? 0);
  const bookedCount = Number(pc?.booked ?? 0), bookedPrev = Number(pc?.bookedPrev ?? 0);
  const totalProposals = Number(pc?.total ?? 0), viewedAny = Number(pc?.viewed ?? 0);
  const wallet = { walletPaise: actor.agency?.walletPaise ?? 0n };
  const agency = { logoUrl: actor.agency?.logoUrl ?? null };

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
      kicker: 'Plan a trip with AI',
      title: 'Type a few cities.',
      titleAccent: 'Get a trip.',
      body: 'Destinations in, routed day-by-day plan out — hotels, transfers and activities loaded straight into the builder. Quote in minutes, not hours.',
      cta: { label: 'Plan a trip with AI', href: '/itinerary/ai' },
      cta2: { label: 'Browse templates', href: '/suggested' },
      img: promoSrc('banner-ai.jpg'),
      tint: 'bg-crimson-900',
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
      tint: 'bg-[#0A4436]',
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
      tint: 'bg-[#131C33]',
      ghost: 'brand',
    },
  ];

  return (
    <div>
      <h1 className="sr-only">Dashboard</h1>
      <div className="shell pt-6 lg:pt-7">
        {/* ── Shop window + the pass ── */}
        <PromoCarousel banners={banners} />
      </div>
      <DashboardSearch />

      <div className="shell py-10 lg:py-12 space-y-12">
        {/* ── Ready to sell + your desk ── */}
        <section className="grid gap-5 items-start lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_320px]">
          <div className="lg:col-span-3 min-w-0">
            <div className="flex items-end justify-between mb-4">
              <h2 className="text-[20px] font-extrabold tracking-[-0.01em] text-ink">Ready to sell</h2>
              <Link href="/suggested" className="hit-area text-sm text-crimson-700 hover:underline font-bold inline-flex items-center gap-1">All packages <ArrowRight className="w-3.5 h-3.5" /></Link>
            </div>
            <div className="grid gap-5 md:grid-cols-3 min-w-0">
              {templates.map((t) => {
                const dests = JSON.parse(t.destinations) as any[];
                const codes = dests.map((d) => d.cityCode).filter(Boolean);
                const src = t.hero ?? regionSrc(t.region);
                return (
                  <article key={t.id} className="group flex flex-col min-w-0 rounded-lg bg-surface border border-border-subtle shadow-sm overflow-hidden lift">
                    <div className="relative h-[150px] bg-navy-900">
                      {src && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={src} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                      {codes.length > 0 && <div className="absolute left-3 bottom-3"><RouteCode codes={codes} /></div>}
                    </div>
                    <div className="px-4 pt-3.5 pb-3">
                      <h3 className="text-[16px] font-bold tracking-[-0.01em] text-ink group-hover:text-crimson-700 transition-colors truncate">{t.title}</h3>
                      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 min-w-0">
                        <div><div className="label">Nights</div><div className="mt-1 font-mono font-bold text-[14px] tnum">{t.totalNights}</div></div>
                        <div><div className="label">Cities</div><div className="mt-1 font-mono font-bold text-[14px] tnum">{dests.length}</div></div>
                        <div><div className="label">Style</div><div className="mt-1 font-bold text-[13px] truncate">{t.category.charAt(0) + t.category.slice(1).toLowerCase()}</div></div>
                        <div><div className="label">Region</div><div className="mt-1 font-bold text-[13px] truncate">{REGION_LABEL[t.region] ?? t.region}</div></div>
                      </div>
                    </div>
                    <div className="mt-auto">
                      <div className="perf-x mx-4" />
                      <div className="bg-surface-2 px-4 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="label">From, per adult</div>
                          <div className="mt-0.5 money text-[19px] text-ink truncate">{fmt(t.startingPricePaise)}</div>
                        </div>
                        <form action={cloneAndRedirectAction.bind(null, t.id)} className="shrink-0">
                          <Button type="submit" size="sm" variant="secondary">Use this package</Button>
                        </form>
                      </div>
                    </div>
                  </article>
                );
              })}
              {templates.length === 0 && (
                <div className="md:col-span-3"><EmptyState dense title="No packages published yet" body="Suggested itineraries appear here once the platform team publishes them." /></div>
              )}
            </div>
          </div>

          <aside className="lg:mt-[44px] min-w-0">
            <Card className="h-full">
              <CardContent className="pt-4">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-[15px] font-extrabold text-ink inline-flex items-center gap-2">On your desk {attentionCount > 0 && <Pill variant="live">{attentionCount}</Pill>}</h2>
                  <span className="text-[12px] text-[rgb(var(--text-tertiary))]">{greeting}, {firstName}</span>
                </div>
                {attentionCount === 0 ? (
                  <EmptyState dense icon={<CheckCircle2 className="w-6 h-6 text-success-500" />} title="Inbox zero" body="No open follow-ups. Start a new trip or use a package." />
                ) : (
                  <ul className="mt-3 -mx-1">
                    {newLeads.map((l) => (
                      <li key={'l' + l.id} className="border-t border-dashed border-border-subtle first:border-0">
                        <Link href={`/leads/${l.id}` as any} className="flex items-center gap-3 px-1 py-2.5 rounded-md hover:bg-surface-2 transition-colors">
                          <span className="w-5 inline-flex justify-center flex-shrink-0 text-[rgb(var(--text-tertiary))]"><MessageCircleQuestion className="w-4 h-4" /></span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13.5px] font-bold text-ink truncate">{l.customerName}</span>
                            <span className="block text-[12px] text-[rgb(var(--text-secondary))] truncate tnum" title={`${l.destinations} · ${relTime(l.createdAt)}`}><span className="font-mono">{relTime(l.createdAt)}</span> · {l.destinations}</span>
                          </span>
                          <Pill variant="live">New</Pill>
                        </Link>
                      </li>
                    ))}
                    {viewedNoResponse.map((p) => (
                      <li key={'v' + p.id} className="border-t border-dashed border-border-subtle">
                        <Link href={`/itinerary/${p.id}/customize` as any} className="flex items-center gap-3 px-1 py-2.5 rounded-md hover:bg-surface-2 transition-colors">
                          <span className="w-5 inline-flex justify-center flex-shrink-0 text-[rgb(var(--text-tertiary))]"><Eye className="w-4 h-4" /></span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13.5px] font-bold text-ink truncate">{p.lead?.customerName ?? p.name}</span>
                            <span className="block text-[12px] text-[rgb(var(--text-secondary))] truncate tnum">Viewed <span className="font-mono">{relTime(p.lastViewedAt!)}</span></span>
                          </span>
                          <Pill variant="warning">Viewed</Pill>
                        </Link>
                      </li>
                    ))}
                    {sentNotViewed.map((p) => (
                      <li key={'s' + p.id} className="border-t border-dashed border-border-subtle">
                        <Link href={`/itinerary/${p.id}/customize` as any} className="flex items-center gap-3 px-1 py-2.5 rounded-md hover:bg-surface-2 transition-colors">
                          <span className="w-5 inline-flex justify-center flex-shrink-0 text-[rgb(var(--text-tertiary))]"><Clock className="w-4 h-4" /></span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13.5px] font-bold text-ink truncate">{p.lead?.customerName ?? p.name}</span>
                            <span className="block text-[12px] text-[rgb(var(--text-secondary))] truncate tnum">Sent <span className="font-mono">{relTime(p.createdAt)}</span>, not opened</span>
                          </span>
                          <Pill>Sent</Pill>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <Link href="/leads" className="hit-area mt-3 inline-flex items-center gap-1 text-[13px] font-bold text-crimson-700 hover:underline">All leads <ArrowRight className="w-3.5 h-3.5" /></Link>
              </CardContent>
            </Card>
          </aside>
        </section>

        {showWelcome && (
          <WelcomeCard
            firstName={firstName}
            steps={[
              { done: !!agency?.logoUrl,        title: 'Brand the customer view', body: 'Upload your logo and brand colours so every proposal shows your identity, not ours.', cta: { label: agency?.logoUrl ? 'Edit branding' : 'Set up branding', href: '/settings' } },
              { done: totalProposals > 0,       title: 'Build your first trip',    body: 'Drag-reorder cities, pick hotels and activities, save as proposal — under 10 minutes.', cta: { label: 'New trip', href: '/itinerary/new' } },
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
            <Link href="/hotels" className="hit-area text-sm text-crimson-700 hover:underline font-bold inline-flex items-center gap-1">Search hotels <ArrowRight className="w-3.5 h-3.5" /></Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {DESTINATIONS.map((d) => {
              const src = promoSrc(d.img);
              return (
                <Link key={d.code} href={`/hotels?city=${d.code}` as any} className={`relative aspect-[4/5] rounded-lg overflow-hidden group ${d.tint} lift`}>
                  {src && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt={d.city} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300 ease-out" />
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
            <Link href="/statement" className="hit-area text-sm text-crimson-700 hover:underline font-bold inline-flex items-center gap-1">Statement <ArrowRight className="w-3.5 h-3.5" /></Link>
          </div>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <StatCard label="Leads"     value={String(leadCount)}   delta={trend(leadCount, leadPrev)}     sub="enquiries" />
            <StatCard label="Proposals" value={String(propCount)}   delta={trend(propCount, propPrev)}     sub="quotes sent" />
            <StatCard label="Converted" value={String(bookedCount)} delta={trend(bookedCount, bookedPrev)} sub={`${convRate}% win rate`} />
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
  return formatDayMonth(d);
}
