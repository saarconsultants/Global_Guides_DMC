import { FlightSearchForm } from '@/components/flights/search-form';
import { FlightResults } from '@/components/flights/results';
import { searchFlights } from '@gg/tripjack';
import { Pill } from '@/components/ui/pill';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, ArrowRight } from 'lucide-react';
import { RouteCode } from '@/components/ui/pass';
import { PageHeader } from '@/components/ui/page-header';
import { promoSrc } from '@/lib/promos';

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string; date?: string; adults?: string; cabin?: string; directOnly?: string; returnTo?: string; leg?: 'outbound' | 'return'; rdate?: string }>;
}

export default async function FlightsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const hasQuery = !!(sp.from && sp.to && sp.date);
  // Round-trip only for standalone browsing (not when attaching a single leg).
  const isRoundTrip = !!sp.rdate && !sp.returnTo;

  const common = {
    adults: parseInt(sp.adults ?? '1', 10),
    children: 0,
    infants: 0,
    cabin: (sp.cabin as any) ?? 'ECONOMY',
    directOnly: sp.directOnly === '1',
  };

  const [results, returnResults] = hasQuery
    ? await Promise.all([
        searchFlights({ legs: [{ fromIATA: sp.from!.toUpperCase(), toIATA: sp.to!.toUpperCase(), date: sp.date! }], ...common }).catch((e) => { console.error('[flights-search] supplier error', e); return { error: e.userMessage ?? e.message, upstream: e.upstream ?? false } as any; }),
        isRoundTrip
          ? searchFlights({ legs: [{ fromIATA: sp.to!.toUpperCase(), toIATA: sp.from!.toUpperCase(), date: sp.rdate! }], ...common }).catch((e) => { console.error('[flights-search] return leg supplier error', e); return { error: e.userMessage ?? e.message, upstream: e.upstream ?? false } as any; })
          : Promise.resolve(null),
      ])
    : [null, null];

  const searchForm = (
    <FlightSearchForm hero={!sp.returnTo} heroImg={promoSrc('hero-flights.jpg')} defaults={{ from: sp.from ?? 'DEL', to: sp.to ?? 'CDG', date: sp.date ?? nextMonthIso(), adults: sp.adults ?? '1', cabin: sp.cabin ?? 'ECONOMY', rdate: sp.rdate }} returnTo={sp.returnTo} leg={sp.leg} />
  );

  return (
    <div className="pb-12">
      {/* Standalone browsing: full-bleed portal hero. Attach flow: compact card in-container. */}
      {!sp.returnTo && searchForm}

      <div className="mx-auto max-w-7xl px-6 pt-6 space-y-6">
        {sp.returnTo && (
          <>
            <div className="mt-4 rounded-md border border-crimson-700/30 bg-crimson-50 text-crimson-900 px-4 py-2.5 flex items-center justify-between gap-3">
              <p className="text-sm">
                <span className="font-semibold">Adding {sp.leg === 'return' ? 'return' : 'outbound'} flight to your itinerary.</span>
                <span className="text-crimson-700/80 ml-2">Pick any option below — we'll attach it and bounce you back.</span>
              </p>
              <Link href={`/itinerary/${sp.returnTo}/customize` as any} className="inline-flex items-center gap-1 text-xs font-semibold hover:underline">
                <ArrowLeft className="w-3.5 h-3.5" />Back without selecting
              </Link>
            </div>
            <PageHeader
              title="Flights"
              description="Live fares from our airline partner."
            />
            {searchForm}
          </>
        )}

        {!hasQuery && !sp.returnTo && (
          <section className="pt-6">
            <div className="flex items-end justify-between mb-4">
              <h2 className="text-[20px] font-extrabold tracking-[-0.01em] text-ink">Popular routes this season</h2>
              <p className="text-sm text-[rgb(var(--text-secondary))]">One click loads the fare search</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {POPULAR.map((r) => (
                <Link key={r.from + r.to} href={`/flights?${new URLSearchParams({ from: r.from, to: r.to, date: nextMonthIso(), adults: '2', cabin: 'ECONOMY' })}` as any}
                  className="group flex items-center gap-4 rounded-lg bg-surface border border-border-subtle shadow-sm px-4 py-3.5 lift">
                  <RouteCode codes={[r.from, r.to]} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-bold text-ink truncate">{r.fromName} → {r.toName}</span>
                    <span className="block text-[12px] text-[rgb(var(--text-secondary))]">{r.note}</span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-crimson-700 transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {results && !('error' in results) && (
          <div className="flex justify-end">
            <Pill variant={results.source === 'live' ? 'success' : 'warning'}>
              {results.source === 'live' ? 'Live fares' : 'Sample prices — live rates unavailable right now'}
            </Pill>
          </div>
        )}

        {results && 'error' in results && (
          <div className="rounded-lg bg-surface border border-border-subtle shadow-sm p-5 flex flex-col md:flex-row md:items-center gap-4" role="alert">
            <span className="w-11 h-11 rounded-md bg-danger-100 text-danger-500 inline-flex items-center justify-center shrink-0"><RefreshCw className="w-5 h-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold text-ink">Live fares are unavailable right now</p>
              <p className="text-[13px] text-[rgb(var(--text-secondary))] mt-0.5">Live prices couldn&apos;t load. Try again in a minute, or adjust the route or date. Nothing was charged.</p>
            </div>
            {(results as any).upstream && (
              <Link
                href={`/flights?${new URLSearchParams({ from: sp.from ?? '', to: sp.to ?? '', date: sp.date ?? '', adults: sp.adults ?? '1', cabin: sp.cabin ?? 'ECONOMY', ...(sp.directOnly ? { directOnly: sp.directOnly } : {}), ...(sp.rdate ? { rdate: sp.rdate } : {}), ...(sp.returnTo ? { returnTo: sp.returnTo } : {}), ...(sp.leg ? { leg: sp.leg } : {}) }).toString()}` as any}
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-crimson-700 text-white px-4 h-10 text-sm font-bold hover:bg-crimson-900 transition-colors shrink-0"
              >
                <RefreshCw className="w-4 h-4" />Try again
              </Link>
            )}
          </div>
        )}

      {results && !('error' in results) && (
        <div className="space-y-3">
          {isRoundTrip && <h2 className="text-[18px] font-extrabold text-ink inline-flex items-center gap-3">Outbound <RouteCode codes={[sp.from!.toUpperCase(), sp.to!.toUpperCase()]} /><span className="text-sm font-medium text-[rgb(var(--text-secondary))] tnum">{sp.date}</span></h2>}
          <FlightResults result={results} returnTo={sp.returnTo} cabin={(sp.cabin as any) ?? 'ECONOMY'} leg={sp.leg} />
        </div>
      )}

      {isRoundTrip && returnResults && 'error' in returnResults && (
        <div className="rounded-lg bg-surface border border-border-subtle shadow-sm p-4 text-sm text-ink" role="alert"><span className="font-bold">Return fares unavailable:</span> <span className="text-[rgb(var(--text-secondary))]">Live prices couldn&apos;t load. Try again in a minute.</span></div>
      )}

        {isRoundTrip && returnResults && !('error' in returnResults) && (
          <div className="space-y-3 pt-2">
            <h2 className="text-[18px] font-extrabold text-ink inline-flex items-center gap-3">Return <RouteCode codes={[sp.to!.toUpperCase(), sp.from!.toUpperCase()]} /><span className="text-sm font-medium text-[rgb(var(--text-secondary))] tnum">{sp.rdate}</span></h2>
            <FlightResults result={returnResults} cabin={(sp.cabin as any) ?? 'ECONOMY'} />
          </div>
        )}
      </div>
    </div>
  );
}

const POPULAR = [
  { from: 'DEL', to: 'DXB', fromName: 'New Delhi', toName: 'Dubai', note: 'Non-stop · 3h 45m' },
  { from: 'BOM', to: 'DXB', fromName: 'Mumbai', toName: 'Dubai', note: 'Non-stop · 3h 15m' },
  { from: 'DEL', to: 'BKK', fromName: 'New Delhi', toName: 'Bangkok', note: 'Non-stop · 4h 20m' },
  { from: 'DEL', to: 'SIN', fromName: 'New Delhi', toName: 'Singapore', note: 'Non-stop · 5h 40m' },
  { from: 'DEL', to: 'CDG', fromName: 'New Delhi', toName: 'Paris', note: 'Non-stop · 9h 10m' },
  { from: 'BOM', to: 'MLE', fromName: 'Mumbai', toName: 'Maldives', note: 'Non-stop · 2h 45m' },
];

function nextMonthIso() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}
