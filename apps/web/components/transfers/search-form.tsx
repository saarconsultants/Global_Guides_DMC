'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { CitySearchCombobox } from '@/components/common/city-search-combobox';

interface Props {
  defaults: { city: string; date: string; adults: string };
}

export function TransferSearchForm({ defaults }: Props) {
  const router = useRouter();
  const [city, setCity] = useState(defaults.city);
  const [date, setDate] = useState(defaults.date);
  const [adults, setAdults] = useState(defaults.adults);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/transfers?${new URLSearchParams({ city, date, adults })}` as any);
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[2fr_1fr_1fr_auto] lg:items-end">
          <CitySearchCombobox label="Destination city" value={city} onChange={setCity} placeholder="Search destination" />
          <div>
            <Label>Pickup date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Passengers</Label>
            <select value={adults} onChange={(e) => setAdults(e.target.value)} className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm">
              {[1,2,3,4,5,6,7,8].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <Button type="submit" className="gap-2"><Search className="w-4 h-4" />Search transfers</Button>
        </form>
      </CardContent>
    </Card>
  );
}
