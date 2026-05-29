import { HotelSearchForm } from '@/components/hotels/search-form';
import { HotelResults } from '@/components/hotels/results';
import { hotelsForCity, CITY_BANK } from '@/lib/itinerary/mock-inventory';
import { Pill } from '@/components/ui/pill';

interface PageProps {
  searchParams: Promise<{ city?: string; checkin?: string; checkout?: string; adults?: string }>;
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
  const hotels = hasQuery ? hotelsForCity(city) : [];

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-navy-900 tracking-tight">Hotels</h1>
          <p className="text-sm text-[rgb(var(--text-secondary))] mt-1">Mock inventory until Tripjack Hotel API arrives. Same UX as the live flow.</p>
        </div>
        <Pill variant="warning">MOCK · awaiting Tripjack Hotel API docs</Pill>
      </div>

      <HotelSearchForm defaults={{ city, checkin, checkout, adults }} />

      {hasQuery && (
        <>
          <div className="text-sm text-[rgb(var(--text-secondary))]">Hotels in <span className="font-semibold text-navy-900">{cityName}</span> · {checkin} → {checkout}</div>
          <HotelResults hotels={hotels} nights={nights} />
        </>
      )}
    </div>
  );
}

function nextWeekIso(offset = 0) {
  const d = new Date(); d.setDate(d.getDate() + 7 + offset); return d.toISOString().slice(0, 10);
}
