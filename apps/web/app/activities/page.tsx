import { CITY_BANK } from '@/lib/itinerary/mock-inventory';
import { searchAllActivities } from '@/lib/activities/search';
import { ActivitySearchForm } from '@/components/activities/search-form';
import { Card, CardContent } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { EmptyState } from '@/components/ui/empty-state';
import { ActivitiesBrowser } from '@/components/activities/activities-browser';
import { Sparkles } from 'lucide-react';
import type { Activity } from '@/lib/itinerary/types';
import { HeroBand } from '@/components/ui/hero-search';
import { promoSrc } from '@/lib/promos';
import { RouteCode } from '@/components/ui/pass';
import { formatDateRange } from '@/lib/utils';

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
  let counts = { hotelbeds: 0, leamigo: 0 };

  if (hasQuery) {
    const res = await searchAllActivities({ cityCode: city, fromDate: from, toDate: to, adults: parseInt(adults, 10) || 2 });
    ({ activities, source, warning, counts } = res);
  }

  const liveCount = counts.hotelbeds + counts.leamigo;
  const badge =
    source === 'live' ? { variant: 'live' as const, label: `${liveCount} with live prices` }
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

      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-6 relative space-y-6">

      {!hasQuery && (
        <section>
          <div className="mb-4">
            <h2 className="text-[20px] font-extrabold tracking-[-0.01em] text-ink">Where next?</h2>
            <p className="mt-1 text-sm text-[rgb(var(--text-secondary))]">Pick a city to see its tours, tickets and day trips</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {PHOTO_CITIES.map((d) => {
              const src = promoSrc(d.img);
              return (
                <a key={d.code} href={`/activities?${new URLSearchParams({ city: d.code, from, to, adults })}`} className="relative aspect-[4/5] rounded-lg overflow-hidden group bg-navy-900 lift">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {src && <img src={src} alt={d.city} className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300 ease-out" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />
                  <div className="absolute top-3 left-3"><RouteCode codes={[d.code]} light /></div>
                  <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                    <p className="font-extrabold text-[17px] leading-tight tracking-[-0.01em]">{d.city}</p>
                    <p className="text-[12px] text-white/75">{d.country}</p>
                  </div>
                </a>
              );
            })}
          </div>
          {MORE_CITIES.length > 0 && <p className="label mt-6 mb-2.5">More cities</p>}
          <div className="flex flex-wrap gap-2">
            {MORE_CITIES.map((c) => (
              <a key={c} href={`/activities?${new URLSearchParams({ city: c, from, to, adults })}`} className="inline-flex items-center gap-2 h-10 pl-2 pr-4 rounded-md bg-surface border border-border-subtle shadow-sm hover:border-border-strong transition-colors">
                <span className="font-mono text-[11.5px] font-bold bg-ink text-white rounded-[5px] px-1.5 py-0.5">{c}</span>
                <span className="text-[14px] font-bold text-ink">{CITY_BANK[c]?.name ?? c}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {warning && source !== 'live' && (
        <div role="status" className="rounded-md border border-warning-500/30 bg-amber-50 text-amber-700 px-3 py-2 text-xs">{warning} Showing sample activities for now — they can&apos;t be booked.</div>
      )}

      {hasQuery && (
        <>
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 text-sm text-[rgb(var(--text-secondary))]">
            <p className="min-w-0">Activities in <span className="font-bold text-ink">{cityName}</span> · <span className="font-mono font-bold text-ink tnum whitespace-nowrap">{formatDateRange(from, to)}</span></p>
            <Pill variant={badge.variant} className="max-w-full whitespace-normal text-left leading-tight">{badge.label}</Pill>
          </div>
          {activities.length === 0 ? (
            <Card><CardContent className="py-12"><EmptyState dense icon={<Sparkles className="w-7 h-7" />} title="No activities found" body="Try a different city or wider date range." /></CardContent></Card>
          ) : (
            <ActivitiesBrowser activities={activities} cityName={cityName} travellers={parseInt(adults, 10) || 2} />
          )}
          <p className="text-xs text-[rgb(var(--text-tertiary))] text-center pt-2">To add an activity to a customer trip, open the itinerary builder and use <span className="font-bold">Add activity</span> on any day.</p>
        </>
      )}
      </div>
    </div>
  );
}

const PHOTO_CITIES = [
  { city: 'Paris', country: 'France', code: 'PAR', img: 'paris.jpg' },
  { city: 'Dubai', country: 'UAE', code: 'DXB', img: 'dubai.jpg' },
  { city: 'Bali', country: 'Indonesia', code: 'DPS', img: 'bali.jpg' },
  { city: 'Singapore', country: 'Singapore', code: 'SIN', img: 'singapore.jpg' },
  { city: 'Zurich', country: 'Switzerland', code: 'ZRH', img: 'alps.jpg' },
  { city: 'Bangkok', country: 'Thailand', code: 'BKK', img: 'bangkok.jpg' },
];
const MORE_CITIES = ['ROM', 'LON', 'AMS', 'IST'].filter((c) => !!CITY_BANK[c]);

function nextWeekIso(offset = 0) {
  const d = new Date(); d.setDate(d.getDate() + 7 + offset); return d.toISOString().slice(0, 10);
}
