// Lightweight reachability probe for the Tripjack flight gateway.
// Tripjack has no dedicated "ping" endpoint, so we issue ONE minimal canonical
// search (~30 days out) and classify the outcome. On-demand only — callers
// should cache the result (see apps/web/lib/inventory-probe.ts).

import { isLive } from './client';
import { searchFlights } from './flights';

export interface TripjackProbeResult {
  reachable: boolean;
  status: number | null;
  ms: number;
  detail: string;
}

export async function probeTripjack(): Promise<TripjackProbeResult> {
  const started = Date.now();
  if (!isLive()) return { reachable: false, status: null, ms: 0, detail: 'No credentials configured.' };
  const date = new Date(started + 30 * 86_400_000).toISOString().slice(0, 10);
  try {
    const r = await searchFlights({
      legs: [{ fromIATA: 'DEL', toIATA: 'BOM', date }],
      adults: 1, children: 0, infants: 0, cabin: 'ECONOMY', directOnly: false,
    });
    return { reachable: true, status: 200, ms: Date.now() - started, detail: `Gateway responding · ${r.offers.length} offers` };
  } catch (e: any) {
    const ms = Date.now() - started;
    // A business error means the gateway answered with structured JSON → reachable.
    if (e?.name === 'TripjackBizError') return { reachable: true, status: 200, ms, detail: 'Gateway responding (business validation).' };
    // HTTP error: upstream=true → supplier-side outage (5xx / HTML / timeout); upstream=false → reachable but rejected.
    if (e?.name === 'TripjackHttpError') return { reachable: !e.upstream, status: e.status ?? null, ms, detail: e.userMessage ?? e.message };
    return { reachable: false, status: null, ms, detail: String(e?.message ?? e) };
  }
}
