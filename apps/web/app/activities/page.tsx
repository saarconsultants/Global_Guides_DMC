import { searchActivities, isLive } from '@gg/hotelbeds';
import { activitiesForCity, CITY_BANK } from '@/lib/itinerary/mock-inventory';
import { ActivitySearchForm } from '@/components/activities/search-form';
import { Card, CardContent } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { EmptyState } from '@/components/ui/empty-state';
import { ActivitiesBrowser } from '@/components/activities/activities-browser';
import { Sparkles } from 'lucide-react';
import type { Activity } from '@/lib/itinerary/types';
import { HeroBand } from '@/components/ui/hero-search';
import { promoSrc } from '@/lib/promos';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ city?: string; from?: string; to?: string; adults?: string }>;
}

export default async function ActivitiesPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const city = (sp.city ?? 'PAR').toUpperCase();
  const from = sp.from ?? nextWeekIso();
  const to = sp.to ?? nextWeekIso(2);
  const adults = sp.adults ?? '2';
  const hasQuery = !!sp.city;
  const cityName = CITY_BANK[city]?.name ?? city;

  let activities: Activity[] = [];
  let source: 'live' | 'mock' | 'unsupported-city' = 'mock';
  let warning: string | undefined;

  if (hasQuery) {
    if (isLive('activities')) {
      try {
        const res = await searchActivities({ cityCode: city, fromDate: from, toDate: to, paxAdults: parseInt(adults, 10) || 2 });
        source = res.source;
        warning = res.warning;
        if (warning) console.error('[activities-search] supplier warning', warning);
        const live: Activity[] = res.activities.map((a) => ({
          id: a.id, name: a.name, category: 'tour', durationMin: a.durationMin,
          pricePaise: a.pricePaise, cityCode: a.cityCode, thumb: a.thumb, description: a.description,
        }));
        const liveNames = new Set(live.map((a) => a.name.toLowerCase()));
        activities = source === 'live'
          ? [...live, ...activitiesForCity(city).filter((a) => !liveNames.has(a.name.toLowerCase()))]
          : activitiesForCity(city);
      } catch (e: any) {
        console.error('[activities-search] supplier error', e);
        source = 'mock'; warning = 'Live prices couldn\'t load. Try again in a minute.';
        activities = activitiesForCity(city);
      }
    } else {
      activities = activitiesForCity(city);
    }
  }

  const liveCount = activities.filter((a) => a.id.startsWith('ACT-')).length;
  const badge =
    source === 'live' ? { variant: 'success' as const, label: `${liveCount} with live prices` }
    : source === 'unsupported-city' ? { variant: 'warning' as const, label: `Sample prices — live rates aren't available for ${cityName}` }
    : { variant: 'warning' as const, label: 'Sample prices — live rates unavailable right now' };

  return (
    <div className="pb-12">
      <HeroBand
        title="Experiences they'll remember."
        subtitle="Live tours, tickets and day trips. Browse to quote, then add them inside any itinerary."
        img={promoSrc('hero-activities.jpg')}
      />
      <ActivitySearchForm defaults={{ city, from, to, adults }} />

      <div className="mx-auto max-w-7xl px-6 pt-6 relative space-y-6">

      {!hasQuery && (
        <section>
          <h2 className="text-[20px] font-extrabold tracking-[-0.01em] text-ink mb-4">Browse by city</h2>
          <div className="flex flex-wrap gap-2">
            {POPULAR_CITIES.map((c) => (
              <a key={c} href={`/activities?${new URLSearchParams({ city: c, from, to, adults })}`} className="inline-flex items-center gap-2 h-10 pl-2 pr-4 rounded-md bg-surface border border-border-subtle shadow-sm hover:border-border-strong transition-colors">
                <span className="font-mono text-[11.5px] font-bold bg-ink text-white rounded-[5px] px-1.5 py-0.5">{c}</span>
                <span className="text-[14px] font-bold text-ink">{CITY_BANK[c]?.name ?? c}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {warning && source !== 'live' && (
        <div className="rounded-md border border-warning-500/30 bg-amber-50 text-amber-700 px-3 py-2 text-xs">Live prices couldn&apos;t load. Try again in a minute. Showing sample prices for now.</div>
      )}

      {hasQuery && (
        <>
          <div className="flex items-center justify-between gap-3 text-sm text-[rgb(var(--text-secondary))]">
            <span>Activities in <span className="font-bold text-ink">{cityName}</span> · <span className="tnum">{from} → {to}</span></span>
            <Pill variant={badge.variant}>{badge.label}</Pill>
          </div>
          {activities.length === 0 ? (
            <Card><CardContent className="py-12"><EmptyState dense icon={<Sparkles className="w-7 h-7" />} title="No activities found" body="Try a different city or wider date range." /></CardContent></Card>
          ) : (
            <ActivitiesBrowser activities={activities} cityName={cityName} />
          )}
          <p className="text-xs text-[rgb(var(--text-tertiary))] text-center pt-2">To add an activity to a customer trip, open the itinerary builder and use <span className="font-bold">Add activity</span> on any day.</p>
        </>
      )}
      </div>
    </div>
  );
}

const POPULAR_CITIES = ['PAR', 'DXB', 'BKK', 'SIN', 'ROM', 'LON', 'AMS', 'IST', 'DPS', 'ZRH'].filter((c) => !!CITY_BANK[c]);

function nextWeekIso(offset = 0) {
  const d = new Date(); d.setDate(d.getDate() + 7 + offset); return d.toISOString().slice(0, 10);
}
