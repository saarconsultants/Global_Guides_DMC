// Unified on-demand reachability probe for the four supplier APIs.
// Server-only. Results are cached ~5min per API so repeated "Check now" clicks
// (and Tripjack, which rate-limits hard) don't hammer the suppliers.
//
// NOTE: the cache is per serverless instance (in-memory). That's intentional —
// it's a best-effort throttle, not a strict global lock. Worst case a few
// instances each probe once per 5min, which is fine.

import { probeTripjack } from '@gg/tripjack';
import { probeHotelbeds } from '@gg/hotelbeds';

export interface InventoryProbeResult {
  key: string;
  reachable: boolean;
  status: number | null;
  ms: number;
  detail: string;
  checkedAt: string;
}

const TTL_MS = 5 * 60_000;
const cache = new Map<string, { at: number; result: InventoryProbeResult }>();

export async function probeApi(key: string, force = false): Promise<InventoryProbeResult> {
  const now = Date.now();
  const cached = cache.get(key);
  if (!force && cached && now - cached.at < TTL_MS) return cached.result;

  let base: { reachable: boolean; status: number | null; ms: number; detail: string };
  if (key === 'flights') base = await probeTripjack();
  else if (key === 'hotels' || key === 'activities' || key === 'transfers') base = await probeHotelbeds(key);
  else throw new Error(`Unknown inventory API: ${key}`);

  const result: InventoryProbeResult = { key, ...base, checkedAt: new Date().toISOString() };
  cache.set(key, { at: now, result });
  return result;
}
