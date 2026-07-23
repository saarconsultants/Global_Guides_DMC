'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, SlidersHorizontal, Check } from 'lucide-react';
import { CitySearchCombobox } from '@/components/common/city-search-combobox';
import { HeroBand, HeroBar, HeroCell, HeroSubmit, HeroChip, heroControl } from '@/components/ui/hero-search';

interface Props {
  defaults: {
    city: string; checkin: string; checkout: string; adults: string;
    rooms?: string; children?: string;
    star?: string; board?: string; refundable?: string; sort?: string;
  };
  /** Render as the full-bleed portal hero (standalone browsing). */
  hero?: boolean;
  heroImg?: string | null;
}

export function HotelSearchForm({ defaults, hero, heroImg }: Props) {
  const router = useRouter();
  const [city, setCity] = useState(defaults.city);
  const [checkin, setCheckin] = useState(defaults.checkin);
  const [checkout, setCheckout] = useState(defaults.checkout);
  const [adults, setAdults] = useState(defaults.adults);
  const [rooms, setRooms] = useState(defaults.rooms ?? '1');
  const [children, setChildren] = useState(defaults.children ?? '0');
  const [star, setStar] = useState(defaults.star ?? '');
  const [board, setBoard] = useState(defaults.board ?? '');
  const [refundable, setRefundable] = useState(defaults.refundable === '1');
  const [sort, setSort] = useState(defaults.sort ?? 'price-asc');
  const [showFilters, setShowFilters] = useState(!!(defaults.star || defaults.board || defaults.refundable === '1'));
  const [dateError, setDateError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (new Date(checkout) <= new Date(checkin)) {
      setDateError('Check-out must be after check-in.');
      return;
    }
    const params = new URLSearchParams({ city, checkin, checkout, adults, rooms, children });
    if (star) params.set('star', star);
    if (board) params.set('board', board);
    if (refundable) params.set('refundable', '1');
    if (sort && sort !== 'price-asc') params.set('sort', sort);
    router.push(`/hotels?${params}`);
  }

  const filterPanel = (bare: boolean) => (
    <div className={bare ? 'grid gap-4 sm:grid-cols-4 rounded-xl border border-border-subtle bg-surface p-4 shadow-sm' : 'grid gap-4 sm:grid-cols-4 pt-1 border-t border-border-subtle'}>
      <div>
        <Label>Star rating</Label>
        <select value={star} onChange={(e) => setStar(e.target.value)} className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm">
          <option value="">Any</option>
          <option value="5">5★ only</option>
          <option value="4">4★ only</option>
          <option value="3">3★ only</option>
          <option value="4plus">4★ &amp; up</option>
        </select>
      </div>
      <div>
        <Label>Board</Label>
        <select value={board} onChange={(e) => setBoard(e.target.value)} className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm">
          <option value="">Any</option>
          <option value="Room Only">Room Only</option>
          <option value="Breakfast Included">Breakfast Included</option>
          <option value="Half Board">Half Board</option>
          <option value="Full Board">Full Board</option>
          <option value="All Inclusive">All Inclusive</option>
        </select>
      </div>
      <div>
        <Label>Sort by</Label>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm">
          <option value="price-asc">Price: low → high</option>
          <option value="price-desc">Price: high → low</option>
          <option value="stars-desc">Stars: high → low</option>
          <option value="rating-desc">Guest rating</option>
        </select>
      </div>
      <div className="flex items-end">
        <label className="inline-flex items-center gap-2 text-sm h-10">
          <input type="checkbox" checked={refundable} onChange={(e) => setRefundable(e.target.checked)} className="rounded border-border" />
          Refundable only
        </label>
      </div>
    </div>
  );

  if (hero) {
    return (
      <form onSubmit={submit}>
        <HeroBand
          title="Stays your customers"
          accent="will love."
          subtitle="Global wholesale rates · every board type · rooms & occupancy per your booking"
          ghost="stay"
          img={heroImg}
        />

        <HeroBar>
          <HeroCell eyebrow="Destination" grow>
            <CitySearchCombobox bare label="Going to" value={city} onChange={setCity} placeholder="Search destination" />
          </HeroCell>
          <HeroCell eyebrow="Check-in">
            <input type="date" value={checkin} onChange={(e) => { setCheckin(e.target.value); setDateError(null); }} className={heroControl} aria-label="Check-in" />
          </HeroCell>
          <HeroCell eyebrow="Check-out">
            <input type="date" value={checkout} min={checkin} onChange={(e) => { setCheckout(e.target.value); setDateError(null); }} className={heroControl} aria-label="Check-out" />
          </HeroCell>
          <HeroCell eyebrow="Rooms">
            <select value={rooms} onChange={(e) => setRooms(e.target.value)} className={heroControl} aria-label="Rooms">
              {[1,2,3,4].map((n) => <option key={n} value={n}>{n} Room{n > 1 ? 's' : ''}</option>)}
            </select>
          </HeroCell>
          <HeroCell eyebrow="Adults / room">
            <select value={adults} onChange={(e) => setAdults(e.target.value)} className={heroControl} aria-label="Adults per room">
              {[1,2,3,4].map((n) => <option key={n} value={n}>{n} Adult{n > 1 ? 's' : ''}</option>)}
            </select>
          </HeroCell>
          <HeroCell eyebrow="Children">
            <select value={children} onChange={(e) => setChildren(e.target.value)} className={heroControl} aria-label="Children per room">
              {[0,1,2,3].map((n) => <option key={n} value={n}>{n === 0 ? 'None' : n}</option>)}
            </select>
          </HeroCell>
          <HeroSubmit><Search className="w-4 h-4" />Search</HeroSubmit>
        </HeroBar>

        <div className="mx-auto max-w-7xl px-6 mt-3.5 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <HeroChip active={showFilters} onClick={() => setShowFilters((s) => !s)}>
              <SlidersHorizontal className="w-3.5 h-3.5" />{showFilters ? 'Hide filters' : 'Filters & sort'}
            </HeroChip>
            <HeroChip active={refundable} onClick={() => setRefundable((v) => !v)}>
              {refundable && <Check className="w-3.5 h-3.5" />}Refundable only
            </HeroChip>
            {dateError
              ? <p className="text-sm text-danger-500" role="alert">{dateError}</p>
              : <p className="ml-auto text-[11.5px] text-[rgb(var(--text-tertiary))]">Rates via Hotelbeds wholesale</p>}
          </div>
          {showFilters && filterPanel(true)}
        </div>
      </form>
    );
  }

  return (
    <Card plain>
      <CardContent className="pt-6 space-y-4">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr_1fr_auto] lg:items-end">
            <CitySearchCombobox label="Going to" value={city} onChange={setCity} placeholder="Search destination" />
            <div>
              <Label>Check-in</Label>
              <Input type="date" value={checkin} onChange={(e) => { setCheckin(e.target.value); setDateError(null); }} />
            </div>
            <div>
              <Label>Check-out</Label>
              <Input type="date" value={checkout} min={checkin} onChange={(e) => { setCheckout(e.target.value); setDateError(null); }} />
            </div>
            <Button type="submit" className="gap-2"><Search className="w-4 h-4" />Search Hotels</Button>
          </div>
          {dateError && (
            <p className="text-sm text-danger-500 -mt-1" role="alert">{dateError}</p>
          )}
          <div className="grid gap-4 sm:grid-cols-3 max-w-lg">
            <div>
              <Label>Rooms</Label>
              <select value={rooms} onChange={(e) => setRooms(e.target.value)} className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm">
                {[1,2,3,4].map((n) => <option key={n} value={n}>{n} room{n > 1 ? 's' : ''}</option>)}
              </select>
            </div>
            <div>
              <Label>Adults / room</Label>
              <select value={adults} onChange={(e) => setAdults(e.target.value)} className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm">
                {[1,2,3,4].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <Label>Children / room</Label>
              <select value={children} onChange={(e) => setChildren(e.target.value)} className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm">
                {[0,1,2,3].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          <div>
            <button type="button" onClick={() => setShowFilters((s) => !s)} className="inline-flex items-center gap-1.5 text-xs font-medium text-crimson-700 hover:underline">
              <SlidersHorizontal className="w-3.5 h-3.5" /> {showFilters ? 'Hide filters' : 'Filters & sort'}
            </button>
          </div>

          {showFilters && filterPanel(false)}
        </form>
      </CardContent>
    </Card>
  );
}
