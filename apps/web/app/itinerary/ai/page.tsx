'use client';
// Plan a trip with AI — a full page, three steps:
//   1. Brief    — cities, nights, dates, travellers, hotel standard, notes
//   2. Building — live progress streamed from /api/ai-trip?stream=1
//   3. Review   — the priced trip, then "Open in builder"
// Everything the AI picks comes from live inventory menus (see lib/ai/trip-architect).

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/input';
import { CitySearchCombobox } from '@/components/common/city-search-combobox';
import { AirportCombobox } from '@/components/flights/airport-combobox';
import { useMoney } from '@/components/providers/currency-provider';
import { useItineraryStore } from '@/lib/itinerary/store';
import { findCity, findCityCodeByName } from '@/lib/cities';
import type { Itinerary } from '@/lib/itinerary/types';
import {
  Sparkles, Wand2, Check, Loader2, Plane, BedDouble, Ticket, Car, AlertTriangle, ArrowRight, ArrowLeft,
  RotateCcw, X, Route, Search, ListChecks, Star, Minus, Plus, Calendar,
} from 'lucide-react';
import { Stepper } from '@/components/itinerary/stepper';
import { formatDateShort } from '@/lib/utils';

type Step = 'brief' | 'building' | 'review';
type Stage = 'route' | 'inventory' | 'select' | 'compose';
type Budget = 'standard' | 'premium' | 'luxury';

interface Brief {
  cities: string[];          // city codes, in the agent's order
  nights: number;
  date: string;
  from: string;
  adults: number;
  children: number;
  budget: Budget;
  notes: string;
}

const STAGES: Array<{ key: Stage; title: string; sub: string; Icon: typeof Route }> = [
  { key: 'route', title: 'Planning the route', sub: 'Order of cities and nights in each', Icon: Route },
  { key: 'inventory', title: 'Checking live inventory', sub: 'Fares, hotel rooms and activities for your dates', Icon: Search },
  { key: 'select', title: 'Choosing the best options', sub: 'Hotels, activities by time of day, flight timings', Icon: ListChecks },
  { key: 'compose', title: 'Putting it together', sub: 'Day-by-day plan with transfers and prices', Icon: Wand2 },
];

const NOTE_IDEAS = ['Honeymoon', 'Family with young kids', 'Relaxed pace', 'Adventure & outdoors', 'Food & local markets', 'First time abroad'];

const iso = (d: Date) => d.toISOString().slice(0, 10);
const inDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };

export default function AiPlannerPage() {
  return <Suspense fallback={null}><AiPlanner /></Suspense>;
}

