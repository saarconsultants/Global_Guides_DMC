// Live INR→display-currency rates (server-only). INR is the canonical pivot;
// these multipliers convert stored INR amounts into the agency's chosen currency.
//
// Source: frankfurter.app (ECB data, free, no key). Currencies the ECB doesn't
// publish (e.g. AED) are derived from the live INR→USD rate via their USD peg.
// Cached in-process for 12h; falls back to approximate rates if the API is down.

import { CURRENCIES } from './money';

const TTL_MS = 12 * 60 * 60 * 1000;

// USD-pegged currencies not published by the ECB/frankfurter.
const USD_PEGS: Record<string, number> = { AED: 3.6725 };
const FRANKFURTER_CODES = Object.keys(CURRENCIES).filter((c) => c !== 'INR' && !(c in USD_PEGS));

// Approximate INR→X multipliers, only used if the FX API is unreachable.
const FALLBACK: Record<string, number> = {
  INR: 1, USD: 0.0120, EUR: 0.0110, GBP: 0.0094, SGD: 0.0162, AUD: 0.0182,
  CAD: 0.0164, THB: 0.39, JPY: 1.85, NZD: 0.0197, ZAR: 0.22, AED: 0.0441,
};

let cache: { at: number; rates: Record<string, number> } | null = null;

async function fetchRates(): Promise<Record<string, number>> {
  const symbols = FRANKFURTER_CODES.join(',');
  const res = await fetch(`https://api.frankfurter.app/latest?from=INR&to=${symbols}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`FX HTTP ${res.status}`);
  const data = (await res.json()) as { rates?: Record<string, number> };
  const rates: Record<string, number> = { INR: 1, ...(data.rates ?? {}) };
  // Derive USD-pegged currencies from the live INR→USD rate.
  if (rates.USD) for (const [code, peg] of Object.entries(USD_PEGS)) rates[code] = rates.USD * peg;
  return rates;
}

export async function getInrRates(): Promise<Record<string, number>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rates;
  try {
    const rates = await fetchRates();
    cache = { at: Date.now(), rates };
    return rates;
  } catch {
    return cache?.rates ?? FALLBACK;
  }
}

/** INR→currency multiplier (1 for INR). Safe: never throws, falls back gracefully. */
export async function getDisplayRate(currency: string): Promise<number> {
  const code = (currency ?? 'INR').toUpperCase();
  if (code === 'INR') return 1;
  try {
    const rates = await getInrRates();
    return rates[code] ?? FALLBACK[code] ?? 1;
  } catch {
    return FALLBACK[code] ?? 1;
  }
}
