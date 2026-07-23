import Link from 'next/link';
import { promoSrc, regionSrc } from '@/lib/promos';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { EmptyState } from '@/components/ui/empty-state';
import { WelcomeCard } from '@/components/dashboard/welcome-card';
import { PromoCarousel, type PromoBanner } from '@/components/dashboard/promo-carousel';
import { requireAgency } from '@/lib/auth/ctx';
import { db } from '@/lib/db/client';
import { formatDateShort } from '@/lib/utils';
import { getDisplayMoney } from '@/lib/money-server';
import { StatCard } from '@/components/ui/stat-card';
import { cloneAndRedirectAction } from '@/app/actions/clone-template';
import { ArrowRight, Sparkles, Plane, Hotel as HotelIcon, MapPin, Ticket, Eye, MessageCircleQuestion, Clock, CheckCircle2 } from 'lucide-react';

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
      cta: { label: 'Try AI Suggest', href: '/itinerary/new?ai=1' },
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
    <div className="ambient">
      <div className="mx-auto max-w-7xl px-6 py-7 lg:py-8 space-y-11">

        {/* Slim greeting + primary action */}
        <div className="flex flex-wrap items-end justify-between gap-4 -mb-4">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-crimson-700 font-bold">{greeting}, {firstName}</p>
            <h1 className="font-display text-[1.65rem] leading-tight font-semibold tracking-tight text-ink mt-1">What will you sell today?</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/suggested"><Button variant="ghost" className="gap-1.5"><Sparkles className="w-4 h-4" />Suggested</Button></Link>
            <Link href="/itinerary/new"><Button className="gap-1.5">New trip<ArrowRight className="w-4 h-4" /></Button></Link>
          </div>
        </div>

        {/* ── Shop window ── */}
        <PromoCarousel banners={banners} />

        {/* Quick search strip */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 -mt-4">
          <SearchTile href="/flights" icon={Plane} title="Flights" sub="Live Tripjack fares" />
          <SearchTile href="/hotels" icon={HotelIcon} title="Hotels" sub="250k+ properties" />
          <SearchTile href="/activities" icon={Ticket} title="Activities" sub="Tours & experiences" />
          <SearchTile href="/itinerary/new?ai=1" icon={Sparkles} title="AI Trip" sub="Cities in, plan out" accent />
        </section>

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

        {/* Featured packages — live platform templates */}
        {templates.length > 0 && (
          <section>
            <div className="flex items-end justify-between mb-4">
              <div>
                <p className="text-[11px] uppercase tracking-widest text-crimson-700 font-bold">Ready to sell</p>
                <h2 className="font-display text-xl font-semibold text-ink mt-0.5">Featured packages</h2>
              </div>
              <Link href="/suggested" className="text-sm text-crimson-700 hover:underline font-medium inline-flex items-center gap-1">All templates <ArrowRight className="w-3.5 h-3.5" /></Link>
            </div>
            <div className="grid gap-5 md:grid-cols-3 stagger">
              {templates.map((t) => {
                const cities = (JSON.parse(t.destinations) as any[]).map((d) => d.cityName);
                return (
                  <Card key={t.id} className="lift overflow-hidden flex flex-col group">
                    <div className={`relative h-36 bg-gradient-to-br ${REGION_TINT[t.region] ?? 'from-navy-500 to-navy-900'}`}>
                      {(t.hero ?? regionSrc(t.region)) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={(t.hero ?? regionSrc(t.region))!} alt="" className="absolute inset-0 w-full h-full object-cover" />
                      ) : null}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                      <div className="absolute top-3 left-3 flex gap-1.5">
                        <Pill variant="gold">{t.region.replace('_', ' ')}</Pill>
                      </div>
                      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-black/30 backdrop-blur px-2 py-1 rounded-md"><Plane className="w-3 h-3" /> {t.totalNights} nights</span>
                      </div>
                    </div>
                    <CardContent className="pt-4 flex-1 flex flex-col">
                      <h3 className="font-display text-[1.05rem] font-semibold text-ink group-hover:text-crimson-700 transition-colors">{t.title}</h3>
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[rgb(var(--text-secondary))]"><MapPin className="w-3.5 h-3.5" />{cities.join(' → ')}</p>
                      <div className="mt-3 flex items-center justify-between pt-3 border-t border-border-subtle">
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-[rgb(var(--text-secondary))] font-bold">From</p>
                          <p className="font-mono font-bold text-ink">{fmt(t.startingPricePaise)}</p>
                        </div>
                        <form action={cloneAndRedirectAction.bind(null, t.id)}>
                          <Button type="submit" size="sm">Use this</Button>
                        </form>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* Destination inspiration */}
        <section>
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-crimson-700 font-bold">Where next</p>
              <h2 className="font-display text-xl font-semibold text-ink mt-0.5">Top destinations</h2>
            </div>
            <Link href="/hotels" className="text-sm text-crimson-700 hover:underline font-medium inline-flex items-center gap-1">Search hotels <ArrowRight className="w-3.5 h-3.5" /></Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 stagger">
            {DESTINATIONS.map((d) => {
              const src = promoSrc(d.img);
              return (
                <Link
                  key={d.code}
                  href={`/hotels?city=${d.code}` as any}
                  className={`relative h-64 rounded-2xl overflow-hidden group bg-gradient-to-b ${d.tint} lift`}
                >
                  {src && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt={d.city} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                    <p className="font-display font-semibold text-[15px] leading-tight">{d.city}</p>
                    <p className="text-[11px] text-white/70">{d.country}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ── Your desk: follow-ups + numbers ── */}
        <section className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
          <Card className="overflow-hidden">
            <CardContent className="pt-6">
              <div className="flex items-baseline justify-between mb-4">
                <div>
                  <h2 className="font-display text-xl font-semibold text-ink inline-flex items-center gap-2">
                    Needs your attention
                    {attentionCount > 0 && <Pill variant="warning">{attentionCount}</Pill>}
                  </h2>
                  <p className="text-sm text-[rgb(var(--text-secondary))] mt-0.5">Open loops worth a nudge today.</p>
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
                            <p className="font-medium text-ink truncate">{l.customerName}</p>
                            <span className="text-[10px] uppercase tracking-widest text-[rgb(var(--text-tertiary))] font-bold flex-shrink-0">{relTime(l.createdAt)}</span>
                          </div>
                          <p className="text-xs text-[rgb(var(--text-secondary))] truncate">New lead · {l.destinations} {l.source !== 'manual' && <span className="text-[rgb(var(--text-tertiary))]">· via {l.source}</span>}</p>
                        </div>
                        <span className="text-xs text-crimson-700 font-semibold opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 transition-opacity">Send quote →</span>
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
                            <p className="font-medium text-ink truncate">{p.lead?.customerName ?? p.name}</p>
                            <span className="text-[10px] uppercase tracking-widest text-[rgb(var(--text-tertiary))] font-bold flex-shrink-0">{relTime(p.lastViewedAt!)}</span>
                          </div>
                          <p className="text-xs text-[rgb(var(--text-secondary))] truncate">Viewed <span className="font-mono">{p.code}</span> · no response yet — time to nudge</p>
                        </div>
                        <span className="text-xs text-crimson-700 font-semibold opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 transition-opacity">Follow up →</span>
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
                            <p className="font-medium text-ink truncate">{p.lead?.customerName ?? p.name}</p>
                            <span className="text-[10px] uppercase tracking-widest text-[rgb(var(--text-tertiary))] font-bold flex-shrink-0">{relTime(p.createdAt)}</span>
                          </div>
                          <p className="text-xs text-[rgb(var(--text-secondary))] truncate">Sent <span className="font-mono">{p.code}</span> · never opened — re-share the link</p>
                        </div>
                        <span className="text-xs text-crimson-700 font-semibold opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 transition-opacity">Reshare →</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <div>
            <div className="flex items-end justify-between mb-4">
              <h2 className="font-display text-xl font-semibold text-ink">Last 30 days</h2>
              <Link href="/leads" className="text-sm text-crimson-700 hover:underline font-medium inline-flex items-center gap-1">All leads <ArrowRight className="w-3.5 h-3.5" /></Link>
            </div>
            <div className="grid gap-3.5 grid-cols-2 stagger">
              <StatCard label="Leads"          value={String(leadCount)}   delta={{ curr: leadCount, prev: leadPrev }}     sub="enquiries" />
              <StatCard label="Proposals"      value={String(propCount)}   delta={{ curr: propCount, prev: propPrev }}     sub="quotes sent" />
              <StatCard label="Converted"      value={String(bookedCount)} delta={{ curr: bookedCount, prev: bookedPrev }} sub={`${convRate}% rate`} tone="gold" />
              <StatCard label="Wallet"         value={fmt(wallet?.walletPaise ?? 0n)} sub="recharge for bookings" mono />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

const REGION_TINT: Record<string, string> = {
  EUROPE:      'from-[#5B6E9E] to-[#1E2A4A]',
  SE_ASIA:     'from-[#3E8E68] to-[#123B2A]',
  MIDDLE_EAST: 'from-[#C89A5B] to-[#6A4416]',
};

function SearchTile({ href, icon: Icon, title, sub, accent }: { href: string; icon: any; title: string; sub: string; accent?: boolean }) {
  return (
    <Link
      href={href as any}
      className={`group flex items-center gap-3 rounded-xl border px-4 py-3.5 transition-all lift ${
        accent
          ? 'bg-gradient-to-br from-crimson-700 to-crimson-900 border-crimson-900 text-white'
          : 'bg-surface border-border-subtle hover:border-border-strong'
      }`}
    >
      <span className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${accent ? 'bg-amber-500 text-crimson-900' : 'bg-crimson-50 text-crimson-700 group-hover:bg-crimson-900 group-hover:text-white transition-colors'}`}>
        <Icon className="w-4.5 h-4.5 w-[18px] h-[18px]" />
      </span>
      <span className="min-w-0">
        <span className={`block text-sm font-bold ${accent ? 'text-white' : 'text-ink'}`}>{title}</span>
        <span className={`block text-[11.5px] truncate ${accent ? 'text-white/75' : 'text-[rgb(var(--text-tertiary))]'}`}>{sub}</span>
      </span>
      <ArrowRight className={`w-4 h-4 ml-auto flex-shrink-0 transition-transform group-hover:translate-x-0.5 ${accent ? 'text-amber-300' : 'text-crimson-700'}`} />
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
