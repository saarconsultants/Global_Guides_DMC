'use client';
import { useMemo, useState } from 'react';
import { ArrowLeftRight, Car } from 'lucide-react';
import { CitySearchCombobox } from '@/components/common/city-search-combobox';
import { AirportCodeCell } from '@/components/flights/airport-code-cell';
import { TransferSupplierDetails, TransferSupplierPhoto } from '@/components/itinerary/transfer-supplier-info';
import { useMoney } from '@/components/providers/currency-provider';
import { HeroBand, HeroBar, HeroCell, HeroDate, HeroSubmit, HeroTab, HeroTabs, heroControl } from '@/components/ui/hero-search';
import { Pill } from '@/components/ui/pill';
import { Spinner } from '@/components/ui/spinner';
import { airportByIata } from '@/lib/airports';
import { CITIES } from '@/lib/cities';
import { cityInfo } from '@/lib/itinerary/mock-inventory';
import type { Transfer, TransferVehicle } from '@/lib/itinerary/types';
import { formatDateShort } from '@/lib/utils';

type Mode = 'airport' | 'city' | 'rental';
type VehicleClass = 'ALL' | TransferVehicle;

const CITY_LIST = CITIES.map((c) => ({ code: c.code, name: c.name, country: c.country }));
const CLASSES: Array<{ key: VehicleClass; label: string }> = [
  { key: 'ALL', label: 'All' }, { key: 'SHARED', label: 'Shared' }, { key: 'PRIVATE', label: 'Private' }, { key: 'PRIVATE_PREMIUM', label: 'Premium' },
];
const inDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const classLabel = (v: TransferVehicle) => (v === 'PRIVATE_PREMIUM' ? 'Private Premium' : v === 'PRIVATE' ? 'Private' : 'Shared shuttle');

