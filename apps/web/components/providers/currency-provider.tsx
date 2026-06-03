'use client';
import { createContext, useContext } from 'react';
import { formatMoney } from '@/lib/money';

interface CurrencyState { currency: string; rate: number }

const Ctx = createContext<CurrencyState>({ currency: 'INR', rate: 1 });

// Seeded once per request by the root layout with the agency's display currency
// and live INR→currency rate. SSR-safe (same value server + client).
export function CurrencyProvider({ currency, rate, children }: CurrencyState & { children: React.ReactNode }) {
  return <Ctx.Provider value={{ currency, rate }}>{children}</Ctx.Provider>;
}

export function useCurrency(): CurrencyState {
  return useContext(Ctx);
}

/** Returns a formatter that converts canonical INR paise → the agency's currency. */
export function useMoney(): (paise: number | bigint) => string {
  const { currency, rate } = useContext(Ctx);
  return (paise) => formatMoney(paise, currency, rate);
}
