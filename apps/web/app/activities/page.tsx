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
        const live: Activity[] = res.activities.map((a) => ({
          id: a.id, name: a.name, category: 'tour', durationMin: a.durationMin,
          pricePaise: a.pricePaise, cityCode: a.cityCode, thumb: a.thumb, description: a.description,
        }));
        const liveNames = new Set(live.map((a) => a.name.toLowerCase()));
        activities = source === 'live'
          ? [...live, ...activitiesForCity(city).filter((a) => !liveNames.has(a.name.toLowerCase()))]
          : activitiesForCity(city);
      } catch (e: any) {
        source = 'mock'; warning = `Hotelbeds error: ${e?.message ?? e}`;
        activities = activitiesForCity(city);
      }
    } else {
      activities = activitiesForCity(city);
    }
  }

  const liveCount = activities.filter((a) => a.id.startsWith('ACT-')).length;
  const badge =
    source === 'live' ? { variant: 'success' as const, label: `${liveCount} LIVE · Hotelbeds` }
    : source === 'unsupported-city' ? { variant: 'warning' as const, label: `${city} not on Hotelbeds · mock data` }
    : isLive('activities') ? { variant: 'warning' as const, label: 'MOCK · no live results' }
    : { variant: 'warning' as const, label: 'MOCK · set HOTELBEDS_ACTIVITIES_API_KEY' };

  return (
    <div className="pb-12">
      <HeroBand
        title="Experiences they'll"
        accent="remember."
        subtitle="Live tours, tickets & day trips — browse to quote, then add inside any itinerary"
        ghost="explore"
        img={promoSrc('hero-activities.jpg')}
      />

      <div className="mx-auto max-w-7xl px-6 -mt-12 relative space-y-6">
        <ActivitySearchForm defaults={{ city, from, to, adults }} />

      {warning && source !== 'live' && (
        <div className="rounded-md border border-warning-500/30 bg-amber-50 text-amber-700 px-3 py-2 text-xs">{warning}</div>
      )}

      {hasQuery && (
        <>
          <div className="flex items-center justify-between gap-3 text-sm text-[rgb(var(--text-secondary))]">
            <span>Activities in <span className="font-semibold text-navy-900">{cityName}</span> · {from} → {to}</span>
            <Pill variant={badge.variant}>{badge.label}</Pill>
          </div>
          {activities.length === 0 ? (
            <Card><CardContent className="py-12"><EmptyState dense icon={<Sparkles className="w-7 h-7" />} title="No activities found" body="Try a different city or wider date range." /></CardContent></Card>
          ) : (
            <ActivitiesBrowser activities={activities} cityName={cityName} />
          )}
          <p className="text-xs text-[rgb(var(--text-tertiary))] text-center pt-2">To add an activity to a customer trip, open the itinerary builder and use <span className="font-medium">+ Add Activity</span> on any day.</p>
        </>
      )}
      </div>
    </div>
  );
}

function nextWeekIso(offset = 0) {
  const d = new Date(); d.setDate(d.getDate() + 7 + offset); return d.toISOString().slice(0, 10);
}
