import { db } from '@/lib/db/client';
import { Card, CardContent } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { Button, ButtonLink } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { getDisplayMoney } from '@/lib/money-server';
import { cloneAndRedirectAction } from '@/app/actions/clone-template';
import { regionSrc } from '@/lib/promos';
import { Sparkles } from 'lucide-react';
import { RouteCode } from '@/components/ui/pass';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

// Per-region tint so cards aren't all the same navy
const regionTint: Record<string, string> = {
  EUROPE:      'from-crimson-500 to-crimson-900',
  SE_ASIA:     'from-emerald-500 to-navy-900',
  MIDDLE_EAST: 'from-amber-500 to-navy-900',
  INDIAN_SUB:  'from-rose-500 to-navy-900',
  OCEANIA:     'from-cyan-500 to-navy-900',
  AFRICA:      'from-orange-500 to-navy-900',
  AMERICAS:    'from-fuchsia-500 to-navy-900',
};

export default async function SuggestedPage({ searchParams }: { searchParams: Promise<{ region?: string; category?: string }> }) {
  const { fmt } = await getDisplayMoney();
  const sp = await searchParams;
  const where: any = { published: true };
  if (sp.region)   where.region   = sp.region;
  if (sp.category) where.category = sp.category;

  const templates = await db.itineraryTemplate.findMany({ where, orderBy: { createdAt: 'desc' } });

  const regions    = ['EUROPE', 'SE_ASIA', 'MIDDLE_EAST', 'INDIAN_SUB', 'OCEANIA', 'AFRICA', 'AMERICAS'];
  const categories = ['LEISURE', 'HONEYMOON', 'FAMILY', 'LUXURY', 'ADVENTURE', 'GROUP'];

  return (
    <div>
      <div className="mx-auto max-w-7xl px-6 py-8 lg:py-10 space-y-6">
        <PageHeader
          eyebrow="Hand-curated"
          title="Suggested itineraries"
          description="Built by the platform team. Click a template — we'll clone it into a draft proposal you can edit and send to your customer."
          actions={<ButtonLink href="/itinerary/new?ai=1" variant="ghost" className="gap-1.5"><Sparkles className="w-4 h-4" />AI suggester</ButtonLink>}
        />

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-[rgb(var(--text-secondary))] mr-1">Region:</span>
          <FilterPill href="/suggested" label="All" active={!sp.region && !sp.category} />
          {regions.map((r) => <FilterPill key={r} href={`/suggested?region=${r}`} label={r.replace('_', ' ')} active={sp.region === r} />)}
          <span className="mx-2 text-[rgb(var(--text-tertiary))]">·</span>
          <span className="text-[rgb(var(--text-secondary))]">Trip type:</span>
          {categories.map((c) => <FilterPill key={c} href={`/suggested?category=${c}`} label={c} active={sp.category === c} />)}
        </div>

        {templates.length === 0 ? (
          <Card><CardContent>
            <EmptyState
              icon={<Sparkles className="w-7 h-7" />}
              title="No templates for this filter"
              body="Try a different region or category, or ask the platform team to publish more."
              primary={{ label: 'Show all templates', href: '/suggested' }}
            />
          </CardContent></Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => {
              const dests = JSON.parse(t.destinations) as any[];
              const codes = dests.map((d) => d.cityCode).filter(Boolean);
              return (
                <article key={t.id} className="group flex flex-col rounded-lg bg-surface border border-border-subtle shadow-sm overflow-hidden lift">
                  <div className={`relative h-52 bg-gradient-to-br ${regionTint[t.region] ?? 'from-navy-500 to-navy-900'}`}>
                    {(t.hero ?? regionSrc(t.region)) ? <img src={(t.hero ?? regionSrc(t.region))!} alt="" className="absolute inset-0 w-full h-full object-cover" /> : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                    <div className="absolute top-3 left-3 flex gap-1.5">
                      <Pill variant="gold">{t.region.replace('_', ' ')}</Pill>
                      <Pill variant="ink">{t.category}</Pill>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                      {codes.length > 0 && <RouteCode codes={codes} />}
                      <span className="font-mono text-[11px] font-bold text-white/85 bg-black/35 backdrop-blur px-2 py-1 rounded-[6px]">{t.code}</span>
                    </div>
                  </div>
                  <div className="px-4 pt-4 pb-3 flex-1 flex flex-col">
                    <h2 className="text-[17px] font-bold tracking-[-0.01em] text-ink group-hover:text-crimson-700 transition-colors">{t.title}</h2>
                    <p className="text-[13.5px] text-[rgb(var(--text-secondary))] mt-1.5 flex-1 leading-relaxed">{t.blurb}</p>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <div><div className="label">Nights</div><div className="mt-1 font-mono font-bold text-[14px] tnum">{t.totalNights}</div></div>
                      <div><div className="label">Cities</div><div className="mt-1 font-mono font-bold text-[14px] tnum">{dests.length}</div></div>
                      <div><div className="label">Route</div><div className="mt-1 text-[13px] font-bold truncate">{dests.map((d) => d.cityName).join(' → ')}</div></div>
                    </div>
                  </div>
                  <div className="border-t-2 border-dashed border-border-subtle px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="label">From, per adult</p>
                      <p className="money text-[19px] text-ink mt-0.5">{fmt(t.startingPricePaise)}</p>
                    </div>
                    <form action={cloneAndRedirectAction.bind(null, t.id)}>
                      <Button type="submit" size="sm">Use this</Button>
                    </form>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterPill({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <a href={href} className={`px-3 h-9 inline-flex items-center rounded-md text-[12.5px] font-bold border transition-colors cursor-pointer ${active ? 'bg-ink text-white border-ink' : 'bg-surface text-navy-700 border-border hover:border-border-strong'}`}>{label}</a>
  );
}
