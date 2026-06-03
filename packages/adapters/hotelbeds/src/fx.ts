// Live FX rates for converting Hotelbeds prices (EUR/USD) to INR.
//
// Source: frankfurter.app — free, no API key, ECB daily rates.
// Cached for 12h in-process; falls back to env-configured rates
// (HOTELBEDS_FX_EUR_INR / HOTELBEDS_FX_USD_INR) on any failure, so pricing
// never breaks even if the FX endpoint is down.

export interface Rates { eurInr: number; usdInr: number }

const FALLBACK = (): Rates => ({
  eurInr: parseFloat(process.env.HOTELBEDS_FX_EUR_INR ?? '92'),
  usdInr: parseFloat(process.env.HOTELBEDS_FX_USD_INR ?? '85'),
});

const CACHE_MS = 12 * 60 * 60 * 1000;
let cache: { at: number; rates: Rates } | null = null;
let inflight: Promise<Rates> | null = null;

async function fetchLive(): Promise<Rates> {
  // EUR base → INR + USD; derive USD→INR = eurInr / eurUsd.
  const res = await fetch('https://api.frankfurter.app/latest?from=EUR&to=INR,USD', {
    signal: AbortSignal.timeout(5_000),
  });
  if (!res.ok) throw new Error(`FX HTTP ${res.status}`);
  const json = (await res.json()) as { rates?: { INR?: number; USD?: number } };
  const eurInr = json.rates?.INR;
  const eurUsd = json.rates?.USD;
  if (!eurInr || !eurUsd) throw new Error('FX response missing rates');
  return { eurInr, usdInr: eurInr / eurUsd };
}

export async function getRates(): Promise<Rates> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.rates;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const rates = await fetchLive();
      cache = { at: Date.now(), rates };
      return rates;
    } catch (e) {
      console.warn('[hotelbeds:fx] live fetch failed, using env fallback:', (e as Error)?.message ?? e);
      return FALLBACK();
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

// Convert a supplier amount to INR paise using the given (already-fetched) rates.
export function toInrPaiseWith(rates: Rates, amount: number, currency: string): number {
  const rate =
    currency === 'EUR' ? rates.eurInr :
    currency === 'USD' ? rates.usdInr :
    currency === 'INR' ? 1 :
    rates.eurInr; // unknown currency → assume EUR (safer to slightly over- than under-quote)
  return Math.round(amount * rate * 100);
}
