'use client';
import { useEffect, useRef, useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { aiSuggestAction } from '@/app/actions/ai-suggest';
import { AirportCombobox } from '@/components/flights/airport-combobox';
import { useCurrency } from '@/components/providers/currency-provider';
import { formatMoney } from '@/lib/money';
import type { SuggestedCity } from '@/lib/ai/suggest-itinerary';
import type { Itinerary } from '@/lib/itinerary/types';
import { Sparkles, AlertTriangle, ArrowRight, Loader2, Plane, Hotel as HotelIcon, Wand2, Check } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onApply: (cities: SuggestedCity[]) => void;
  /** Full AI trip: receives the complete architected itinerary (load + navigate). */
  onTrip?: (itinerary: Itinerary) => void;
  /**
   * Prefill from the intake form the agent has already filled in, so the modal
   * never asks for data that's on screen. Re-applied every time it opens.
   */
  defaults?: {
    destinationsText?: string;
    totalNights?: number;
    departureDate?: string;
    originIATA?: string;
    adults?: number;
    children?: number;
    budget?: 'standard' | 'premium' | 'luxury';
  };
}

const STAGES = [
  'Routing your cities…',
  'Fetching live fares, rooms & activities…',
  'AI is selecting the best options…',
  'Composing your trip…',
];

function defaultDeparture(): string {
  const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10);
}

