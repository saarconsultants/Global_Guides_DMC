'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowRightLeft, Search, Check, Plus, Trash2 } from 'lucide-react';
import { PassengerPicker } from './passenger-picker';
import { AIRLINES } from '@/lib/airlines';
import { AirportCombobox } from './airport-combobox';
import { AirportCodeCell, AirportSwapButton } from './airport-code-cell';
import { HeroBand, HeroTabs, HeroTab, HeroBar, HeroCell, HeroSubmit, HeroDate, HeroChip, heroControl } from '@/components/ui/hero-search';

interface Props {
  defaults: {
    from: string; to: string; date: string; adults: string; cabin: string; rdate?: string;
    children?: string; infants?: string; airline?: string; fare?: string; directOnly?: boolean;
    legs?: Array<{ from: string; to: string; date: string }>;
  };
  returnTo?: string;
  leg?: 'outbound' | 'return';
  /** Render as the full-bleed portal hero (standalone browsing). */
  hero?: boolean;
  heroImg?: string | null;
}

const MAX_LEGS = 5;
const FARE_TYPES = [['REGULAR', 'Regular'], ['STUDENT', 'Student'], ['SENIOR_CITIZEN', 'Senior citizen']] as const;

export function FlightSearchForm({ defaults, returnTo, leg, hero, heroImg }: Props) {
  const router = useRouter();
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [date, setDate] = useState(defaults.date);
  const [adults, setAdults] = useState(defaults.adults);
  const [cabin, setCabin] = useState(defaults.cabin);
  const [directOnly, setDirectOnly] = useState(!!defaults.directOnly);
  const [children, setChildren] = useState(parseInt(defaults.children ?? '0', 10) || 0);
  const [infants, setInfants] = useState(parseInt(defaults.infants ?? '0', 10) || 0);
  const [airline, setAirline] = useState(defaults.airline ?? '');
  const [fare, setFare] = useState(defaults.fare ?? 'REGULAR');
  const [multi, setMulti] = useState(!!defaults.legs?.length);
  const [legs, setLegs] = useState(defaults.legs?.length ? defaults.legs : [
    { from: defaults.from, to: defaults.to, date: defaults.date },
    { from: defaults.to, to: '', date: defaults.date },
  ]);
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
    if (multi && !returnTo) {
      if (legs.some((l) => !l.from || !l.to || !l.date)) { setDateError('Fill in every flight.'); return; }
      if (legs.some((l, i) => i > 0 && l.date < legs[i - 1]!.date)) { setDateError('Each flight must be on or after the one before it.'); return; }
    }
    const params = new URLSearchParams(multi && !returnTo ? { adults, cabin } : { from, to, date, adults, cabin });
    if (multi && !returnTo) params.set('legs', legs.map((l) => `${l.from}-${l.to}-${l.date}`).join('|'));
    if (children) params.set('children', String(children));
    if (infants) params.set('infants', String(infants));
    if (airline) params.set('airline', airline);
    if (fare !== 'REGULAR') params.set('fare', fare);
    if (directOnly) params.set('directOnly', '1');
    if (roundTrip && !returnTo && !multi) params.set('rdate', rdate);
    if (returnTo) params.set('returnTo', returnTo);
    if (leg) params.set('leg', leg);
    router.push(`/flights?${params}`);
  }

  function swap() {
    setFrom(to);
    setTo(from);
  }

  const setLeg = (i: number, patch: Partial<{ from: string; to: string; date: string }>) => setLegs((all) => all.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  const passengerPicker = (
    <PassengerPicker
      value={{ adults: parseInt(adults, 10) || 1, children, infants, cabin }}
      onChange={(p) => { setAdults(String(p.adults)); setChildren(p.children); setInfants(p.infants); setCabin(p.cabin); }}
    />
  );

  if (hero && !returnTo) {
    return (
      <form onSubmit={submit}>
        <HeroBand
          title="Book flights and explore"
          accent="the world."
          subtitle="Live consolidator fares · attach legs to any itinerary · one-click branded quotes"
          ghost="wander"
          img={heroImg}
        >
          <HeroTabs>
            <HeroTab active={!roundTrip && !multi} onClick={() => { setRoundTrip(false); setMulti(false); }}>One-way</HeroTab>
            <HeroTab active={roundTrip && !multi} onClick={() => { setRoundTrip(true); setMulti(false); }}>Round-trip</HeroTab>
            <HeroTab active={multi} onClick={() => setMulti(true)}>Multi-city</HeroTab>
          </HeroTabs>
        </HeroBand>

        {multi ? (
          <div className="relative z-20 shell -mt-[60px]">
            <div className="rounded-lg bg-surface border border-border-subtle shadow-md">
              {legs.map((l, i) => (
                <div key={i} className="flex flex-col lg:flex-row border-b border-border-subtle" role="group" aria-label={`Flight ${i + 1}`}>
                  <HeroCell eyebrow={`Flight ${i + 1} from`} grow><AirportCodeCell code={l.from} onPick={(v) => setLeg(i, { from: v })} label={`Flight ${i + 1} from`} /></HeroCell>
                  <HeroCell eyebrow="To" grow><AirportCodeCell code={l.to} onPick={(v) => setLeg(i, { to: v })} label={`Flight ${i + 1} to`} rotate /></HeroCell>
                  <HeroCell eyebrow="Date"><HeroDate value={l.date} min={legs[i - 1]?.date} onChange={(v) => setLeg(i, { date: v })} label={`Flight ${i + 1} date`} sub="Depart" /></HeroCell>
                  <div className="flex items-center justify-end px-3 lg:w-14 py-2 lg:py-0">
                    {legs.length > 2 && <button type="button" aria-label={`Remove flight ${i + 1}`} onClick={() => setLegs((all) => all.filter((_, k) => k !== i))} className="w-11 h-11 inline-flex items-center justify-center rounded-md text-[rgb(var(--text-secondary))] hover:bg-danger-100 hover:text-danger-500 transition-colors"><Trash2 className="w-4 h-4" /></button>}
                  </div>
                </div>
              ))}
              <div className="flex flex-col lg:flex-row lg:items-stretch">
                <div className="flex items-center px-5 py-3 lg:flex-1">
                  {legs.length < MAX_LEGS
                    ? <button type="button" onClick={() => setLegs((all) => [...all, { from: all[all.length - 1]!.to, to: '', date: all[all.length - 1]!.date }])} className="inline-flex items-center gap-1 min-h-9 text-[13.5px] font-bold text-crimson-700 hover:underline"><Plus className="w-4 h-4" />Add flight</button>
                    : <span className="text-xs text-[rgb(var(--text-secondary))]">{MAX_LEGS} flights maximum</span>}
                </div>
                <HeroCell eyebrow="Travellers & cabin" className="lg:flex-1 lg:border-l border-border-subtle">{passengerPicker}</HeroCell>
                <HeroSubmit caption="Live fares">Search flights</HeroSubmit>
              </div>
            </div>
          </div>
        ) : (
        <HeroBar>
          <HeroCell eyebrow="From" grow>
            <AirportCodeCell code={from} onPick={setFrom} label="From" />
            <AirportSwapButton onClick={swap} />
          </HeroCell>
          <HeroCell eyebrow="To" grow className="lg:pl-7">
            <AirportCodeCell code={to} onPick={setTo} label="To" rotate />
          </HeroCell>
          <HeroCell eyebrow={roundTrip ? 'Depart' : 'Travel date'}>
            <HeroDate value={date} onChange={setDate} label="Travel date" sub="Depart" />
          </HeroCell>
          {roundTrip && (
            <HeroCell eyebrow="Return">
              <HeroDate value={rdate} min={date} onChange={setRdate} label="Return date" sub="Return" />
            </HeroCell>
          )}
          <HeroCell eyebrow="Travellers & cabin">{passengerPicker}</HeroCell>
          <HeroSubmit caption="Live fares">Search flights</HeroSubmit>
        </HeroBar>
        )}

        <div className="shell mt-3.5 flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-1.5 text-[13px] text-[rgb(var(--text-secondary))]">Preferred airline
            <select value={airline} onChange={(e) => setAirline(e.target.value)} className="h-11 sm:h-9 max-w-[180px] rounded-md border border-border bg-surface pl-2 pr-1 text-[13px] font-semibold text-navy-700">
              <option value="">Any airline</option>
              {AIRLINES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
            </select>
          </label>
          <span className="text-[13px] text-[rgb(var(--text-secondary))] sm:ml-2">Fare type</span>
          {FARE_TYPES.map(([code, name]) => (
            <HeroChip key={code} active={fare === code} onClick={() => setFare(code)}>{fare === code && <Check className="w-3.5 h-3.5" />}{name}</HeroChip>
          ))}
          <HeroChip active={directOnly} onClick={() => setDirectOnly((v) => !v)}>
            {directOnly && <Check className="w-3.5 h-3.5" />}Direct flights only
          </HeroChip>
          {dateError && <p className="text-sm text-danger-500" role="alert">{dateError}</p>}
        </div>
      </form>
    );
  }

  return (
    <Card plain>
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
                  className={`px-3 h-8 rounded-full text-xs font-medium border transition-colors ${active ? 'bg-crimson-700 text-white border-crimson-900' : 'bg-surface text-navy-700 border-border hover:bg-navy-50'}`}
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
            <select value={adults} onChange={(e) => setAdults(e.target.value)} className="control">
              {[1,2,3,4,5,6,7,8,9].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <Label>Cabin</Label>
            <select value={cabin} onChange={(e) => setCabin(e.target.value)} className="control">
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
