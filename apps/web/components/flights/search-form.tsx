'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plane, ArrowRightLeft, Search } from 'lucide-react';

interface Props {
  defaults: { from: string; to: string; date: string; adults: string; cabin: string };
  returnTo?: string;
  leg?: 'outbound' | 'return';
}

export function FlightSearchForm({ defaults, returnTo, leg }: Props) {
  const router = useRouter();
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [date, setDate] = useState(defaults.date);
  const [adults, setAdults] = useState(defaults.adults);
  const [cabin, setCabin] = useState(defaults.cabin);
  const [directOnly, setDirectOnly] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({ from, to, date, adults, cabin });
    if (directOnly) params.set('directOnly', '1');
    if (returnTo) params.set('returnTo', returnTo);
    if (leg) params.set('leg', leg);
    router.push(`/flights?${params}`);
  }

  function swap() {
    setFrom(to);
    setTo(from);
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[1fr_auto_1fr_1fr_1fr_1fr_auto] lg:items-end">
          <div>
            <Label>From (IATA)</Label>
            <div className="relative">
              <Plane className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--text-tertiary))]" />
              <Input value={from} maxLength={3} onChange={(e) => setFrom(e.target.value.toUpperCase())} className="pl-9 uppercase font-mono" />
            </div>
          </div>
          <button type="button" onClick={swap} className="hidden lg:inline-flex h-10 w-10 items-center justify-center rounded-full border border-border hover:bg-navy-50 transition-colors cursor-pointer" aria-label="Swap from/to">
            <ArrowRightLeft className="w-4 h-4 text-navy-700" />
          </button>
          <div>
            <Label>To (IATA)</Label>
            <div className="relative">
              <Plane className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--text-tertiary))] rotate-90" />
              <Input value={to} maxLength={3} onChange={(e) => setTo(e.target.value.toUpperCase())} className="pl-9 uppercase font-mono" />
            </div>
          </div>
          <div>
            <Label>Travel date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Adults</Label>
            <select value={adults} onChange={(e) => setAdults(e.target.value)} className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm">
              {[1,2,3,4,5,6,7,8,9].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <Label>Cabin</Label>
            <select value={cabin} onChange={(e) => setCabin(e.target.value)} className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm">
              <option value="ECONOMY">Economy</option>
              <option value="PREMIUM_ECONOMY">Premium Economy</option>
              <option value="BUSINESS">Business</option>
              <option value="FIRST">First</option>
            </select>
          </div>
          <Button type="submit" className="gap-2"><Search className="w-4 h-4" />Search</Button>
        </form>
        <label className="mt-4 inline-flex items-center gap-2 text-sm text-[rgb(var(--text-secondary))] cursor-pointer">
          <input type="checkbox" checked={directOnly} onChange={(e) => setDirectOnly(e.target.checked)} className="rounded border-border" />
          Direct flights only
        </label>
      </CardContent>
    </Card>
  );
}
