'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

interface Props {
  defaults: { city: string; checkin: string; checkout: string; adults: string };
}

export function HotelSearchForm({ defaults }: Props) {
  const router = useRouter();
  const [city, setCity] = useState(defaults.city);
  const [checkin, setCheckin] = useState(defaults.checkin);
  const [checkout, setCheckout] = useState(defaults.checkout);
  const [adults, setAdults] = useState(defaults.adults);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({ city, checkin, checkout, adults });
    router.push(`/hotels?${params}`);
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] lg:items-end">
          <div>
            <Label>Going to</Label>
            <select value={city} onChange={(e) => setCity(e.target.value)} className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm">
              <option value="PAR">Paris</option>
              <option value="AMS">Amsterdam</option>
              <option value="LON">London</option>
              <option value="ROM">Rome</option>
              <option value="ZRH">Zurich</option>
              <option value="DXB">Dubai</option>
              <option value="BKK">Bangkok</option>
              <option value="SIN">Singapore</option>
              <option value="ISL">Istanbul</option>
              <option value="MLE">Maldives</option>
            </select>
          </div>
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
        </form>
      </CardContent>
    </Card>
  );
}
