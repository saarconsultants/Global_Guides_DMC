'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CitySearchCombobox } from '@/components/common/city-search-combobox';
import { HeroBar, HeroCell, HeroSubmit, heroControl } from '@/components/ui/hero-search';

interface Props {
  defaults: { city: string; from: string; to: string; adults: string };
}

export function ActivitySearchForm({ defaults }: Props) {
  const router = useRouter();
  const [city, setCity] = useState(defaults.city);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [adults, setAdults] = useState(defaults.adults);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/activities?${new URLSearchParams({ city, from, to, adults })}` as any);
  }

  return (
    <form onSubmit={submit}>
      <HeroBar>
        <HeroCell eyebrow="Destination" grow><CitySearchCombobox bare label="Destination" value={city} onChange={setCity} placeholder="Search destination" /></HeroCell>
        <HeroCell eyebrow="From"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={heroControl} aria-label="From date" /></HeroCell>
        <HeroCell eyebrow="To"><input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={heroControl} aria-label="To date" /></HeroCell>
        <HeroCell eyebrow="Travellers">
          <select value={adults} onChange={(e) => setAdults(e.target.value)} className={heroControl} aria-label="Adults">
            {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} Adult{n > 1 ? 's' : ''}</option>)}
          </select>
        </HeroCell>
        <HeroSubmit caption="Hotelbeds · live">Search tours</HeroSubmit>
      </HeroBar>
    </form>
  );
}
