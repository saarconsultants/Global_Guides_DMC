import { FlightSearchForm } from '@/components/flights/search-form';
import { FlightResults } from '@/components/flights/results';
import { searchFlights } from '@gg/tripjack';
import { Pill } from '@/components/ui/pill';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string; date?: string; adults?: string; cabin?: string; directOnly?: string; returnTo?: string; leg?: 'outbound' | 'return' }>;
}

export default async function FlightsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const hasQuery = !!(sp.from && sp.to && sp.date);

  const results = hasQuery
    ? await searchFlights({
        legs: [{ fromIATA: sp.from!.toUpperCase(), toIATA: sp.to!.toUpperCase(), date: sp.date! }],
        adults: parseInt(sp.adults ?? '1', 10),
        children: 0,
        infants: 0,
        cabin: (sp.cabin as any) ?? 'ECONOMY',
        directOnly: sp.directOnly === '1',
      }).catch((e) => ({ error: e.message } as any))
    : null;

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

      <FlightSearchForm defaults={{ from: sp.from ?? 'DEL', to: sp.to ?? 'CDG', date: sp.date ?? nextMonthIso(), adults: sp.adults ?? '1', cabin: sp.cabin ?? 'ECONOMY' }} returnTo={sp.returnTo} leg={sp.leg} />

      {results && 'error' in results && (
        <div className="rounded-md border border-danger-500/40 bg-danger-100 text-danger-500 px-4 py-3 text-sm space-y-1">
          <div>Search failed: {results.error}</div>
          {String(results.error).includes('429') && (
            <div className="text-xs text-danger-500/80">
              Tripjack rate-limited the API key. Wait ~60–120 seconds and try again. Cache will deduplicate further identical searches for 90s.
            </div>
          )}
        </div>
      )}

      {results && !('error' in results) && (
        <FlightResults result={results} returnTo={sp.returnTo} cabin={(sp.cabin as any) ?? 'ECONOMY'} leg={sp.leg} />
      )}
    </div>
  );
}

function nextMonthIso() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}
