'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CitySearchCombobox } from '@/components/common/city-search-combobox';
import type { SupportedCity } from '@/lib/supported-cities';
import { HeroBar, HeroCell, HeroSubmit, HeroDate, heroControl } from '@/components/ui/hero-search';

interface Props {
  defaults: { city: string; from: string; to: string; adults: string };
}

export function ActivitySearchForm({ defaults }: Props) {
  const router = useRouter();
  const [city, setCity] = useState(defaults.city);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [adults, setAdults] = useState(defaults.adults);
  const [cities, setCities] = useState<SupportedCity[] | undefined>();

  useEffect(() => {
    fetch('/api/activity-cities').then((r) => r.json()).then((d) => { if (d.ok) setCities(d.cities); }).catch(() => {});
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/activities?${new URLSearchParams({ city, from, to, adults })}` as any);
  }

  return (
    <form onSubmit={submit}>
      <HeroBar>
        <HeroCell eyebrow="Destination" grow><CitySearchCombobox bare label="Destination" value={city} onChange={setCity} cities={cities} placeholder="Search destination" /></HeroCell>
        <HeroCell eyebrow="From"><HeroDate value={from} onChange={setFrom} label="From date" sub="First tour" /></HeroCell>
        <HeroCell eyebrow="To"><HeroDate value={to} min={from} onChange={setTo} label="To date" sub="Last tour" /></HeroCell>
        <HeroCell eyebrow="Travellers">
          <select value={adults} onChange={(e) => setAdults(e.target.value)} className={heroControl} aria-label="Adults">
            {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} Adult{n > 1 ? 's' : ''}</option>)}
          </select>
        </HeroCell>
        <HeroSubmit caption="Tours & tickets">Search tours</HeroSubmit>
      </HeroBar>
    </form>
  );
}
