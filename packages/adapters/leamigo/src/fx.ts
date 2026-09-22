// Currency → INR for Leamigo quotes.
//
// Leamigo operators span countries, so a quote can arrive in any supplier
// currency. Rules:
//   • ECB-published currencies: live rates from frankfurter.app (INR base),
//     cached 12h.
//   • Gulf currencies with a hard USD peg (not published by the ECB): derived
//     from the live USD rate and the fixed peg.
//   • Anything else: NO rate. The caller drops that option rather than guess.
//     (The Hotelbeds converter assumes EUR for unknowns; for an AED quote that
//     would overstate the price ~4x, so it is deliberately not reused here.)

const USD_PEGS: Record<string, number> = {
  // units of currency per 1 USD — fixed central-bank pegs
  AED: 3.6725, SAR: 3.75, QAR: 3.64, OMR: 0.3845, BHD: 0.376, JOD: 0.709,
};

const CACHE_MS = 12 * 60 * 60 * 1000;
let cache: { at: number; inrPer: Record<string, number> } | null = null;
let inflight: Promise<Record<string, number>> | null = null;

function fallback(): Record<string, number> {
  const usd = parseFloat(process.env.LEAMIGO_FX_USD_INR ?? process.env.HOTELBEDS_FX_USD_INR ?? '85');
  const eur = parseFloat(process.env.LEAMIGO_FX_EUR_INR ?? process.env.HOTELBEDS_FX_EUR_INR ?? '92');
  return withPegs({ INR: 1, USD: usd, EUR: eur });
}

function withPegs(inrPer: Record<string, number>): Record<string, number> {
  const usd = inrPer.USD;
  if (usd) for (const [cur, perUsd] of Object.entries(USD_PEGS)) inrPer[cur] = usd / perUsd;
  return inrPer;
}

async function fetchLive(): Promise<Record<string, number>> {
  const res = await fetch('https://api.frankfurter.app/latest?from=INR', { signal: AbortSignal.timeout(5_000) });
  if (!res.ok) throw new Error(`FX HTTP ${res.status}`);
  const json = (await res.json()) as { rates?: Record<string, number> };
  const inrPer: Record<string, number> = { INR: 1 };
  for (const [cur, perInr] of Object.entries(json.rates ?? {})) if (perInr > 0) inrPer[cur] = 1 / perInr;
  if (!inrPer.USD) throw new Error('FX response missing USD');
  return withPegs(inrPer);
}

/** Map of currency → INR per 1 unit. */
export async function inrRates(): Promise<Record<string, number>> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.inrPer;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const inrPer = await fetchLive();
      cache = { at: Date.now(), inrPer };
      return inrPer;
    } catch (e) {
      console.warn('[leamigo:fx] live rates unavailable, using fallback:', (e as Error)?.message ?? e);
      return fallback();
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/**
 * Minor units in `currency` (with the supplier-given decimal precision) → INR
 * paise. Returns null when the currency has no known rate.
 */
export function minorToInrPaise(rates: Record<string, number>, amountMinor: number, currency: string, precision: number): number | null {
  const rate = rates[currency?.toUpperCase?.() ?? ''];
  if (!rate || !Number.isFinite(amountMinor)) return null;
  const major = amountMinor / Math.pow(10, Number.isFinite(precision) ? precision : 2);
  return Math.round(major * rate * 100);
}
