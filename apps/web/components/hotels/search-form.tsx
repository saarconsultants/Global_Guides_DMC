'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, SlidersHorizontal } from 'lucide-react';
import { CitySearchCombobox } from '@/components/common/city-search-combobox';

interface Props {
  defaults: {
    city: string; checkin: string; checkout: string; adults: string;
    star?: string; board?: string; refundable?: string; sort?: string;
  };
}

export function HotelSearchForm({ defaults }: Props) {
  const router = useRouter();
  const [city, setCity] = useState(defaults.city);
  const [checkin, setCheckin] = useState(defaults.checkin);
  const [checkout, setCheckout] = useState(defaults.checkout);
  const [adults, setAdults] = useState(defaults.adults);
  const [star, setStar] = useState(defaults.star ?? '');
  const [board, setBoard] = useState(defaults.board ?? '');
  const [refundable, setRefundable] = useState(defaults.refundable === '1');
  const [sort, setSort] = useState(defaults.sort ?? 'price-asc');
  const [showFilters, setShowFilters] = useState(!!(defaults.star || defaults.board || defaults.refundable === '1'));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({ city, checkin, checkout, adults });
    if (star) params.set('star', star);
    if (board) params.set('board', board);
    if (refundable) params.set('refundable', '1');
    if (sort && sort !== 'price-asc') params.set('sort', sort);
    router.push(`/hotels?${params}`);
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] lg:items-end">
            <CitySearchCombobox label="Going to" value={city} onChange={setCity} placeholder="Search destination" />
            <div>
              <Label>Check-in</Label>
              <Input type="date" value={checkin} onChange={(e) => setCheckin(e.target.value)} />
            </div>
            <div>
              <Label>Check-out</Label>
              <Input type="date" value={checkout} onChange={(e) => setCheckout(e.target.value)} />
            </div>
            <div>
              <Label>Adults</Label>
              <select value={adults} onChange={(e) => setAdults(e.target.value)} className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm">
                {[1,2,3,4,5,6].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <Button type="submit" className="gap-2"><Search className="w-4 h-4" />Search Hotels</Button>
          </div>

          <div>
            <button type="button" onClick={() => setShowFilters((s) => !s)} className="inline-flex items-center gap-1.5 text-xs font-medium text-crimson-700 hover:underline">
              <SlidersHorizontal className="w-3.5 h-3.5" /> {showFilters ? 'Hide filters' : 'Filters & sort'}
            </button>
          </div>

          {showFilters && (
            <div className="grid gap-4 sm:grid-cols-4 pt-1 border-t border-border-subtle">
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
          )}
        </form>
      </CardContent>
    </Card>
  );
}
