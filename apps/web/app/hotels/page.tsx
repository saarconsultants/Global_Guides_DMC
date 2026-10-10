import { HotelSearchForm } from '@/components/hotels/search-form';
import { HotelResults } from '@/components/hotels/results';
import { hotelsForCity, CITY_BANK } from '@/lib/itinerary/mock-inventory';
import { Pill } from '@/components/ui/pill';
import { searchHotels, isLive } from '@gg/hotelbeds';
import { captureException } from '@/lib/observability';
import type { Hotel } from '@/lib/itinerary/types';
import { promoSrc } from '@/lib/promos';
import Link from 'next/link';
import { RouteCode } from '@/components/ui/pass';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ city?: string; checkin?: string; checkout?: string; adults?: string; rooms?: string; children?: string; star?: string; board?: string; refundable?: string; sort?: string }>;
}

export default async function HotelsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const city = (sp.city ?? 'PAR').toUpperCase();
  const checkin = sp.checkin ?? nextWeekIso();
  const checkout = sp.checkout ?? nextWeekIso(3);
  const adults = sp.adults ?? '2';
  const roomsCount = Math.max(1, Math.min(4, parseInt(sp.rooms ?? '1', 10) || 1));
  const childrenPerRoom = Math.max(0, Math.min(3, parseInt(sp.children ?? '0', 10) || 0));
  const adultsPerRoom = parseInt(adults, 10) || 2;
  const occupancy = Array.from({ length: roomsCount }, () => ({ adults: adultsPerRoom, children: childrenPerRoom }));
  const hasQuery = !!sp.city;

  const cityName = CITY_BANK[city]?.name ?? city;
  const nights = Math.max(1, Math.round((new Date(checkout).getTime() - new Date(checkin).getTime()) / 86_400_000));

  let hotels: Hotel[] = [];
  let source: 'live' | 'mock' | 'unsupported-city' = 'mock';
  let warning: string | undefined;

  // Guard invalid date ranges before hitting Hotelbeds (which 400s on checkout ≤ checkin).
  const dateInvalid = hasQuery && new Date(checkout) <= new Date(checkin);

  if (hasQuery && !dateInvalid) {
    if (isLive()) {
      try {
        const res = await searchHotels({
          cityCode: city,
          checkIn: checkin,
          checkOut: checkout,
          rooms: occupancy,
        });
        source = res.source;
        warning = res.warning;
        if (warning) console.error('[hotels-search] supplier warning', warning);
        const liveHotels: Hotel[] = res.hotels.map((h) => ({
          id: h.id, name: h.name, stars: h.stars, address: h.address, cityCode: h.cityCode,
          thumb: h.thumb, rating: h.rating, refundable: h.refundable, mealPlan: h.mealPlan,
          pricePerNightPaise: h.pricePerNightPaise, room: h.room, allImages: h.allImages,
          roomOptions: h.roomOptions, latitude: h.latitude, longitude: h.longitude,
        }));
        const liveNames = new Set(liveHotels.map((h) => h.name.toLowerCase()));
        hotels = source === 'live'
          ? [...liveHotels, ...hotelsForCity(city).filter((h) => !liveNames.has(h.name.toLowerCase()))]
          : hotelsForCity(city);
      } catch (e: any) {
        source = 'mock';
        console.error('[hotels-search] supplier error', e);
        warning = 'Live prices couldn\'t load. Try again in a minute.';
        void captureException(e, { scope: 'hotels-search', city, checkin, checkout });
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
      ? { variant: 'success' as const, label: `${liveCount} with live prices` }
      : source === 'unsupported-city'
      ? { variant: 'warning' as const, label: `Sample prices — live rates aren't available for ${cityName}` }
      : { variant: 'warning' as const, label: 'Sample prices — live rates unavailable right now' };

  return (
    <div className="pb-12">
      <HotelSearchForm hero heroImg={promoSrc('hero-hotels.jpg')} defaults={{ city, checkin, checkout, adults, rooms: String(roomsCount), children: String(childrenPerRoom), star: sp.star, board: sp.board, refundable: sp.refundable, sort: sp.sort }} />

      <div className="mx-auto max-w-7xl px-6 pt-6 space-y-6">
        {dateInvalid && (
          <div className="rounded-md border border-danger-500/40 bg-danger-100 text-danger-500 px-4 py-3 text-sm" role="alert">
            Check-out must be after check-in. Please adjust the dates and search again.
          </div>
        )}

        {!dateInvalid && warning && source !== 'live' && (
          <div className="rounded-md border border-warning-500/30 bg-amber-50 text-amber-700 px-3 py-2 text-xs">
            Live prices couldn&apos;t load. Try again in a minute. Showing sample prices for now.
          </div>
        )}

        {!hasQuery && (
          <section>
            <div className="flex items-end justify-between mb-4">
              <h2 className="text-[20px] font-extrabold tracking-[-0.01em] text-ink">Where are they staying?</h2>
              <p className="text-sm text-[rgb(var(--text-secondary))]">Wholesale rates on 250k+ properties</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {HOTEL_CITIES.map((d) => {
                const src = promoSrc(d.img);
                return (
                  <Link key={d.code} href={`/hotels?${new URLSearchParams({ city: d.code, checkin, checkout, adults, rooms: '1', children: '0' })}` as any} className="relative aspect-[4/5] rounded-lg overflow-hidden group bg-navy-900 lift">
                    {src && <img src={src} alt={d.city} className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />
                    <div className="absolute top-3 left-3"><RouteCode codes={[d.code]} light /></div>
                    <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                      <p className="font-extrabold text-[17px] leading-tight tracking-[-0.01em]">{d.city}</p>
                      <p className="text-[12px] text-white/75">{d.country}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {hasQuery && !dateInvalid && (
          <>
            <div className="flex items-center justify-between gap-3 text-sm text-[rgb(var(--text-secondary))]">
              <span>Hotels in <span className="font-bold text-ink">{cityName}</span> · <span className="tnum">{checkin} → {checkout}</span>{filteredOut > 0 && <span className="text-xs ml-2">({filteredOut} hidden by filters)</span>}</span>
              <Pill variant={badge.variant}>{badge.label}</Pill>
            </div>
            <HotelResults hotels={hotels} nights={nights} checkin={checkin} adults={adults} />
          </>
        )}
      </div>
    </div>
  );
}

const HOTEL_CITIES = [
  { city: 'Paris', country: 'France', code: 'PAR', img: 'paris.jpg' },
  { city: 'Dubai', country: 'UAE', code: 'DXB', img: 'dubai.jpg' },
  { city: 'Bali', country: 'Indonesia', code: 'DPS', img: 'bali.jpg' },
  { city: 'Singapore', country: 'Singapore', code: 'SIN', img: 'singapore.jpg' },
  { city: 'Zurich', country: 'Switzerland', code: 'ZRH', img: 'alps.jpg' },
  { city: 'Bangkok', country: 'Thailand', code: 'BKK', img: 'bangkok.jpg' },
];

function nextWeekIso(offset = 0) {
  const d = new Date(); d.setDate(d.getDate() + 7 + offset); return d.toISOString().slice(0, 10);
}
