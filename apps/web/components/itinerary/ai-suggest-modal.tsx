'use client';
import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { aiSuggestAction } from '@/app/actions/ai-suggest';
import type { SuggestedCity } from '@/lib/ai/suggest-itinerary';
import { Sparkles, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onApply: (cities: SuggestedCity[]) => void;
}

export function AiSuggestModal({ open, onClose, onApply }: Props) {
  const [destinationsText, setDestinationsText] = useState('Paris, Amsterdam, Zurich');
  const [totalNights, setTotalNights] = useState(7);
  const [notes, setNotes] = useState('');
  const [budget, setBudget] = useState<'standard'|'premium'|'luxury'>('standard');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ cities: SuggestedCity[]; summary: string; warnings: string[] } | null>(null);

  async function load() {
    setError(null); setBusy(true); setResult(null);
    const r = await aiSuggestAction({ destinationsText, totalNights, notes: notes || undefined, budget });
    setBusy(false);
    if (r.ok) setResult(r.result); else setError(r.error);
  }

  function apply() {
    if (!result) return;
    onApply(result.cities);
    reset();
  }

  function reset() {
    setError(null); setResult(null); setBusy(false); onClose();
  }

  return (
    <Dialog open={open} onClose={reset} title="Where would you like to wander?" size="lg" glass>
      {!result ? (
        <div className="space-y-4">
          <p className="text-sm text-[rgb(var(--text-secondary))]">Enter your desired destinations. We'll order them, allocate nights, and load the plan into the builder. <span className="font-medium">Powered by AI.</span></p>
          <div>
            <Label required>Destinations</Label>
            <Input value={destinationsText} onChange={(e) => setDestinationsText(e.target.value)} placeholder="e.g. Paris, Amsterdam, London" />
            <p className="text-xs text-[rgb(var(--text-secondary))] mt-1">Supported: Paris, Amsterdam, London, Rome, Zurich, Dubai, Bangkok, Singapore, Istanbul, Maldives.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Total nights</Label>
              <select value={totalNights} onChange={(e) => setTotalNights(parseInt(e.target.value, 10))} className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm">
                {[3,4,5,6,7,8,9,10,12,14].map((n) => <option key={n} value={n}>{n} nights</option>)}
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
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. honeymoon, prefers boutique stays, no shellfish allergies" className="h-20 w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm" />
          </div>
          {error && <div className="rounded-md bg-danger-100 text-danger-500 px-3 py-2 text-sm">{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={reset}>Cancel</Button>
            <Button onClick={load} disabled={busy} className="gap-2">
              {busy ? <><Loader2 className="w-4 h-4 animate-spin" />Loading...</> : <><Sparkles className="w-4 h-4" />Load suggestions</>}
            </Button>
          </div>
        </div>
      ) : (
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
