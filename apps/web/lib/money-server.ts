// Server-side money helper. Resolves the current agency's display currency +
// live rate once per request (React cache), and returns a formatter. Server
// components render agency-facing money via `(await getDisplayMoney()).fmt(paise)`.

import { cache } from 'react';
import { db } from '@/lib/db/client';
import { getActor } from '@/lib/auth/ctx';
import { getDisplayRate } from './fx-display';
import { formatMoney } from './money';

export interface DisplayMoney {
  currency: string;
  rate: number;
  fmt: (paise: number | bigint) => string;
}

export const getDisplayMoney = cache(async (): Promise<DisplayMoney> => {
  let currency = 'INR';
  const actor = await getActor();
  if (actor?.agencyId) {
    const a = await db.agency.findUnique({ where: { id: actor.agencyId }, select: { currency: true } });
    currency = a?.currency ?? 'INR';
  }
  const rate = await getDisplayRate(currency);
  return { currency, rate, fmt: (p) => formatMoney(p, currency, rate) };
});

/** For contexts where the currency is known explicitly (e.g. the public customer page). */
export async function displayMoneyFor(currency?: string | null): Promise<DisplayMoney> {
  const c = (currency || 'INR').toUpperCase();
  const rate = await getDisplayRate(c);
  return { currency: c, rate, fmt: (p) => formatMoney(p, c, rate) };
}
