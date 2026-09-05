'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plane, Hotel, Ticket, Sparkles, ArrowLeftRight } from 'lucide-react';
import { AirportCombobox } from '@/components/flights/airport-combobox';
import { CitySearchCombobox } from '@/components/common/city-search-combobox';
import { HeroCell, HeroSubmit, heroControl } from '@/components/ui/hero-search';
import { cn } from '@/lib/utils';

type Tab = 'flights' | 'hotels' | 'activities' | 'ai';

function iso(daysFromNow: number) {
  const d = new Date(); d.setDate(d.getDate() + daysFromNow); return d.toISOString().slice(0, 10);
}

const TABS: Array<{ id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'flights', label: 'Flights', icon: Plane },
  { id: 'hotels', label: 'Hotels', icon: Hotel },
  { id: 'activities', label: 'Activities', icon: Ticket },
  { id: 'ai', label: 'Full trip with AI', icon: Sparkles },
];

/** The pass-shaped unified search on the agent home page. */
export function DashboardSearch() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('flights');
  // flights
  const [from, setFrom] = useState('DEL');
  const [to, setTo] = useState('CDG');
  const [date, setDate] = useState(iso(30));
  const [adults, setAdults] = useState('2');
  // hotels / activities
  const [city, setCity] = useState('PAR');
  const [checkin, setCheckin] = useState(iso(30));
  const [checkout, setCheckout] = useState(iso(33));
  const [rooms, setRooms] = useState('1');
  // ai
  const [dest, setDest] = useState('Paris, Amsterdam, Zurich');
  const [nights, setNights] = useState('7');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (tab === 'flights') {
      router.push(`/flights?${new URLSearchParams({ from, to, date, adults, cabin: 'ECONOMY' })}`);
    } else if (tab === 'hotels') {
      router.push(`/hotels?${new URLSearchParams({ city, checkin, checkout, adults, rooms, children: '0' })}`);
    } else if (tab === 'activities') {
      router.push(`/activities?${new URLSearchParams({ city, from: checkin, to: checkout, adults })}`);
    } else {
      router.push(`/itinerary/new?${new URLSearchParams({ ai: '1', dest, nights, date, adults, from })}`);
    }
  }

  const adultsSelect = (
    <select value={adults} onChange={(e) => setAdults(e.target.value)} className={heroControl} aria-label="Adults">
      {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} Adult{n > 1 ? 's' : ''}</option>)}
    </select>
  );

  return (
    <form onSubmit={submit} className="relative mx-auto max-w-7xl px-6 -mt-[124px]">
      <div className="flex flex-wrap items-center gap-2 mb-3 pl-1" role="tablist" aria-label="Search type">
        {TABS.map((t) => {
          const Icon = t.icon; const on = tab === t.id;
          return (
            <button key={t.id} type="button" role="tab" aria-selected={on} onClick={() => setTab(t.id)}
              className={cn('inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-[13px] font-bold border transition-colors',
                on ? 'bg-amber-500 text-ink border-amber-500' : 'bg-white/12 text-white border-white/25 hover:bg-white/22 backdrop-blur-sm')}>
              <Icon className="w-3.5 h-3.5" />{t.label}
            </button>
          );
        })}
      </div>

      <div className="bg-surface rounded-lg shadow-xl flex flex-col lg:flex-row lg:items-stretch overflow-hidden">
        {tab === 'flights' && (
          <>
            <HeroCell eyebrow="From" grow><AirportCombobox bare label="From" value={from} onChange={setFrom} placeholder="City or airport" /></HeroCell>
            <button type="button" onClick={() => { setFrom(to); setTo(from); }} aria-label="Swap origin and destination"
              className="hidden lg:flex absolute z-10 left-[calc(24px+27%)] top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-surface border border-border shadow-sm items-center justify-center text-crimson-700 hover:bg-crimson-50">
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </button>
            <HeroCell eyebrow="To" grow><AirportCombobox bare label="To" value={to} onChange={setTo} placeholder="City or airport" iconRotate /></HeroCell>
            <HeroCell eyebrow="Depart"><input type="date" value={date} min={iso(0)} onChange={(e) => setDate(e.target.value)} className={heroControl} aria-label="Departure date" /></HeroCell>
            <HeroCell eyebrow="Travellers">{adultsSelect}</HeroCell>
            <HeroSubmit caption="Tripjack · live fares">Search fares</HeroSubmit>
          </>
        )}
        {tab === 'hotels' && (
          <>
            <HeroCell eyebrow="Destination" grow><CitySearchCombobox bare label="Destination" value={city} onChange={setCity} placeholder="Search destination" /></HeroCell>
            <HeroCell eyebrow="Check-in"><input type="date" value={checkin} min={iso(0)} onChange={(e) => setCheckin(e.target.value)} className={heroControl} aria-label="Check-in" /></HeroCell>
            <HeroCell eyebrow="Check-out"><input type="date" value={checkout} min={checkin} onChange={(e) => setCheckout(e.target.value)} className={heroControl} aria-label="Check-out" /></HeroCell>
            <HeroCell eyebrow="Rooms"><select value={rooms} onChange={(e) => setRooms(e.target.value)} className={heroControl} aria-label="Rooms">{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} Room{n > 1 ? 's' : ''}</option>)}</select></HeroCell>
            <HeroCell eyebrow="Adults / room">{adultsSelect}</HeroCell>
            <HeroSubmit caption="Hotelbeds · wholesale">Search rooms</HeroSubmit>
          </>
        )}
        {tab === 'activities' && (
          <>
            <HeroCell eyebrow="Destination" grow><CitySearchCombobox bare label="Destination" value={city} onChange={setCity} placeholder="Search destination" /></HeroCell>
            <HeroCell eyebrow="From"><input type="date" value={checkin} min={iso(0)} onChange={(e) => setCheckin(e.target.value)} className={heroControl} aria-label="From date" /></HeroCell>
            <HeroCell eyebrow="To"><input type="date" value={checkout} min={checkin} onChange={(e) => setCheckout(e.target.value)} className={heroControl} aria-label="To date" /></HeroCell>
            <HeroCell eyebrow="Travellers">{adultsSelect}</HeroCell>
            <HeroSubmit caption="Hotelbeds · live">Search tours</HeroSubmit>
          </>
        )}
        {tab === 'ai' && (
          <>
            <HeroCell eyebrow="Destinations" grow className="lg:flex-[2]"><input value={dest} onChange={(e) => setDest(e.target.value)} className={heroControl} placeholder="e.g. Paris, Amsterdam, Zurich" aria-label="Destinations" /></HeroCell>
            <HeroCell eyebrow="Nights"><select value={nights} onChange={(e) => setNights(e.target.value)} className={heroControl} aria-label="Nights">{[3, 4, 5, 6, 7, 8, 9, 10, 12, 14].map((n) => <option key={n} value={n}>{n} nights</option>)}</select></HeroCell>
            <HeroCell eyebrow="Depart"><input type="date" value={date} min={iso(0)} onChange={(e) => setDate(e.target.value)} className={heroControl} aria-label="Departure date" /></HeroCell>
            <HeroCell eyebrow="Travellers">{adultsSelect}</HeroCell>
            <HeroSubmit caption="Grounded in live inventory">Build with AI</HeroSubmit>
          </>
        )}
      </div>
    </form>
  );
}