/** Browse live transfers and cars with driver. Booking happens from a trip, like activities. */
export function TransferSearch({ heroImg }: { heroImg?: string | null }) {
  const money = useMoney();
  const [mode, setMode] = useState<Mode>('airport');
  const [fromAirport, setFromAirport] = useState(true);
  const [airport, setAirport] = useState('DEL');
  const [city, setCity] = useState('DEL');
  const [fromCity, setFromCity] = useState('DEL');
  const [date, setDate] = useState(inDays(30));
  const [time, setTime] = useState('12:00');
  const [hours, setHours] = useState('8');
  const [passengers, setPassengers] = useState('2');
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [results, setResults] = useState<Transfer[]>([]);
  const [vehicleClass, setVehicleClass] = useState<VehicleClass>('ALL');

  function pickCity(code: string) {
    setCity(code);
    // Most people want the city's own airport; they can still change it.
    if (mode === 'airport') setAirport(cityInfo(code).airportCode);
  }

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setState('loading');
    setVehicleClass('ALL');
    const pax = parseInt(passengers, 10) || 1;
    try {
      const r = mode === 'rental'
        ? await fetch('/api/search-rentals', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cityCode: city, hotel: { name: `${cityInfo(city).name} centre` }, pickupDate: date, pickupTime: time, hours: parseInt(hours, 10), passengers: pax }) }).then((x) => x.json())
        : await fetch('/api/search-transfers', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mode === 'city'
              ? { kind: 'inter-city', fromCityCode: fromCity, cityCode: city, pickupDate: date, pickupTime: time, adults: pax }
              : { kind: fromAirport ? 'arrival' : 'departure', airportCode: airport, airportName: airportByIata(airport)?.name, cityCode: city, pickupDate: date, pickupTime: time, adults: pax }) }).then((x) => x.json());
      if (!r.ok) { setState('error'); setResults([]); return; }
      setResults(r.rentals ?? r.alternatives ?? []);
      setState('done');
    } catch {
      setState('error');
      setResults([]);
    }
  }

  const shown = useMemo(() => (vehicleClass === 'ALL' ? results : results.filter((t) => t.vehicle === vehicleClass)), [results, vehicleClass]);
  const cityCell = (eyebrow: string, value: string, onChange: (c: string) => void) => (
    <HeroCell eyebrow={eyebrow} grow><CitySearchCombobox bare label={eyebrow} value={value} onChange={onChange} cities={CITY_LIST} placeholder="Search city" /></HeroCell>
  );
  const airportCell = <HeroCell eyebrow="Airport" grow><AirportCodeCell code={airport} onPick={setAirport} label="Airport" /></HeroCell>;

  return (
    <div className="pb-12">
      <form onSubmit={search}>
        <HeroBand title="Rides they can count on." subtitle="Live airport transfers, city-to-city rides and cars with a driver." img={heroImg}>
          <HeroTabs>
            <HeroTab active={mode === 'airport'} onClick={() => { setMode('airport'); setState('idle'); }}>Airport</HeroTab>
            <HeroTab active={mode === 'city'} onClick={() => { setMode('city'); setState('idle'); }}>City to city</HeroTab>
            <HeroTab active={mode === 'rental'} onClick={() => { setMode('rental'); setState('idle'); }}>Car with driver</HeroTab>
          </HeroTabs>
        </HeroBand>
        <HeroBar>
          {mode === 'airport' && (fromAirport ? <>{airportCell}{cityCell('To city centre', city, pickCity)}</> : <>{cityCell('From city centre', city, pickCity)}{airportCell}</>)}
          {mode === 'city' && <>{cityCell('From', fromCity, setFromCity)}{cityCell('To', city, setCity)}</>}
          {mode === 'rental' && cityCell('City', city, setCity)}
          <HeroCell eyebrow="Date"><HeroDate value={date} min={inDays(0)} onChange={setDate} label="Pickup date" sub="Pickup" /></HeroCell>
          <HeroCell eyebrow="Time" className="lg:flex-[0.7]">
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required aria-label="Pickup time" className={heroControl} />
          </HeroCell>
          {mode === 'rental' && (
            <HeroCell eyebrow="Hours" className="lg:flex-[0.7]">
              <select value={hours} onChange={(e) => setHours(e.target.value)} className={heroControl} aria-label="Hours">
                {[4, 6, 8, 10, 12, 16, 24].map((h) => <option key={h} value={h}>{h} hours</option>)}
              </select>
            </HeroCell>
          )}
          <HeroCell eyebrow="Passengers" className="lg:flex-[0.8]">
            <select value={passengers} onChange={(e) => setPassengers(e.target.value)} className={heroControl} aria-label="Passengers">
              {Array.from({ length: 16 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </HeroCell>
          <HeroSubmit caption="Live prices">Search</HeroSubmit>
        </HeroBar>
        {mode === 'airport' && (
          <div className="shell mt-3.5">
            <button type="button" onClick={() => setFromAirport((v) => !v)} className="inline-flex items-center gap-1.5 min-h-9 rounded-md border border-border bg-surface px-3 text-[13px] font-semibold text-navy-700 hover:border-border-strong transition-colors">
              <ArrowLeftRight className="w-3.5 h-3.5" />{fromAirport ? 'Going to the airport instead' : 'Coming from the airport instead'}
            </button>
          </div>
        )}
      </form>

      <div className="shell pt-6 space-y-4">
        {state === 'idle' && <p className="text-sm text-[rgb(var(--text-secondary))]">Search a route to see live prices. To add a ride to a customer trip, use <span className="font-bold text-ink">Add transfer</span> or <span className="font-bold text-ink">Car with driver</span> on a day in the builder.</p>}
        {state === 'loading' && <p role="status" className="py-10 text-center text-sm text-[rgb(var(--text-secondary))]"><Spinner size="sm" className="inline mr-2" />Searching live rides…</p>}
        {state === 'error' && <p role="alert" className="rounded-md border border-warning-500/30 bg-amber-50 text-amber-700 px-3 py-2 text-sm">Live prices couldn&apos;t load. Try again in a minute.</p>}
        {state === 'done' && results.length === 0 && (
          <p className="py-10 text-center text-sm text-[rgb(var(--text-secondary))]">No live rides for this route on {formatDateShort(date)}. Try another date or route.</p>
        )}
        {state === 'done' && results.length > 0 && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Vehicle class">
                {CLASSES.map((c) => {
                  const count = c.key === 'ALL' ? results.length : results.filter((t) => t.vehicle === c.key).length;
                  return (
                    <button key={c.key} type="button" aria-pressed={vehicleClass === c.key} onClick={() => setVehicleClass(c.key)}
                      className={`min-h-9 px-3 rounded-md border text-[13px] font-semibold transition-colors ${vehicleClass === c.key ? 'border-crimson-700 bg-crimson-50 text-crimson-700' : 'border-border bg-surface text-ink-soft hover:border-border-strong'}`}>
                      {c.label} <span className="tnum font-bold">{count}</span>
                    </button>
                  );
                })}
              </div>
              <Pill variant="live">{results.length} with live prices</Pill>
            </div>
            {shown.length === 0 && <p className="py-8 text-center text-sm text-[rgb(var(--text-secondary))]">No {CLASSES.find((c) => c.key === vehicleClass)?.label.toLowerCase()} rides on this route right now.</p>}
            <ul className="space-y-3">
              {shown.map((t) => (
                <li key={t.id} className="p-4 rounded-lg border border-border-subtle bg-surface shadow-sm flex items-start justify-between gap-4">
                  <TransferSupplierPhoto info={t.supplierInfo} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink inline-flex items-center gap-2"><Car className="w-4 h-4 text-crimson-700" />{t.kind === 'rental' ? t.leamigoRental?.vehicleName : classLabel(t.vehicle)}</p>
                    <p className="text-xs text-[rgb(var(--text-secondary))] mt-0.5">{t.fromName} → {t.toName}</p>
                    <TransferSupplierDetails info={t.supplierInfo} />
                  </div>
                  <p className="money text-[17px] text-ink shrink-0">{money(t.pricePaise)}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
