import { db } from '@/lib/db/client';
import { Card, CardContent } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { formatINR } from '@/lib/utils';
import { cloneAndRedirectAction } from '@/app/actions/clone-template';
import { Sparkles, MapPin, Plane } from 'lucide-react';

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
  const sp = await searchParams;
  const where: any = { published: true };
  if (sp.region)   where.region   = sp.region;
  if (sp.category) where.category = sp.category;

  const templates = await db.itineraryTemplate.findMany({ where, orderBy: { createdAt: 'desc' } });

  const regions    = ['EUROPE', 'SE_ASIA', 'MIDDLE_EAST', 'INDIAN_SUB', 'OCEANIA', 'AFRICA', 'AMERICAS'];
  const categories = ['LEISURE', 'HONEYMOON', 'FAMILY', 'LUXURY', 'ADVENTURE', 'GROUP'];

  return (
    <div className="ambient">
      <div className="mx-auto max-w-7xl px-6 py-10 space-y-6">
        <PageHeader
          eyebrow="Hand-curated"
          title="Suggested itineraries"
          description="Built by the platform team. Click a template — we'll clone it into a draft proposal you can edit and send to your customer."
          actions={<Button variant="ghost" className="gap-1.5"><Sparkles className="w-4 h-4" />AI suggester</Button>}
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
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 stagger">
            {templates.map((t) => {
              const cities = (JSON.parse(t.destinations) as any[]).map((d) => d.cityName);
              return (
                <Card key={t.id} className="lift overflow-hidden flex flex-col group">
                  <div className={`relative h-40 bg-gradient-to-br ${regionTint[t.region] ?? 'from-navy-500 to-navy-900'}`}>
                    {t.hero ? <img src={t.hero} alt="" className="absolute inset-0 w-full h-full object-cover" /> : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                    <div className="absolute top-3 left-3 flex gap-1.5">
                      <Pill variant="gold">{t.region.replace('_', ' ')}</Pill>
                      <Pill variant="info">{t.category}</Pill>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-black/30 backdrop-blur px-2 py-1 rounded-md"><Plane className="w-3 h-3" /> {t.totalNights} nights</span>
                      <span className="text-[10px] uppercase tracking-widest font-bold bg-black/30 backdrop-blur px-2 py-1 rounded-md">{t.code}</span>
                    </div>
                  </div>
                  <CardContent className="pt-5 flex-1 flex flex-col">
                    <h3 className="text-lg font-semibold text-navy-900 group-hover:text-crimson-700 transition-colors">{t.title}</h3>
                    <p className="text-sm text-[rgb(var(--text-secondary))] mt-1 flex-1">{t.blurb}</p>
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-[rgb(var(--text-secondary))]">
                      <MapPin className="w-3.5 h-3.5" />
                      {cities.join(' → ')}
                    </div>
                    <div className="mt-4 flex items-center justify-between pt-3 border-t border-border-subtle">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-[rgb(var(--text-secondary))] font-bold">Starting from</p>
                        <p className="font-mono font-bold text-navy-900">{formatINR(t.startingPricePaise)}</p>
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
        )}
      </div>
    </div>
  );
}

function FilterPill({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <a href={href} className={`px-3 h-8 inline-flex items-center rounded-full text-xs font-medium border transition-all cursor-pointer ${active ? 'bg-navy-900 text-white border-navy-900' : 'bg-surface text-navy-700 border-border hover:bg-navy-50 hover:border-navy-200'}`}>{label}</a>
  );
}
