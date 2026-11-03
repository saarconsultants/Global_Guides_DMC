'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Label } from '@/components/ui/input';
import { SlidersHorizontal, Check } from 'lucide-react';
import { CitySearchCombobox } from '@/components/common/city-search-combobox';
import { RoomsGuestsPicker } from '@/components/common/rooms-guests-picker';
import { COUNTRIES } from '@/lib/countries';
import { encodeRooms } from '@/lib/hotels/occupancy';
import type { Room } from '@/lib/itinerary/types';
import { HeroBand, HeroBar, HeroCell, HeroSubmit, HeroChip, HeroDate, heroControl } from '@/components/ui/hero-search';

interface Props {
  defaults: {
    city: string; checkin: string; checkout: string;
    rooms: Room[];
    nationality?: string; residence?: string;
    star?: string; board?: string; refundable?: string; sort?: string;
  };
  heroImg?: string | null;
}

export function HotelSearchForm({ defaults, heroImg }: Props) {
  const router = useRouter();
  const [city, setCity] = useState(defaults.city);
  const [checkin, setCheckin] = useState(defaults.checkin);
  const [checkout, setCheckout] = useState(defaults.checkout);
  const [rooms, setRooms] = useState<Room[]>(defaults.rooms);
  const [nationality, setNationality] = useState(defaults.nationality ?? 'IN');
  const [residence, setResidence] = useState(defaults.residence ?? 'IN');
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
    const params = new URLSearchParams({ city, checkin, checkout, occ: encodeRooms(rooms), nationality, residence });
    if (star) params.set('star', star);
    if (board) params.set('board', board);
    if (refundable) params.set('refundable', '1');
    if (sort && sort !== 'price-asc') params.set('sort', sort);
    router.push(`/hotels?${params}`);
  }

  const optionCls = 'h-11 sm:h-9 rounded-md border border-border bg-surface pl-2 pr-1 text-[13px] font-semibold text-navy-700';
  const moreOptions = (
    <>
      <label className="inline-flex items-center gap-1.5 text-[13px] text-[rgb(var(--text-secondary))]">Rating
        <select value={star} onChange={(e) => setStar(e.target.value)} className={optionCls}>
          <option value="">Any</option>
          <option value="5">5★ only</option>
          <option value="4">4★ only</option>
          <option value="3">3★ only</option>
          <option value="4plus">4★ &amp; up</option>
        </select>
      </label>
      <label className="inline-flex items-center gap-1.5 text-[13px] text-[rgb(var(--text-secondary))]">Nationality
        <select value={nationality} onChange={(e) => setNationality(e.target.value)} className={`${optionCls} max-w-[160px]`}>
          {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
      </label>
      <label className="inline-flex items-center gap-1.5 text-[13px] text-[rgb(var(--text-secondary))]">Country of residence
        <select value={residence} onChange={(e) => setResidence(e.target.value)} className={`${optionCls} max-w-[160px]`}>
          {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
      </label>
    </>
  );

  const filterPanel = (
    <div className="grid gap-4 sm:grid-cols-3 rounded-lg border border-border-subtle bg-surface p-4 shadow-sm">
      <div>
        <Label>Board</Label>
        <select value={board} onChange={(e) => setBoard(e.target.value)} className="control">
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
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="control">
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

  return (
      <form onSubmit={submit}>
        <HeroBand
          title="Stays your customers"
          accent="will love."
          ghost="stay"
          img={heroImg}
        >
          <p className="mt-3 text-[15px] font-medium text-white max-w-2xl">
            Global wholesale rates · every board type · rooms &amp; occupancy per your booking
          </p>
        </HeroBand>

        <HeroBar>
          <HeroCell eyebrow="Destination" grow>
            <CitySearchCombobox bare label="Going to" value={city} onChange={setCity} placeholder="Search destination" />
          </HeroCell>
          <HeroCell eyebrow="Check-in" className="lg:flex-[1.25]">
            <HeroDate value={checkin} onChange={(v) => { setCheckin(v); setDateError(null); }} label="Check-in" sub="Arrive" />
          </HeroCell>
          <HeroCell eyebrow="Check-out" className="lg:flex-[1.25]">
            <HeroDate value={checkout} min={checkin} onChange={(v) => { setCheckout(v); setDateError(null); }} label="Check-out" sub="Depart" />
          </HeroCell>
          <HeroCell eyebrow="Rooms & guests" className="lg:flex-[1.1]">
            <RoomsGuestsPicker value={rooms} onChange={setRooms} />
          </HeroCell>
          <HeroSubmit caption="Wholesale rates">Search hotels</HeroSubmit>
        </HeroBar>

        <div className="shell mt-3.5 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {moreOptions}
            <HeroChip active={showFilters} onClick={() => setShowFilters((s) => !s)}>
              <SlidersHorizontal className="w-3.5 h-3.5" />{showFilters ? 'Hide filters' : 'Filters & sort'}
            </HeroChip>
            <HeroChip active={refundable} onClick={() => setRefundable((v) => !v)}>
              {refundable && <Check className="w-3.5 h-3.5" />}Refundable only
            </HeroChip>
            {dateError && <p className="text-sm text-danger-500" role="alert">{dateError}</p>}
          </div>
          {showFilters && filterPanel}
        </div>
      </form>
  );
}
