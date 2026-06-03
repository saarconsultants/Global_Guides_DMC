import { searchTransfers, toHotelbedsDestination, isLive } from '@gg/hotelbeds';
import { cityInfo, CITY_BANK } from '@/lib/itinerary/mock-inventory';
import { TransferSearchForm } from '@/components/transfers/search-form';
import { Card, CardContent } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { EmptyState } from '@/components/ui/empty-state';
import { formatINR } from '@/lib/utils';
import { Car } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ city?: string; date?: string; adults?: string }>;
}

function vehicleLabel(k: string) {
  return k === 'PRIVATE_PREMIUM' ? 'Private Premium' : k === 'LUXURY' ? 'Luxury' : k === 'MINIBUS' ? 'Minibus' : k === 'SHARED' ? 'Shared shuttle' : 'Private';
}

export default async function TransfersPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const city = (sp.city ?? 'PAR').toUpperCase();
  const date = sp.date ?? nextWeekIso();
  const adults = sp.adults ?? '2';
  const hasQuery = !!sp.city;
  const cityName = CITY_BANK[city]?.name ?? city;

  const info = cityInfo(city);
  const airportCode = info.airportCode;
  const destinationCode = toHotelbedsDestination(city);

  let transfers: Array<{ id: string; vehicleKind: string; vehicleName: string; maxPax: number; pricePaise: number }> = [];
  let source: 'live' | 'mock' = 'mock';
  let warning: string | undefined;

  if (hasQuery && isLive('transfers') && airportCode && destinationCode) {
    try {
      // Airport (IATA) → city destination zone (ATLAS). Standalone browse —
      // inside an itinerary we target the specific hotel instead.
      const res = await searchTransfers({
        fromType: 'IATA', fromCode: airportCode,
        toType: 'ATLAS', toCode: destinationCode,
        pickupDate: date, adults: parseInt(adults, 10) || 2, children: 0, infants: 0,
      });
      source = res.source;
      warning = res.warning;
      transfers = res.transfers;
    } catch (e: any) {
      warning = `Hotelbeds error: ${e?.message ?? e}`;
    }
  } else if (hasQuery && !isLive('transfers')) {
    warning = 'HOTELBEDS_TRANSFERS_API_KEY not set';
  } else if (hasQuery && !destinationCode) {
    warning = `${city} not mapped for Hotelbeds transfers`;
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-navy-900 tracking-tight">Airport transfers</h1>
          <p className="text-sm text-[rgb(var(--text-secondary))] mt-1">
            Live airport ↔ city transfers via Hotelbeds. Browse to quote — add inside an itinerary to target the exact hotel.
          </p>
        </div>
        {hasQuery && <Pill variant={source === 'live' && transfers.length > 0 ? 'success' : 'warning'}>{source === 'live' && transfers.length > 0 ? `${transfers.length} LIVE` : 'MOCK / none'}</Pill>}
      </div>

      <TransferSearchForm defaults={{ city, date, adults }} />

      {warning && (
        <div className="rounded-md border border-warning-500/30 bg-amber-50 text-amber-700 px-3 py-2 text-xs">{warning} — showing indicative options if any.</div>
      )}

      {hasQuery && (
        <>
          <div className="text-sm text-[rgb(var(--text-secondary))]">
            {info.airportName ?? 'Airport'} → <span className="font-semibold text-navy-900">{cityName}</span> · {date} · {adults} pax
          </div>
          {transfers.length === 0 ? (
            <Card><CardContent className="py-12"><EmptyState dense icon={<Car className="w-7 h-7" />} title="No live transfers for this route/date" body="Hotelbeds transfers are most reliable when targeted at a specific hotel — open an itinerary and use Add transfer on the arrival or departure day." /></CardContent></Card>
          ) : (
            <div className="space-y-3">
              {transfers.map((t) => (
                <Card key={t.id}>
                  <CardContent className="pt-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-crimson-50 text-crimson-700 inline-flex items-center justify-center"><Car className="w-5 h-5" /></div>
                      <div>
                        <p className="font-semibold text-navy-900 inline-flex items-center gap-2">{vehicleLabel(t.vehicleKind)} <Pill variant="success">LIVE</Pill></p>
                        <p className="text-xs text-[rgb(var(--text-secondary))]">Up to {t.maxPax} passengers</p>
                      </div>
                    </div>
                    <p className="font-mono font-bold text-navy-900">{formatINR(t.pricePaise)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function nextWeekIso() { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); }
