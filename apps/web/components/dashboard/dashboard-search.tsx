'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plane, Hotel, Ticket, Sparkles } from 'lucide-react';
import { AirportCodeCell, AirportSwapButton } from '@/components/flights/airport-code-cell';
import { CitySearchCombobox } from '@/components/common/city-search-combobox';
import { HeroCell, HeroSubmit, HeroDate, heroControl } from '@/components/ui/hero-search';
import { findCity } from '@/lib/cities';
import { cn } from '@/lib/utils';

type Tab = 'flights' | 'hotels' | 'activities' | 'ai';

function iso(daysFromNow: number) {
  const d = new Date(); d.setDate(d.getDate() + daysFromNow); return d.toISOString().slice(0, 10);
}

const TABS: Array<{ id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'flights', label: 'Flights', icon: Plane },
  { id: 'hotels', label: 'Hotels', icon: Hotel },
  { id: 'activities', label: 'Activities', icon: Ticket },
  { id: 'ai', label: 'Plan with AI', icon: Sparkles },
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
      router.push(`/itinerary/ai?${new URLSearchParams({ dest, nights, date, adults, from })}`);
    }
  }

  const adultsCell = (
    <div className="relative">
      <div className="text-[19px] font-bold leading-none text-ink tnum">{adults} Adult{Number(adults) > 1 ? 's' : ''}</div>
      <div className="mt-1 text-[12px] text-[rgb(var(--text-secondary))]">Economy · {rooms} room{Number(rooms) > 1 ? 's' : ''}</div>
      <select value={adults} onChange={(e) => setAdults(e.target.value)} aria-label="Adults" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
        {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} Adult{n > 1 ? 's' : ''}</option>)}
      </select>
    </div>
  );

  return (
    <form onSubmit={submit} className="relative shell -mt-[124px]">
      <div className="flex flex-wrap items-center gap-2 mb-3 pl-1" role="tablist" aria-label="Search type">
        {TABS.map((t) => {
          const Icon = t.icon; const on = tab === t.id;
          return (
            <button key={t.id} type="button" role="tab" aria-selected={on} onClick={() => setTab(t.id)}
              className={cn('inline-flex items-center gap-1.5 h-11 sm:h-9 px-4 rounded-full text-[13px] font-bold border transition-[color,background-color,border-color,transform] duration-150 ease-out active:scale-[0.97]',
                on ? 'bg-amber-500 text-ink border-amber-500' : 'bg-white/12 text-white border-white/25 hover:bg-white/22 backdrop-blur-sm')}>
              <Icon className="w-3.5 h-3.5" />{t.label}
            </button>
          );
        })}
      </div>

      <div className="relative z-20 bg-surface rounded-lg shadow-md flex flex-col lg:flex-row lg:items-stretch">
        {tab === 'flights' && (
          <>
            <HeroCell eyebrow="From" grow>
              <AirportCodeCell code={from} onPick={setFrom} label="From" />
              <AirportSwapButton onClick={() => { setFrom(to); setTo(from); }} />
            </HeroCell>
            <HeroCell eyebrow="To" grow className="lg:pl-7">
              <AirportCodeCell code={to} onPick={setTo} label="To" rotate />
            </HeroCell>
            <HeroCell eyebrow="Depart"><HeroDate value={date} min={iso(0)} onChange={setDate} label="Departure date" sub="One-way" /></HeroCell>
            <HeroCell eyebrow="Travellers">{adultsCell}</HeroCell>
            <HeroSubmit caption="Live fares">Search flights</HeroSubmit>
          </>
        )}
        {tab === 'hotels' && (
          <>
            <HeroCell eyebrow="Destination" grow><CitySearchCombobox bare label="Destination" value={city} onChange={setCity} placeholder="Search destination" /></HeroCell>
            <HeroCell eyebrow="Check-in"><HeroDate value={checkin} min={iso(0)} onChange={setCheckin} label="Check-in" sub="Arrive" /></HeroCell>
            <HeroCell eyebrow="Check-out"><HeroDate value={checkout} min={checkin} onChange={setCheckout} label="Check-out" sub="Depart" /></HeroCell>
            <HeroCell eyebrow="Rooms"><select value={rooms} onChange={(e) => setRooms(e.target.value)} className={heroControl} aria-label="Rooms">{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} Room{n > 1 ? 's' : ''}</option>)}</select></HeroCell>
            <HeroCell eyebrow="Adults / room">{adultsCell}</HeroCell>
            <HeroSubmit caption="Wholesale rates">Search hotels</HeroSubmit>
          </>
        )}
        {tab === 'activities' && (
          <>
            <HeroCell eyebrow="Destination" grow><CitySearchCombobox bare label="Destination" value={city} onChange={setCity} placeholder="Search destination" /></HeroCell>
            <HeroCell eyebrow="From"><HeroDate value={checkin} min={iso(0)} onChange={setCheckin} label="From date" sub="First tour" /></HeroCell>
            <HeroCell eyebrow="To"><HeroDate value={checkout} min={checkin} onChange={setCheckout} label="To date" sub="Last tour" /></HeroCell>
            <HeroCell eyebrow="Travellers">{adultsCell}</HeroCell>
            <HeroSubmit caption="Tours & tickets">Search tours</HeroSubmit>
          </>
        )}
        {tab === 'ai' && (
          <>
            <HeroCell eyebrow="Destinations" grow className="lg:flex-[2]"><input value={dest} onChange={(e) => setDest(e.target.value)} className={heroControl} placeholder="e.g. Paris, Amsterdam, Zurich" aria-label="Destinations" /></HeroCell>
            <HeroCell eyebrow="Nights"><select value={nights} onChange={(e) => setNights(e.target.value)} className={heroControl} aria-label="Nights">{[3, 4, 5, 6, 7, 8, 9, 10, 12, 14].map((n) => <option key={n} value={n}>{n} nights</option>)}</select></HeroCell>
            <HeroCell eyebrow="Depart"><HeroDate value={date} min={iso(0)} onChange={setDate} label="Departure date" sub="Start" /></HeroCell>
            <HeroCell eyebrow="Travellers">{adultsCell}</HeroCell>
            <HeroSubmit caption="Day-by-day plan">Plan with AI</HeroSubmit>
          </>
        )}
      </div>
    </form>
  );
}
