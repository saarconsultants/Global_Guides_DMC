import { FlightSearchForm } from '@/components/flights/search-form';
import { FlightResults } from '@/components/flights/results';
import { searchFlights } from '@gg/tripjack';
import { Pill } from '@/components/ui/pill';
import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';

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
        searchFlights({ legs: [{ fromIATA: sp.from!.toUpperCase(), toIATA: sp.to!.toUpperCase(), date: sp.date! }], ...common }).catch((e) => ({ error: e.userMessage ?? e.message, upstream: e.upstream ?? false } as any)),
        isRoundTrip
          ? searchFlights({ legs: [{ fromIATA: sp.to!.toUpperCase(), toIATA: sp.from!.toUpperCase(), date: sp.rdate! }], ...common }).catch((e) => ({ error: e.userMessage ?? e.message, upstream: e.upstream ?? false } as any))
          : Promise.resolve(null),
      ])
    : [null, null];

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 space-y-6">
      {sp.returnTo && (
        <div className="rounded-md border border-crimson-700/30 bg-crimson-50 text-crimson-900 px-4 py-2.5 flex items-center justify-between gap-3">
          <p className="text-sm">
            <span className="font-semibold">Adding {sp.leg === 'return' ? 'return' : 'outbound'} flight to your itinerary.</span>
            <span className="text-crimson-700/80 ml-2">Pick any option below — we'll attach it and bounce you back.</span>
          </p>
          <Link href={`/itinerary/${sp.returnTo}/customize` as any} className="inline-flex items-center gap-1 text-xs font-semibold hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" />Back without selecting
          </Link>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-navy-900 tracking-tight">Flights</h1>
          <p className="text-sm text-[rgb(var(--text-secondary))] mt-1">Live fares via Tripjack. Mock data shown only if the API key is unset.</p>
        </div>
        {results && !('error' in results) && (
          <Pill variant={results.source === 'live' ? 'success' : 'warning'}>
            {results.source === 'live' ? 'LIVE' : 'MOCK · set TRIPJACK_API_KEY to go live'}
          </Pill>
        )}
      </div>

      <FlightSearchForm defaults={{ from: sp.from ?? 'DEL', to: sp.to ?? 'CDG', date: sp.date ?? nextMonthIso(), adults: sp.adults ?? '1', cabin: sp.cabin ?? 'ECONOMY', rdate: sp.rdate }} returnTo={sp.returnTo} leg={sp.leg} />

      {results && 'error' in results && (
        <div className="rounded-md border border-danger-500/40 bg-danger-100 text-danger-500 px-4 py-3 text-sm space-y-2">
          <div className="font-medium">{results.error}</div>
          {String(results.error).includes('rate-limited') && (
            <div className="text-xs text-danger-500/80">
              Cache will deduplicate further identical searches for 90s, so a quick retry won't add load.
            </div>
          )}
          {(results as any).upstream && (
            <Link
              href={`/flights?${new URLSearchParams({ from: sp.from ?? '', to: sp.to ?? '', date: sp.date ?? '', adults: sp.adults ?? '1', cabin: sp.cabin ?? 'ECONOMY', ...(sp.directOnly ? { directOnly: sp.directOnly } : {}), ...(sp.rdate ? { rdate: sp.rdate } : {}), ...(sp.returnTo ? { returnTo: sp.returnTo } : {}), ...(sp.leg ? { leg: sp.leg } : {}) }).toString()}` as any}
              className="inline-flex items-center gap-1.5 rounded-md border border-danger-500/40 bg-surface px-3 h-8 text-xs font-semibold text-danger-500 hover:bg-danger-100 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />Try again
            </Link>
          )}
        </div>
      )}

      {results && !('error' in results) && (
        <div className="space-y-3">
          {isRoundTrip && <h2 className="text-lg font-semibold text-navy-900 inline-flex items-center gap-2">Outbound <span className="text-sm font-normal text-[rgb(var(--text-secondary))]">{sp.from?.toUpperCase()} → {sp.to?.toUpperCase()} · {sp.date}</span></h2>}
          <FlightResults result={results} returnTo={sp.returnTo} cabin={(sp.cabin as any) ?? 'ECONOMY'} leg={sp.leg} />
        </div>
      )}

      {isRoundTrip && returnResults && 'error' in returnResults && (
        <div className="rounded-md border border-danger-500/40 bg-danger-100 text-danger-500 px-4 py-3 text-sm">Return search failed: {returnResults.error}</div>
      )}

      {isRoundTrip && returnResults && !('error' in returnResults) && (
        <div className="space-y-3 pt-2">
          <h2 className="text-lg font-semibold text-navy-900 inline-flex items-center gap-2">Return <span className="text-sm font-normal text-[rgb(var(--text-secondary))]">{sp.to?.toUpperCase()} → {sp.from?.toUpperCase()} · {sp.rdate}</span></h2>
          <FlightResults result={returnResults} cabin={(sp.cabin as any) ?? 'ECONOMY'} />
        </div>
      )}
    </div>
  );
}

function nextMonthIso() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}
