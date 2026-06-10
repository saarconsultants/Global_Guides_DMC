'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowRightLeft, Search } from 'lucide-react';
import { AirportCombobox } from './airport-combobox';

interface Props {
  defaults: { from: string; to: string; date: string; adults: string; cabin: string; rdate?: string };
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
  // Round-trip only applies to standalone browsing. When attaching a single
  // leg to an itinerary (returnTo set), force one-way to keep the flow simple.
  const [roundTrip, setRoundTrip] = useState(!!defaults.rdate && !returnTo);
  const [rdate, setRdate] = useState(defaults.rdate ?? defaults.date);
  const [dateError, setDateError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (roundTrip && !returnTo && new Date(rdate) < new Date(date)) {
      setDateError('Return date must be on or after the departure date.');
      return;
    }
    const params = new URLSearchParams({ from, to, date, adults, cabin });
    if (directOnly) params.set('directOnly', '1');
    if (roundTrip && !returnTo) params.set('rdate', rdate);
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
        {!returnTo && (
          <div className="flex items-center gap-2 mb-4">
            {(['oneway', 'round'] as const).map((t) => {
              const active = (t === 'round') === roundTrip;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setRoundTrip(t === 'round')}
                  className={`px-3 h-8 rounded-full text-xs font-medium border transition-colors ${active ? 'bg-crimson-900 text-white border-crimson-900' : 'bg-surface text-navy-700 border-border hover:bg-navy-50'}`}
                >
                  {t === 'round' ? 'Round-trip' : 'One-way'}
                </button>
              );
            })}
          </div>
        )}
        <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[1fr_auto_1fr_1fr_1fr_1fr_auto] lg:items-end">
          <AirportCombobox label="From" value={from} onChange={setFrom} placeholder="City or airport" />
          <button type="button" onClick={swap} className="inline-flex justify-self-start h-10 w-10 items-center justify-center rounded-full border border-border hover:bg-navy-50 transition-colors cursor-pointer mb-0.5" aria-label="Swap from/to">
            <ArrowRightLeft className="w-4 h-4 text-navy-700" />
          </button>
          <AirportCombobox label="To" value={to} onChange={setTo} placeholder="City or airport" iconRotate />
          <div>
            <Label>{roundTrip && !returnTo ? 'Depart' : 'Travel date'}</Label>
            <Input type="date" value={date} onChange={(e) => { setDate(e.target.value); setDateError(null); }} />
          </div>
          {roundTrip && !returnTo && (
            <div>
              <Label>Return</Label>
              <Input type="date" value={rdate} min={date} onChange={(e) => { setRdate(e.target.value); setDateError(null); }} />
            </div>
          )}
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
        {dateError && (
          <p className="mt-3 text-sm text-danger-500" role="alert">{dateError}</p>
        )}
        <label className="mt-4 inline-flex items-center gap-2 text-sm text-[rgb(var(--text-secondary))] cursor-pointer">
          <input type="checkbox" checked={directOnly} onChange={(e) => setDirectOnly(e.target.checked)} className="rounded border-border" />
          Direct flights only
        </label>
      </CardContent>
    </Card>
  );
}
