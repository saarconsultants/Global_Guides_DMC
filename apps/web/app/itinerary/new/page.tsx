'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { composeItineraryAction } from '@/app/actions/compose-itinerary';
import { useItineraryStore } from '@/lib/itinerary/store';
import { findCity, findCityCodeByName } from '@/lib/cities';
import type { IntakeForm, StarRating, Room } from '@/lib/itinerary/types';
import { AiSuggestModal } from '@/components/itinerary/ai-suggest-modal';
import { SortableDestinationRow } from '@/components/itinerary/sortable-destination-row';
import { AirportCombobox } from '@/components/flights/airport-combobox';
import { airportByIata } from '@/lib/airports';
import { Sparkles, Plus, X, Calendar, Users, Star, Car } from 'lucide-react';
import { RouteCode } from '@/components/ui/pass';
import { Stepper } from '@/components/itinerary/stepper';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';

interface DestRow { id: string; cityCode: string; nights: number }
let _idCounter = 0;
const newId = () => `d${++_idCounter}`;

export default function NewItineraryPage() {
  return <Suspense fallback={null}><NewItineraryForm /></Suspense>;
}

function NewItineraryForm() {
  const router = useRouter();
  const params = useSearchParams();
  const upsert = useItineraryStore((s) => s.upsert);

  const [destinations, setDestinations] = useState<DestRow[]>([
    { id: newId(), cityCode: 'PAR', nights: 3 },
    { id: newId(), cityCode: 'AMS', nights: 2 },
  ]);
  const [leavingFromCode, setLeavingFromCode] = useState('BOM');
  const [nationality, setNationality] = useState('IN');
  const [departureDate, setDepartureDate] = useState(defaultDate());
  const [rooms, setRooms] = useState<Room[]>([{ adults: 2, children: 0 }]);
  const [starRating, setStarRating] = useState<StarRating | undefined>(4);
  const [addTransfers, setAddTransfers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiUsed, setAiUsed] = useState(false);

  // Arriving from the home-page pass (?ai=1&dest=&nights=&date=&adults=&from=):
  // prefill what we can and open the AI sheet straight away.
  const paramDefaults = useMemo(() => ({
    destinationsText: params.get('dest') || undefined,
    totalNights: params.get('nights') ? parseInt(params.get('nights')!, 10) : undefined,
    departureDate: params.get('date') || undefined,
    originIATA: params.get('from') || undefined,
    adults: params.get('adults') ? parseInt(params.get('adults')!, 10) : undefined,
  }), [params]);
  useEffect(() => {
    if (paramDefaults.departureDate) setDepartureDate(paramDefaults.departureDate);
    if (paramDefaults.originIATA) setLeavingFromCode(paramDefaults.originIATA);
    if (paramDefaults.adults) setRooms([{ adults: paramDefaults.adults, children: 0 }]);
    if (params.get('ai') === '1') setAiOpen(true);
    else if (paramDefaults.destinationsText) {
      // Arriving from a hotel or flight result (?dest=PAR or ?dest=Paris):
      // start the trip with that city instead of the sample route.
      const codes = paramDefaults.destinationsText.split(',')
        .map((t) => t.trim()).filter(Boolean)
        .map((t) => findCity(t)?.code ?? findCityCodeByName(t))
        .filter((c): c is string => !!c);
      const unique = [...new Set(codes)];
      if (unique.length) {
        const n = paramDefaults.totalNights && paramDefaults.totalNights > 0 ? paramDefaults.totalNights : 3;
        setDestinations(unique.map((c, i) => ({ id: newId(), cityCode: c, nights: i === 0 ? n : 2 })));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function addDest() {
    setDestinations((d) => {
      const taken = new Set(d.map((x) => x.cityCode));
      const next = ['ROM','BCN','LON','DXB','BKK','SIN','MLE','ZRH','BER','LIS'].find((c) => !taken.has(c)) ?? 'PAR';
      return [...d, { id: newId(), cityCode: next, nights: 2 }];
    });
  }
  function removeDest(id: string) { setDestinations((d) => d.length > 1 ? d.filter((x) => x.id !== id) : d); }
  function updateDest(id: string, patch: Partial<DestRow>) { setDestinations((d) => d.map((x) => x.id === id ? { ...x, ...patch } : x)); }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setDestinations((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
  }

  function updateRoom(i: number, patch: Partial<Room>) { setRooms((rs) => rs.map((r, idx) => idx === i ? { ...r, ...patch } : r)); }
  function addRoom() { setRooms((rs) => rs.length < 5 ? [...rs, { adults: 1, children: 0, childAges: [] }] : rs); }
  function removeRoom(i: number) { setRooms((rs) => rs.length > 1 ? rs.filter((_, idx) => idx !== i) : rs); }

  const [composing, setComposing] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (destinations.length === 0) { setError('Please add at least one destination.'); return; }
    if (!departureDate) { setError('Please pick a departure date.'); return; }
    const totalAdults = rooms.reduce((s, r) => s + r.adults, 0);
    if (totalAdults < 1) { setError('At least 1 adult required.'); return; }

    const intake: IntakeForm = {
      destinations: destinations.map((d) => {
        const c = findCity(d.cityCode);
        return { cityCode: d.cityCode, cityName: c?.name ?? d.cityCode, countryCode: c?.countryCode ?? '', nights: d.nights };
      }),
      leavingFromCode,
      leavingFromName: airportByIata(leavingFromCode)?.city ?? leavingFromCode,
      nationality, departureDate, rooms, starRating, addTransfers,
    };
    setComposing(true);
    try {
      const itin = await composeItineraryAction(intake);
      upsert(itin);
      router.push(`/itinerary/${itin.id}/customize`);
    } catch (err: any) {
      console.error('[itinerary-new] compose failed', err);
      setError('We couldn\'t build this trip just now. Please try again in a minute.');
      setComposing(false);
    }
  }

  const totalNights = destinations.reduce((s, d) => s + d.nights, 0);
  const usedCodes = destinations.map((d) => d.cityCode);

  const totalAdults = rooms.reduce((s, r) => s + r.adults, 0);
  const totalChildren = rooms.reduce((s, r) => s + (r.children ?? 0), 0);
  const codes = destinations.map((d) => d.cityCode);
  const departLabel = departureDate ? new Date(departureDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() : '—';

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 lg:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <Stepper step={1} />
          <h1 className="mt-3 text-[28px] leading-[1.1] font-extrabold tracking-[-0.02em] text-ink">Where are they going?</h1>
          <p className="mt-2 text-[14.5px] text-[rgb(var(--text-secondary))] max-w-xl">Cities and nights first. We fetch live rooms, transfers and a day-by-day plan; you tune it in the builder.</p>
        </div>
        <Button variant="outline" type="button" onClick={() => setAiOpen(true)} className="gap-1.5"><Sparkles className="w-4 h-4" />Build it with AI</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] items-start">
        <form onSubmit={submit} className="rounded-lg bg-surface border border-border-subtle shadow-sm overflow-hidden">
          <section className="p-5 lg:p-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-[16px] font-extrabold text-ink">Destinations</h2>
              <p className="text-[12.5px] text-[rgb(var(--text-secondary))]">Drag to reorder · <span className="text-success-600 font-bold">Live</span> = full hotel inventory</p>
            </div>
            {aiUsed && (
              <div className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-bold text-crimson-700 bg-crimson-50 px-2.5 py-1 rounded-md">
                <Sparkles className="w-3 h-3" /> Routed by AI. Adjust as needed.
              </div>
            )}
            <div className="mt-3">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={destinations.map((d) => d.id)} strategy={verticalListSortingStrategy}>
                  {destinations.map((d, i) => (
                    <SortableDestinationRow
                      key={d.id}
                      id={d.id}
                      index={i}
                      cityCode={d.cityCode}
                      nights={d.nights}
                      disabledCodes={usedCodes}
                      onChangeCity={(c) => updateDest(d.id, { cityCode: c })}
                      onChangeNights={(n) => updateDest(d.id, { nights: n })}
                      onRemove={() => removeDest(d.id)}
                      canRemove={destinations.length > 1}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <button type="button" onClick={addDest} className="text-[13.5px] font-bold text-crimson-700 hover:underline cursor-pointer inline-flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" />Add another city
              </button>
              <p className="text-[12.5px] text-[rgb(var(--text-secondary))] tnum">{destinations.length} {destinations.length === 1 ? 'city' : 'cities'} · {totalNights} night{totalNights !== 1 ? 's' : ''}</p>
            </div>
          </section>

          <div className="perf-x mx-5" />

          <section className="p-5 lg:p-6">
            <h2 className="text-[16px] font-extrabold text-ink mb-4">Trip details</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <AirportCombobox value={leavingFromCode} onChange={setLeavingFromCode} label="Leaving from" placeholder="City or airport" />
              </div>
              <div>
                <Label required>Nationality</Label>
                <select value={nationality} onChange={(e) => setNationality(e.target.value)} className="control">
                  <option value="IN">India</option><option value="US">United States</option><option value="GB">United Kingdom</option><option value="AE">United Arab Emirates</option>
                </select>
              </div>
              <div>
                <Label required>Leaving on</Label>
                <div className="relative h-11 rounded-md border border-border bg-surface px-3.5 flex items-center hover:border-border-strong focus-within:border-crimson-700 focus-within:ring-2 focus-within:ring-crimson-700/15 transition-colors">
                  <span className="font-mono text-[15px] font-bold text-ink tnum">{departLabel}</span>
                  <Calendar className="w-4 h-4 ml-auto text-[rgb(var(--text-tertiary))]" />
                  <input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} min={new Date().toISOString().slice(0, 10)} aria-label="Leaving on" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
              </div>
              <div>
                <Label>Hotel standard</Label>
                <select value={starRating ?? ''} onChange={(e) => setStarRating(e.target.value ? Number(e.target.value) as StarRating : undefined)} className="control">
                  <option value="">Any</option><option value="3">3 star</option><option value="4">4 star</option><option value="5">5 star</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <Label required>Travellers</Label>
                <div className="space-y-2">
                  {rooms.map((r, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3.5 py-2.5 bg-surface-2 rounded-md border border-border-subtle">
                      <span className="label w-full sm:w-auto sm:mr-auto">Room {i + 1}</span>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-[12px] font-semibold text-[rgb(var(--text-secondary))]">Adults</span>
                        <Stepper2 value={r.adults} min={1} onChange={(v) => updateRoom(i, { adults: v })} />
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-[12px] font-semibold text-[rgb(var(--text-secondary))]">Children</span>
                        <Stepper2 value={r.children} min={0} max={4} onChange={(v) => updateRoom(i, { children: v, childAges: Array.from({ length: v }, (_, k) => r.childAges?.[k] ?? 8) })} />
                      </div>
                      {r.children > 0 && (
                        <div className="w-full flex flex-wrap items-center gap-2">
                          <span className="text-[12px] font-semibold text-[rgb(var(--text-secondary))]">Child ages at travel</span>
                          {Array.from({ length: r.children }, (_, k) => (
                            <select
                              key={k}
                              aria-label={`Room ${i + 1} child ${k + 1} age`}
                              value={r.childAges?.[k] ?? 8}
                              onChange={(e) => updateRoom(i, { childAges: Array.from({ length: r.children }, (_, m) => (m === k ? parseInt(e.target.value, 10) : r.childAges?.[m] ?? 8)) })}
                              className="h-9 rounded-md border border-border bg-surface px-2 text-[13px] font-semibold"
                            >
                              {Array.from({ length: 18 }, (_, age) => <option key={age} value={age}>{age === 0 ? 'Under 1' : `${age} yrs`}</option>)}
                            </select>
                          ))}
                        </div>
                      )}
                      <button type="button" onClick={() => removeRoom(i)} disabled={rooms.length <= 1} className="text-[rgb(var(--text-tertiary))] hover:text-danger-500 disabled:opacity-30 w-7 h-7 inline-flex items-center justify-center rounded-md ml-auto sm:ml-0" aria-label="Remove room">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {rooms.length < 5 && <button type="button" onClick={addRoom} className="text-[13.5px] font-bold text-crimson-700 hover:underline cursor-pointer inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" />Add room</button>}
                </div>
              </div>
              <label className="sm:col-span-2 inline-flex items-center gap-2.5 text-[14px] font-semibold text-ink cursor-pointer select-none">
                <input type="checkbox" checked={addTransfers} onChange={(e) => setAddTransfers(e.target.checked)} className="w-4 h-4 rounded border-border accent-[#A8172E]" />
                Include private transfers between airport, hotels and cities
              </label>
            </div>
            {error && <div className="mt-4 rounded-md bg-danger-100 text-danger-500 px-3.5 py-2.5 text-sm font-semibold" role="alert">{error}</div>}
          </section>

          <div className="bg-surface-2 border-t-2 border-dashed border-border px-5 lg:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-[rgb(var(--text-secondary))] tnum"><span className="font-bold text-ink">{destinations.length} {destinations.length === 1 ? 'city' : 'cities'}</span> · {totalNights} nights · {totalAdults} adult{totalAdults !== 1 ? 's' : ''}{totalChildren ? ` · ${totalChildren} child${totalChildren !== 1 ? 'ren' : ''}` : ''} · from {leavingFromCode}</p>
            <Button type="submit" disabled={composing} size="lg" className="gap-2">{composing ? 'Fetching live rooms…' : 'Continue to builder'}</Button>
          </div>
        </form>

        {/* Live pass preview: the object being built, updating as they type. */}
        <aside className="lg:sticky lg:top-24">
          <div className="rounded-lg bg-surface border border-border-subtle shadow-sm overflow-hidden">
            <div className="bg-ink text-white px-5 py-4 flex items-center justify-between">
              <span className="label text-white/60">Trip pass · draft</span>
              <img src="/brand/ggdmc-logo-white.svg" alt="" className="h-5 w-auto opacity-90" />
            </div>
            <div className="px-5 py-4">
              <RouteCode codes={[leavingFromCode, ...codes]} />
              <ul className="mt-4 space-y-2.5">
                {destinations.map((d, i) => {
                  const c = findCity(d.cityCode);
                  return (
                    <li key={d.id} className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-[5px] bg-navy-50 text-navy-700 font-mono text-[11px] font-bold inline-flex items-center justify-center tnum">{i + 1}</span>
                      <span className="flex-1 min-w-0"><span className="block text-[14px] font-bold text-ink truncate">{c?.name ?? d.cityCode}</span><span className="block text-[12px] text-[rgb(var(--text-secondary))]">{c?.country ?? ''}</span></span>
                      <span className="font-mono text-[12.5px] font-bold text-ink tnum">{d.nights}N</span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="perf-x mx-4" />
            <div className="px-5 py-4 grid grid-cols-2 gap-3">
              <div><div className="label inline-flex items-center gap-1"><Calendar className="w-3 h-3" />Depart</div><div className="mt-1 font-mono text-[14px] font-bold text-ink tnum">{departLabel}</div></div>
              <div><div className="label inline-flex items-center gap-1"><Users className="w-3 h-3" />Travellers</div><div className="mt-1 text-[14px] font-bold text-ink tnum">{totalAdults} adult{totalAdults !== 1 ? 's' : ''}{totalChildren ? `, ${totalChildren} child` : ''}</div></div>
              <div><div className="label inline-flex items-center gap-1"><Star className="w-3 h-3" />Hotels</div><div className="mt-1 text-[14px] font-bold text-ink">{starRating ? `${starRating} star` : 'Any standard'}</div></div>
              <div><div className="label inline-flex items-center gap-1"><Car className="w-3 h-3" />Transfers</div><div className="mt-1 text-[14px] font-bold text-ink">{addTransfers ? 'Private, included' : 'Not included'}</div></div>
            </div>
            <div className="bg-surface-2 px-5 py-3 text-[12px] text-[rgb(var(--text-secondary))] border-t border-border-subtle">Prices appear in the builder once live rooms are fetched. Nothing is booked until you confirm.</div>
          </div>
        </aside>
      </div>

      <AiSuggestModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        /* Inherit whatever the agent already filled in on this page (home-page pass params win). */
        defaults={{
          destinationsText: paramDefaults.destinationsText ?? destinations.map((d) => findCity(d.cityCode)?.name ?? d.cityCode).join(', '),
          totalNights: paramDefaults.totalNights ?? destinations.reduce((s, d) => s + d.nights, 0),
          departureDate,
          originIATA: leavingFromCode,
          adults: totalAdults,
          children: totalChildren,
          budget: starRating === 5 ? 'luxury' : starRating === 4 ? 'premium' : 'standard',
        }}
        onApply={(cities) => {
          setDestinations(cities.map((c) => ({ id: newId(), cityCode: c.cityCode, nights: c.nights })));
          setAiUsed(true);
        }}
        onTrip={(itin) => {
          upsert(itin);
          router.push(`/itinerary/${itin.id}/customize`);
        }}
      />
    </div>
  );
}

function Stepper2({ value, onChange, min = 0, max = 9 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="inline-flex items-center bg-surface rounded-md border border-border overflow-hidden">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} className="w-8 h-8 inline-flex items-center justify-center hover:bg-navy-50 cursor-pointer disabled:opacity-30 font-bold" disabled={value <= min} aria-label="Decrease">−</button>
      <span className="w-7 text-center font-mono text-[13px] font-bold tnum">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} className="w-8 h-8 inline-flex items-center justify-center hover:bg-navy-50 cursor-pointer disabled:opacity-30 font-bold" disabled={value >= max} aria-label="Increase">+</button>
    </div>
  );
}

function defaultDate() {
  const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString().slice(0, 10);
}