function AiPlanner() {
  const params = useSearchParams();
  const router = useRouter();
  const upsert = useItineraryStore((s) => s.upsert);
  const money = useMoney();

  // ── Brief, prefilled from ?dest=&nights=&date=&adults=&children=&from=&budget= ──
  const initial = useMemo<Brief>(() => {
    const cities = (params.get('dest') ?? '').split(',').map((t) => t.trim()).filter(Boolean)
      .map((t) => (t.length === 3 && findCity(t.toUpperCase()) ? t.toUpperCase() : findCityCodeByName(t)))
      .filter((c): c is string => !!c);
    const n = parseInt(params.get('nights') ?? '', 10);
    const b = params.get('budget');
    return {
      cities: [...new Set(cities)],
      nights: Number.isFinite(n) ? Math.min(21, Math.max(2, n)) : 7,
      date: params.get('date') && params.get('date')! >= inDays(1) ? params.get('date')! : inDays(30),
      from: (params.get('from') ?? 'BOM').toUpperCase(),
      adults: Math.min(9, Math.max(1, parseInt(params.get('adults') ?? '2', 10) || 2)),
      children: Math.min(6, Math.max(0, parseInt(params.get('children') ?? '0', 10) || 0)),
      budget: b === 'luxury' || b === 'premium' ? b : 'standard',
      notes: '',
    };
  }, [params]);
  const [brief, setBrief] = useState<Brief>(initial);
  const set = <K extends keyof Brief>(k: K, v: Brief[K]) => setBrief((b) => ({ ...b, [k]: v }));
  const [pick, setPick] = useState('');

  const [step, setStep] = useState<Step>('brief');
  const [stage, setStage] = useState<Stage>('route');
  const [details, setDetails] = useState<Partial<Record<Stage, string>>>({});
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [trip, setTrip] = useState<{ itinerary: Itinerary; summary: string; warnings: string[] } | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (step !== 'building') return;
    const t0 = Date.now();
    const t = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(t);
  }, [step]);
  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [step]);

  const briefError =
    brief.cities.length === 0 ? 'Add at least one destination.'
    : brief.nights < brief.cities.length ? `Give the trip at least ${brief.cities.length} nights — one per city.`
    : brief.date < inDays(1) ? 'Pick a departure date from tomorrow onwards.'
    : null;

  async function build() {
    if (briefError) return;
    setError(null); setTrip(null); setDetails({}); setStage('route'); setElapsed(0); setStep('building');
    const ctrl = new AbortController(); abort.current = ctrl;
    try {
      const res = await fetch('/api/ai-trip?stream=1', {
        method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinationsText: brief.cities.map((c) => findCity(c)?.name ?? c).join(', '),
          totalNights: brief.nights, departureDate: brief.date, adults: brief.adults, children: brief.children,
          originIATA: brief.from || undefined, budget: brief.budget, notes: brief.notes || undefined,
        }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => null);
        throw new Error(res.status === 400 && j?.error ? j.error : "We couldn't build this trip just now. Please try again in a minute.");
      }
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
          if (!line) continue;
          const m = JSON.parse(line);
          if (m.type === 'stage') { setStage(m.stage); if (m.detail) setDetails((d) => ({ ...d, [m.stage]: m.detail })); }
          else if (m.type === 'done') { setTrip({ itinerary: m.itinerary, summary: m.summary, warnings: m.warnings ?? [] }); setStep('review'); return; }
          else if (m.type === 'error') throw new Error(m.error);
        }
      }
      throw new Error("The trip builder stopped before finishing. Please try again.");
    } catch (e: any) {
      if (e?.name === 'AbortError') { setStep('brief'); return; }
      setError(e?.message ?? "We couldn't build this trip just now.");
      setStep('brief');
    }
  }

  function openInBuilder() {
    if (!trip) return;
    upsert(trip.itinerary);
    router.push(`/itinerary/${trip.itinerary.id}/customize`);
  }

  const manualHref = `/itinerary/new?${new URLSearchParams({ dest: brief.cities.join(','), nights: String(brief.nights), date: brief.date, adults: String(brief.adults), from: brief.from })}`;

  return (
    <div className="pb-16">
      {/* Same header pattern as New trip: stepper, then the page title. */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-8 lg:pt-10">
        <Stepper step={(['brief', 'building', 'review'].indexOf(step) + 1) as 1 | 2 | 3} steps={['Brief', 'Building', 'Review']} />
        <h1 className="mt-3 text-[28px] leading-[1.1] font-extrabold tracking-[-0.02em] text-ink">
          {step === 'review' ? 'Your trip is ready to review' : 'Plan a trip with AI'}
        </h1>
        {step !== 'review' && <p className="mt-2 text-[14.5px] text-[rgb(var(--text-secondary))] max-w-xl">Describe the trip. We build it from live hotel rooms, fares and activities; you fine-tune it in the builder.</p>}
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 mt-6">
        {step === 'brief' && (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <section className="rounded-lg bg-surface border border-border-subtle shadow-sm p-5 sm:p-6 space-y-6">
              {error && (
                <div role="alert" className="rounded-md border border-danger-500/30 bg-danger-100 text-danger-500 px-3 py-2.5 text-sm flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error} <Link href={manualHref as any} className="underline font-semibold">Build it manually instead</Link></span>
                </div>
              )}

              <div>
                <Label required>Where are they going?</Label>
                <p className="text-xs text-[rgb(var(--text-secondary))] mb-2">Add cities in any order — the AI can re-order them and decide nights in each.</p>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {brief.cities.map((c, i) => (
                    <span key={c} className="inline-flex items-center gap-1.5 h-9 pl-3 pr-1.5 rounded-md bg-ink text-white text-sm font-bold">
                      <span className="font-mono text-[11px] text-white/60">{i + 1}</span>{findCity(c)?.name ?? c}
                      <button type="button" onClick={() => set('cities', brief.cities.filter((x) => x !== c))} aria-label={`Remove ${findCity(c)?.name ?? c}`} className="w-6 h-6 inline-flex items-center justify-center rounded hover:bg-white/15"><X className="w-3.5 h-3.5" /></button>
                    </span>
                  ))}
                </div>
                <div className="max-w-sm">
                  <CitySearchCombobox
                    label="Add a destination"
                    placeholder={brief.cities.length ? 'Add another city' : 'Search a city, e.g. Paris'}
                    value={pick}
                    onChange={(code) => { if (code && !brief.cities.includes(code)) set('cities', [...brief.cities, code]); setPick(''); }}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label>Total nights</Label>
                  <Counter value={brief.nights} min={2} max={21} onChange={(v) => set('nights', v)} label="nights" />
                </div>
                <div>
                  <Label htmlFor="ai-date">Departure</Label>
                  <div className="relative h-11 rounded-md border border-border bg-surface px-3.5 flex items-center hover:border-border-strong focus-within:border-crimson-700 focus-within:ring-2 focus-within:ring-crimson-700/15 transition-colors">
                    <span className="font-mono text-[15px] font-bold text-ink tnum">{brief.date ? formatDateShort(brief.date) : 'Pick a date'}</span>
                    <Calendar className="w-4 h-4 ml-auto text-[rgb(var(--text-tertiary))]" aria-hidden />
                    <input id="ai-date" type="date" value={brief.date} min={inDays(1)} onChange={(e) => set('date', e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  </div>
                </div>
                <div>
                  <AirportCombobox label="Flying from" value={brief.from} onChange={(v) => set('from', v)} placeholder="City or airport" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Adults</Label>
                  <Counter value={brief.adults} min={1} max={9} onChange={(v) => set('adults', v)} label="adults" />
                </div>
                <div>
                  <Label>Children</Label>
                  <Counter value={brief.children} min={0} max={6} onChange={(v) => set('children', v)} label="children" />
                </div>
              </div>

              <fieldset>
                <legend className="label mb-2">Hotel standard</legend>
                <div className="grid grid-cols-3 gap-2">
                  {([['standard', 'Standard', '3★ and up'], ['premium', 'Premium', '4★'], ['luxury', 'Luxury', '5★']] as const).map(([k, t, s]) => (
                    <button key={k} type="button" aria-pressed={brief.budget === k} onClick={() => set('budget', k)}
                      className={`rounded-md border px-3 py-2.5 text-left transition-[color,background-color,border-color,transform] duration-150 ease-out active:scale-[0.97] ${brief.budget === k ? 'border-ink bg-ink text-white' : 'border-border-subtle hover:border-border-strong'}`}>
                      <span className="block text-sm font-bold">{t}</span>
                      <span className={`block text-xs ${brief.budget === k ? 'text-white/75' : 'text-[rgb(var(--text-secondary))]'}`}>{s}</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <div>
                <Label htmlFor="ai-notes">Anything the AI should know? <span className="font-normal normal-case tracking-normal">(optional)</span></Label>
                <textarea id="ai-notes" value={brief.notes} maxLength={500} onChange={(e) => set('notes', e.target.value)} rows={3}
                  placeholder="e.g. honeymoon, prefers boutique stays, wants a cooking class in Rome"
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {NOTE_IDEAS.map((n) => (
                    <button key={n} type="button" onClick={() => set('notes', brief.notes ? `${brief.notes.replace(/[.\s]+$/, '')}, ${n.toLowerCase()}` : n)}
                      className="min-h-11 sm:min-h-8 px-3 rounded-full border border-border-subtle text-xs font-semibold hover:border-crimson-300">+ {n}</button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-border-subtle">
                <Link href={manualHref as any} className="hit-area text-sm font-semibold text-[rgb(var(--text-secondary))] hover:text-ink">Prefer to build it yourself?</Link>
                <div className="flex flex-col items-stretch sm:items-end gap-1">
                  <Button onClick={build} disabled={!!briefError} className="gap-2 h-11 px-5"><Wand2 className="w-4 h-4" />Build my trip</Button>
                  {briefError && <p className="text-xs text-[rgb(var(--text-secondary))]">{briefError}</p>}
                </div>
              </div>
            </section>

            <aside className="space-y-4 lg:sticky lg:top-24 self-start">
              <div className="rounded-lg bg-surface border border-border-subtle shadow-sm p-5">
                <p className="label">What you&apos;ll get</p>
                <ul className="mt-3 space-y-3 text-sm">
                  {[
                    [Route, 'A routed plan', 'City order and nights that make sense'],
                    [Plane, 'Flights', `Return fares from ${brief.from || 'your city'}`],
                    [BedDouble, 'Hotels', brief.budget === 'luxury' ? '5★ stays' : brief.budget === 'premium' ? '4★ stays' : 'Best-value 3★+ stays'],
                    [Ticket, 'Activities', 'Matched to morning, afternoon or evening'],
                    [Car, 'Transfers', 'Airport and between cities'],
                  ].map(([I, t, s]: any) => (
                    <li key={t} className="flex gap-3"><I className="w-4 h-4 mt-0.5 text-crimson-700 shrink-0" /><span><span className="font-bold text-ink block">{t}</span><span className="text-[rgb(var(--text-secondary))]">{s}</span></span></li>
                  ))}
                </ul>
              </div>
              <p className="text-xs text-[rgb(var(--text-secondary))] px-1">Every hotel, fare and activity comes from live supplier rates — nothing is invented. Nothing is booked until you confirm in the builder.</p>
            </aside>
          </div>
        )}

        {step === 'building' && (
          <section className="mx-auto max-w-2xl rounded-lg bg-surface border border-border-subtle shadow-sm p-6 sm:p-8" aria-live="polite">
            <p className="text-sm text-[rgb(var(--text-secondary))]">
              {brief.cities.map((c) => findCity(c)?.name ?? c).join(' · ')} · {brief.nights} nights · {brief.adults + brief.children} traveller{brief.adults + brief.children !== 1 ? 's' : ''}
            </p>
            <ol className="mt-5 space-y-1">
              {STAGES.map((s, i) => {
                const cur = STAGES.findIndex((x) => x.key === stage);
                const state = i < cur ? 'done' : i === cur ? 'now' : 'next';
                return (
                  <li key={s.key} className={`flex gap-4 rounded-md px-3 py-3 ${state === 'now' ? 'bg-surface-2' : ''}`}>
                    <span className={`w-9 h-9 rounded-full inline-flex items-center justify-center shrink-0 ${state === 'done' ? 'bg-emerald-600 text-white' : state === 'now' ? 'bg-crimson-700 text-white' : 'bg-surface-2 text-[rgb(var(--text-tertiary))]'}`}>
                      {state === 'done' ? <Check className="w-4 h-4" /> : state === 'now' ? <Loader2 className="w-4 h-4 animate-spin" /> : <s.Icon className="w-4 h-4" />}
                    </span>
                    <span className="min-w-0">
                      <span className={`block font-bold ${state === 'next' ? 'text-[rgb(var(--text-tertiary))]' : 'text-ink'}`}>{s.title}</span>
                      <span className="block text-sm text-[rgb(var(--text-secondary))]">{details[s.key] ?? s.sub}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
            <div className="mt-6 flex items-center justify-between text-xs text-[rgb(var(--text-secondary))]">
              <span className="tnum">{elapsed}s · usually under a minute</span>
              <Button variant="ghost" size="sm" onClick={() => abort.current?.abort()}>Cancel</Button>
            </div>
          </section>
        )}

        {step === 'review' && trip && (
          <Review trip={trip} money={money} onOpen={openInBuilder} onRebuild={build} onEdit={() => setStep('brief')} />
        )}
      </div>
    </div>
  );
}

function Counter({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="inline-flex items-center rounded-md border border-border bg-surface h-11 overflow-hidden">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Fewer ${label}`} className="w-11 h-11 inline-flex items-center justify-center disabled:opacity-30 transition-[color,background-color,border-color,transform] duration-150 ease-out active:scale-[0.97]"><Minus className="w-4 h-4" /></button>
      <span className="min-w-[3rem] text-center font-bold tnum" aria-live="polite">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`More ${label}`} className="w-11 h-11 inline-flex items-center justify-center disabled:opacity-30 transition-[color,background-color,border-color,transform] duration-150 ease-out active:scale-[0.97]"><Plus className="w-4 h-4" /></button>
    </div>
  );
}

function Review({ trip, money, onOpen, onRebuild, onEdit }: {
  trip: { itinerary: Itinerary; summary: string; warnings: string[] };
  money: (p: number) => string; onOpen: () => void; onRebuild: () => void; onEdit: () => void;
}) {
  const it = trip.itinerary;
  const out = it.flights, ret = it.flights?.return;
  const flightsPaise = (out?.totalPaise ?? 0) + (ret?.totalPaise ?? 0);
  const staysPaise = it.destinations.reduce((s, d) => s + (d.stay ? d.stay.hotel.pricePerNightPaise * d.nights : 0), 0);
  let transfersPaise = 0, activitiesPaise = 0, activityCount = 0;
  for (const d of it.days) {
    for (const inc of d.inclusions) if (inc.kind === 'transfer') transfersPaise += inc.transfer.pricePaise;
    for (const s of ['morning', 'afternoon', 'evening'] as const) { const a = d[s]; if (a) { activitiesPaise += a.pricePaise; activityCount++; } }
  }
  const adults = it.intake.rooms.reduce((s, r) => s + r.adults, 0) || 1;
  const leg = (l: NonNullable<Itinerary['flights']>) => `${l.segments[0]?.fromIATA} → ${l.segments[l.segments.length - 1]?.toIATA} · ${l.segments[0]?.airlineName ?? ''} · ${new Date(l.segments[0]!.departureAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <section className="rounded-lg bg-surface border border-border-subtle shadow-sm p-5">
          <p className="text-[15px] text-ink leading-relaxed">{trip.summary}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {it.destinations.map((d, i) => (
              <span key={d.cityCode} className="inline-flex items-center gap-2">
                {i > 0 && <ArrowRight className="w-3.5 h-3.5 text-[rgb(var(--text-tertiary))]" aria-hidden />}
                <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-ink text-white text-sm font-bold">{d.cityName}<span className="font-mono text-[11px] text-amber-500">{d.nights}N</span></span>
              </span>
            ))}
          </div>
          {trip.warnings.length > 0 && (
            <div className="mt-4 rounded-md border border-warning-500/30 bg-amber-50 text-amber-700 px-3 py-2 text-xs space-y-1">
              {trip.warnings.map((w, i) => <p key={i} className="flex gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />{w}</p>)}
            </div>
          )}
        </section>

        {out && (
          <section className="rounded-lg bg-surface border border-border-subtle shadow-sm p-5">
            <h2 className="label mb-3 inline-flex items-center gap-1.5"><Plane className="w-3.5 h-3.5" />Flights</h2>
            <p className="text-sm font-semibold text-ink">{leg(out)}</p>
            {ret && <p className="text-sm font-semibold text-ink mt-1">{leg(ret)}</p>}
          </section>
        )}

        {it.destinations.map((d) => {
          const days = it.days.filter((x) => x.cityCode === d.cityCode);
          return (
            <section key={d.cityCode} className="rounded-lg bg-surface border border-border-subtle shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border-subtle flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-extrabold text-ink">{d.cityName} <span className="font-mono text-sm text-crimson-700">{d.nights}N</span></h2>
                {d.stay && <span className="money text-sm text-ink">{money(d.stay.hotel.pricePerNightPaise * d.nights)}</span>}
              </div>
              {d.stay && (
                <div className="px-5 py-3 flex items-start gap-3 bg-surface-2/60">
                  <BedDouble className="w-4 h-4 mt-0.5 text-crimson-700 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-bold text-ink">{d.stay.hotel.name}</p>
                    <p className="text-xs text-[rgb(var(--text-secondary))] inline-flex items-center gap-1.5">
                      <span className="inline-flex text-amber-500" role="img" aria-label={`${d.stay.hotel.stars} star`}>{Array.from({ length: d.stay.hotel.stars }).map((_, i) => <Star key={i} className="w-3 h-3 fill-amber-500" />)}</span>
                      {d.stay.hotel.room.name} · {d.stay.hotel.mealPlan}
                    </p>
                  </div>
                </div>
              )}
              <ul className="divide-y divide-border-subtle">
                {days.map((day) => {
                  const acts = (['morning', 'afternoon', 'evening'] as const).filter((s) => day[s]);
                  const transfers = day.inclusions.filter((i) => i.kind === 'transfer');
                  return (
                    <li key={day.dayNo} className="px-5 py-3 flex gap-4">
                      <span className="w-12 shrink-0">
                        <span className="block label">Day {day.dayNo}</span>
                        <span className="block text-xs text-[rgb(var(--text-secondary))] tnum">{new Date(day.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                      </span>
                      <span className="min-w-0 text-sm space-y-1">
                        {transfers.map((t, i) => t.kind === 'transfer' && <span key={i} className="flex gap-1.5 text-[rgb(var(--text-secondary))]"><Car className="w-3.5 h-3.5 mt-0.5 shrink-0" />{t.transfer.fromName} → {t.transfer.toName}</span>)}
                        {acts.map((s) => <span key={s} className="flex gap-1.5"><Ticket className="w-3.5 h-3.5 mt-0.5 shrink-0 text-crimson-700" /><span><span className="capitalize text-[rgb(var(--text-secondary))]">{s}:</span> <span className="text-ink font-semibold">{day[s]!.name}</span></span></span>)}
                        {!acts.length && !transfers.length && <span className="text-[rgb(var(--text-secondary))]">Free time to explore</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <aside className="lg:sticky lg:top-24 self-start space-y-3">
        <section className="rounded-lg bg-surface border border-border-subtle shadow-sm overflow-hidden">
          <div className="px-5 py-4 space-y-2 text-sm">
            {[['Flights', flightsPaise], ['Hotels', staysPaise], ['Transfers', transfersPaise], [`Activities (${activityCount})`, activitiesPaise]].map(([l, v]) => (
              <div key={l as string} className="flex justify-between"><span className="text-[rgb(var(--text-secondary))]">{l}</span><span className="money text-ink">{(v as number) ? money(v as number) : '—'}</span></div>
            ))}
          </div>
          <div className="bg-ink text-white px-5 py-4">
            <p className="label text-white/70">Trip total · net</p>
            <p className="money text-2xl mt-1">{money(it.pricePaise)}</p>
            <p className="text-xs text-white/70 mt-0.5 tnum">{money(Math.round(it.pricePaise / adults))} per adult · your markup is added in the builder</p>
          </div>
        </section>
        <Button onClick={onOpen} className="w-full h-11 gap-2">Open in builder <ArrowRight className="w-4 h-4" /></Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={onRebuild} className="gap-1.5"><RotateCcw className="w-4 h-4" />Rebuild</Button>
          <Button variant="ghost" onClick={onEdit} className="gap-1.5"><ArrowLeft className="w-4 h-4" />Edit brief</Button>
        </div>
        <p className="text-xs text-[rgb(var(--text-secondary))] px-1">In the builder you can swap hotels, change activities and add your markup before sending the proposal.</p>
      </aside>
    </div>
  );
}
