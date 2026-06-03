import { HotelSearchForm } from '@/components/hotels/search-form';
import { HotelResults } from '@/components/hotels/results';
import { hotelsForCity, CITY_BANK } from '@/lib/itinerary/mock-inventory';
import { Pill } from '@/components/ui/pill';
import { searchHotels, isLive } from '@gg/hotelbeds';
import type { Hotel } from '@/lib/itinerary/types';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ city?: string; checkin?: string; checkout?: string; adults?: string; star?: string; board?: string; refundable?: string; sort?: string }>;
}

export default async function HotelsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const city = (sp.city ?? 'PAR').toUpperCase();
  const checkin = sp.checkin ?? nextWeekIso();
  const checkout = sp.checkout ?? nextWeekIso(3);
  const adults = sp.adults ?? '2';
  const hasQuery = !!sp.city;

  const cityName = CITY_BANK[city]?.name ?? city;
  const nights = Math.max(1, Math.round((new Date(checkout).getTime() - new Date(checkin).getTime()) / 86_400_000));

  let hotels: Hotel[] = [];
  let source: 'live' | 'mock' | 'unsupported-city' = 'mock';
  let warning: string | undefined;

  if (hasQuery) {
    if (isLive()) {
      try {
        const res = await searchHotels({
          cityCode: city,
          checkIn: checkin,
          checkOut: checkout,
          rooms: [{ adults: parseInt(adults, 10) || 2, children: 0 }],
        });
        source = res.source;
        warning = res.warning;
        const liveHotels: Hotel[] = res.hotels.map((h) => ({
          id: h.id, name: h.name, stars: h.stars, address: h.address, cityCode: h.cityCode,
          thumb: h.thumb, rating: h.rating, refundable: h.refundable, mealPlan: h.mealPlan,
          pricePerNightPaise: h.pricePerNightPaise, room: h.room, allImages: h.allImages,
        }));
        const liveNames = new Set(liveHotels.map((h) => h.name.toLowerCase()));
        hotels = source === 'live'
          ? [...liveHotels, ...hotelsForCity(city).filter((h) => !liveNames.has(h.name.toLowerCase()))]
          : hotelsForCity(city);
      } catch (e: any) {
        source = 'mock';
        warning = `Hotelbeds error: ${e?.message ?? e}`;
        hotels = hotelsForCity(city);
      }
    } else {
      hotels = hotelsForCity(city);
    }
  }

  // ── Apply filters + sort (client-chosen, applied server-side) ──
  const totalBeforeFilter = hotels.length;
  if (sp.star) {
    if (sp.star === '4plus') hotels = hotels.filter((h) => h.stars >= 4);
    else { const s = parseInt(sp.star, 10); if (s) hotels = hotels.filter((h) => h.stars === s); }
  }
  if (sp.board) hotels = hotels.filter((h) => h.mealPlan === sp.board);
  if (sp.refundable === '1') hotels = hotels.filter((h) => h.refundable);
  const sort = sp.sort ?? 'price-asc';
  hotels = [...hotels].sort((a, b) => {
    if (sort === 'price-desc')  return b.pricePerNightPaise - a.pricePerNightPaise;
    if (sort === 'stars-desc')  return b.stars - a.stars || a.pricePerNightPaise - b.pricePerNightPaise;
    if (sort === 'rating-desc') return (b.rating?.score ?? 0) - (a.rating?.score ?? 0);
    return a.pricePerNightPaise - b.pricePerNightPaise; // price-asc default
  });
  const filteredOut = totalBeforeFilter - hotels.length;

  const liveCount = hotels.filter((h) => h.id.startsWith('HB-')).length;
  const badge =
    source === 'live'
      ? { variant: 'success' as const, label: `${liveCount} LIVE · Hotelbeds` }
      : source === 'unsupported-city'
      ? { variant: 'warning' as const, label: `${city} not on Hotelbeds · mock data` }
      : isLive()
      ? { variant: 'warning' as const, label: 'MOCK · Hotelbeds returned no results' }
      : { variant: 'warning' as const, label: 'MOCK · set HOTELBEDS_API_KEY for live' };

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-navy-900 tracking-tight">Hotels</h1>
          <p className="text-sm text-[rgb(var(--text-secondary))] mt-1">
            {isLive() ? 'Live inventory via Hotelbeds (HBX Group) — 250k+ properties globally.' : 'Mock inventory. Add HOTELBEDS_API_KEY + HOTELBEDS_API_SECRET to go live.'}
          </p>
        </div>
        {hasQuery && <Pill variant={badge.variant}>{badge.label}</Pill>}
      </div>

      <HotelSearchForm defaults={{ city, checkin, checkout, adults, star: sp.star, board: sp.board, refundable: sp.refundable, sort: sp.sort }} />

      {warning && source !== 'live' && (
        <div className="rounded-md border border-warning-500/30 bg-amber-50 text-amber-700 px-3 py-2 text-xs">
          {warning}
        </div>
      )}

      {hasQuery && (
        <>
          <div className="flex items-center justify-between text-sm text-[rgb(var(--text-secondary))]">
            <span>Hotels in <span className="font-semibold text-navy-900">{cityName}</span> · {checkin} → {checkout}</span>
            {filteredOut > 0 && <span className="text-xs">{filteredOut} hidden by filters</span>}
          </div>
          <HotelResults hotels={hotels} nights={nights} />
        </>
      )}
    </div>
  );
}

function nextWeekIso(offset = 0) {
  const d = new Date(); d.setDate(d.getDate() + 7 + offset); return d.toISOString().slice(0, 10);
}