export function AiSuggestModal({ open, onClose, onApply, onTrip, defaults }: Props) {
  const [destinationsText, setDestinationsText] = useState(defaults?.destinationsText || 'Paris, Amsterdam, Zurich');
  const [totalNights, setTotalNights] = useState(defaults?.totalNights ?? 7);
  const [notes, setNotes] = useState('');
  const [budget, setBudget] = useState<'standard'|'premium'|'luxury'>(defaults?.budget ?? 'standard');
  const [departureDate, setDepartureDate] = useState(defaults?.departureDate || defaultDeparture());
  const [originIATA, setOriginIATA] = useState(defaults?.originIATA || 'DEL');
  const [adults, setAdults] = useState(defaults?.adults ?? 2);
  const [children, setChildren] = useState(defaults?.children ?? 0);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<number | null>(null);   // full-trip progress
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ cities: SuggestedCity[]; summary: string; warnings: string[] } | null>(null);
  const [trip, setTrip] = useState<{ itinerary: Itinerary; summary: string; warnings: string[] } | null>(null);
  const stageTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const { currency, rate } = useCurrency();
  const fmt = (p: number) => formatMoney(p, currency, rate);
  // Always include the inherited night count, even if it's not a preset (e.g. 5, 11).
  const nightOptions = Array.from(new Set([...[3, 4, 5, 6, 7, 8, 9, 10, 12, 14], totalNights]))
    .filter((n) => n >= 2 && n <= 21)
    .sort((a, b) => a - b);

  useEffect(() => () => { if (stageTimer.current) clearInterval(stageTimer.current); }, []);

  // Re-seed from the intake form every time the modal opens — the agent may have
  // edited destinations/dates/travellers since this component first mounted.
  // Keyed on `open` only: `defaults` is an inline object, so a new identity each
  // render would loop.
  useEffect(() => {
    if (!open || !defaults) return;
    if (defaults.destinationsText) setDestinationsText(defaults.destinationsText);
    if (defaults.totalNights) setTotalNights(defaults.totalNights);
    if (defaults.departureDate) setDepartureDate(defaults.departureDate);
    if (defaults.originIATA) setOriginIATA(defaults.originIATA);
    if (defaults.adults) setAdults(defaults.adults);
    if (typeof defaults.children === 'number') setChildren(defaults.children);
    if (defaults.budget) setBudget(defaults.budget);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadRoute() {
    setError(null); setBusy(true); setResult(null); setTrip(null);
    const r = await aiSuggestAction({ destinationsText, totalNights, notes: notes || undefined, budget, travelers: { adults, children } });
    setBusy(false);
    if (r.ok) setResult(r.result); else setError(r.error);
  }

  async function buildTrip() {
    setError(null); setBusy(true); setResult(null); setTrip(null); setStage(0);
    // Advance the narrative while the single request runs (~15-40s).
    let s = 0;
    stageTimer.current = setInterval(() => { s = Math.min(s + 1, STAGES.length - 1); setStage(s); }, 8000);
    try {
      const res = await fetch('/api/ai-trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destinationsText, totalNights, departureDate, adults, children, originIATA: originIATA || undefined, budget, notes: notes || undefined }),
      });
      const j = await res.json().catch(() => null);
      if (j?.ok) setTrip({ itinerary: j.itinerary, summary: j.summary, warnings: j.warnings ?? [] });
      else setError(j?.error ?? `Trip build failed (HTTP ${res.status}). Please try again.`);
    } catch {
      setError('Could not reach the trip builder. Check your connection and try again.');
    } finally {
      if (stageTimer.current) { clearInterval(stageTimer.current); stageTimer.current = null; }
      setBusy(false); setStage(null);
    }
  }

  function apply() {
    if (!result) return;
    onApply(result.cities);
    reset();
  }

  function openTrip() {
    if (!trip) return;
    onTrip?.(trip.itinerary);
    reset();
  }

  function reset() {
    setError(null); setResult(null); setTrip(null); setBusy(false); setStage(null);
    if (stageTimer.current) { clearInterval(stageTimer.current); stageTimer.current = null; }
    onClose();
  }

  return (
    <Dialog open={open} onClose={reset} title="Where would you like to wander?" size="lg" glass>
      {busy && stage !== null ? (
        /* ── Full-trip progress ── */
        <div className="py-10 text-center space-y-5">
          <div className="mx-auto w-14 h-14 rounded-full bg-gradient-to-br from-crimson-50 to-amber-50 border border-crimson-100 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-crimson-700 animate-spin" />
          </div>
          <div className="space-y-2">
            {STAGES.map((label, i) => (
              <p key={label} className={`text-sm transition-colors ${i < stage ? 'text-success-500' : i === stage ? 'text-ink font-semibold' : 'text-[rgb(var(--text-tertiary))]'}`}>
                {i < stage ? <Check className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" /> : null}{label}
              </p>
            ))}
          </div>
          <p className="text-xs text-[rgb(var(--text-tertiary))]">Live inventory + AI selection takes up to a minute.</p>
        </div>
      ) : trip ? (
        /* ── Full-trip result ── */
        <div className="space-y-4">
          <div className="rounded-md bg-crimson-50 text-crimson-900 px-4 py-3 text-sm">
            <p className="font-medium">{trip.summary}</p>
          </div>
          <div className="space-y-2">
            {trip.itinerary.flights && (
              <div className="flex items-center gap-3 p-3 rounded-md bg-surface border border-border-subtle text-sm">
                <Plane className="w-4 h-4 text-crimson-700 flex-shrink-0" />
                <span className="font-medium text-ink">
                  {trip.itinerary.flights.segments[0]?.airlineName} · {trip.itinerary.flights.segments[0]?.fromIATA} → {trip.itinerary.flights.segments[trip.itinerary.flights.segments.length - 1]?.toIATA}
                  {trip.itinerary.flights.return ? ' · round-trip' : ''}
                </span>
                <span className="ml-auto font-mono text-xs">{fmt(trip.itinerary.flights.totalPaise + (trip.itinerary.flights.return?.totalPaise ?? 0))}</span>
              </div>
            )}
            {trip.itinerary.destinations.map((d) => (
              <div key={d.cityCode} className="flex items-center gap-3 p-3 rounded-md bg-surface border border-border-subtle text-sm">
                <HotelIcon className="w-4 h-4 text-crimson-700 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink truncate">{d.cityName} · {d.nights}N — {d.stay?.hotel.name ?? 'no stay'}</p>
                  {d.stay && <p className="text-xs text-[rgb(var(--text-secondary))]">{'★'.repeat(d.stay.hotel.stars)} · {d.stay.hotel.mealPlan}</p>}
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-md bg-gradient-to-r from-crimson-900 to-crimson-700 text-white px-4 py-3 flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest font-bold text-amber-300">Complete trip total</span>
            <span className="font-mono font-bold text-lg">{fmt(trip.itinerary.pricePaise)}</span>
          </div>
          {trip.warnings.length > 0 && (
            <div className="rounded-md bg-warning-100 text-warning-500 px-3 py-2 text-xs space-y-1">
              {trip.warnings.map((w, i) => (
                <p key={i} className="inline-flex items-start gap-1"><AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" /> {w}</p>
              ))}
            </div>
          )}
          <div className="flex justify-between items-center pt-2">
            <Button variant="ghost" onClick={() => setTrip(null)}>Adjust query</Button>
            <Button onClick={openTrip} className="gap-2">Open in builder <ArrowRight className="w-4 h-4" /></Button>
          </div>
        </div>
      ) : !result ? (
        /* ── Input form ── */
        <div className="space-y-4">
          <p className="text-sm text-[rgb(var(--text-secondary))]">Type destinations — AI routes the cities, then builds the complete trip from live inventory: hotels, activities, flights, priced. <span className="font-medium">Nothing invented, everything bookable.</span></p>
          <div>
            <Label required>Destinations</Label>
            <Input value={destinationsText} onChange={(e) => setDestinationsText(e.target.value)} placeholder="e.g. Paris, Amsterdam, London" />
            <p className="text-xs text-[rgb(var(--text-secondary))] mt-1">Prefilled from your trip above — edit if you want a different plan. 130+ cities supported.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Total nights</Label>
              <select value={totalNights} onChange={(e) => setTotalNights(parseInt(e.target.value, 10))} className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm">
                {nightOptions.map((n) => <option key={n} value={n}>{n} nights</option>)}
              </select>
            </div>
            <div>
              <Label>Departure</Label>
              <Input type="date" value={departureDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDepartureDate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <AirportCombobox label="Flying from" value={originIATA} onChange={setOriginIATA} placeholder="Origin city" />
            <div>
              <Label>Adults</Label>
              <select value={adults} onChange={(e) => setAdults(parseInt(e.target.value, 10))} className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm">
                {[1,2,3,4,5,6].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <Label>Budget tier</Label>
              <select value={budget} onChange={(e) => setBudget(e.target.value as any)} className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm">
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
                <option value="luxury">Luxury</option>
              </select>
            </div>
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. honeymoon, prefers boutique stays, no shellfish allergies" className="h-16 w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm" />
          </div>
          {error && <div className="rounded-md bg-danger-100 text-danger-500 px-3 py-2 text-sm">{error}</div>}
          <div className="flex justify-end items-center gap-2 pt-2">
            <Button variant="ghost" onClick={reset}>Cancel</Button>
            <Button variant="outline" onClick={loadRoute} disabled={busy} className="gap-2">
              {busy && stage === null ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}Route only
            </Button>
            {onTrip && (
              <Button onClick={buildTrip} disabled={busy} className="gap-2">
                <Wand2 className="w-4 h-4" />Build full trip
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* ── Route-only result (existing flow) ── */
        <div className="space-y-4">
          <div className="rounded-md bg-crimson-50 text-crimson-900 px-4 py-3 text-sm">
            <p className="font-medium">{result.summary}</p>
          </div>
          <div className="space-y-2">
            {result.cities.map((c, i) => (
              <div key={c.cityCode} className="flex items-start gap-3 p-3 rounded-md bg-surface border border-border-subtle">
                <div className="w-7 h-7 rounded-full bg-crimson-900 text-white inline-flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-navy-900">{c.cityName}</p>
                    <Pill variant="neutral">{c.cityCode}</Pill>
                    <Pill variant="info">{c.nights} night{c.nights !== 1 ? 's' : ''}</Pill>
                  </div>
                  <p className="text-xs text-[rgb(var(--text-secondary))] mt-1">{c.rationale}</p>
                </div>
              </div>
            ))}
          </div>
          {result.warnings.length > 0 && (
            <div className="rounded-md bg-warning-100 text-warning-500 px-3 py-2 text-xs space-y-1">
              {result.warnings.map((w, i) => (
                <p key={i} className="inline-flex items-start gap-1"><AlertTriangle className="w-3 h-3 mt-0.5" /> {w}</p>
              ))}
            </div>
          )}
          <div className="flex justify-between items-center pt-2">
            <Button variant="ghost" onClick={() => setResult(null)}>Adjust query</Button>
            <Button onClick={apply} className="gap-2">Use this plan <ArrowRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
