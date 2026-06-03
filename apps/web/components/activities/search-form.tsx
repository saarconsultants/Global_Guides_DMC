'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { CitySearchCombobox } from '@/components/common/city-search-combobox';

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
    const params = new URLSearchParams({ city, from, to, adults });
    router.push(`/activities?${params}` as any);
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] lg:items-end">
          <CitySearchCombobox label="Destination" value={city} onChange={setCity} placeholder="Search destination" />
          <div>
            <Label>From date</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label>To date</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <Label>Adults</Label>
            <select value={adults} onChange={(e) => setAdults(e.target.value)} className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm">
              {[1,2,3,4,5,6].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <Button type="submit" className="gap-2"><Search className="w-4 h-4" />Search activities</Button>
        </form>
      </CardContent>
    </Card>
  );
}
