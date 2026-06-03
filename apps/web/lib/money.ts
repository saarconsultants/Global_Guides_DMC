// Money + currency utilities.
//
// INR minor units ("paise") remain the canonical internal currency for every
// stored amount (DB, itinerary, ledger). Each agency picks a DISPLAY currency;
// we convert at render time using a live INR→target rate (see lib/fx-display.ts).
// This keeps the books in one pivot currency while letting global agents quote
// in their own currency.

export interface CurrencyMeta {
  code: string;
  symbol: string;
  name: string;
  locale: string;   // for Intl grouping (e.g. en-IN groups as 1,14,550)
}

export const CURRENCIES: Record<string, CurrencyMeta> = {
  INR: { code: 'INR', symbol: '₹',   name: 'Indian Rupee',       locale: 'en-IN' },
  USD: { code: 'USD', symbol: '$',   name: 'US Dollar',          locale: 'en-US' },
  EUR: { code: 'EUR', symbol: '€',   name: 'Euro',               locale: 'en-IE' },
  GBP: { code: 'GBP', symbol: '£',   name: 'British Pound',      locale: 'en-GB' },
  AED: { code: 'AED', symbol: 'AED', name: 'UAE Dirham',         locale: 'en-AE' },
  SGD: { code: 'SGD', symbol: 'S$',  name: 'Singapore Dollar',   locale: 'en-SG' },
  AUD: { code: 'AUD', symbol: 'A$',  name: 'Australian Dollar',  locale: 'en-AU' },
  CAD: { code: 'CAD', symbol: 'C$',  name: 'Canadian Dollar',    locale: 'en-CA' },
  THB: { code: 'THB', symbol: '฿',   name: 'Thai Baht',          locale: 'en-TH' },
  JPY: { code: 'JPY', symbol: '¥',   name: 'Japanese Yen',       locale: 'ja-JP' },
  NZD: { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', locale: 'en-NZ' },
  ZAR: { code: 'ZAR', symbol: 'R',   name: 'South African Rand', locale: 'en-ZA' },
};

export const SUPPORTED_CURRENCIES = Object.values(CURRENCIES);

export function currencyMeta(code?: string | null): CurrencyMeta {
  return CURRENCIES[(code ?? 'INR').toUpperCase()] ?? CURRENCIES.INR!;
}

export function isSupportedCurrency(code?: string | null): boolean {
  return !!code && code.toUpperCase() in CURRENCIES;
}

/**
 * Format a canonical INR-paise amount in the given display currency.
 * @param amountInrPaise canonical amount in INR minor units (paise)
 * @param currency       ISO code of the display currency (default INR)
 * @param rate           INR→target multiplier (1 for INR); from getDisplayRate()
 */
export function formatMoney(amountInrPaise: number | bigint, currency: string = 'INR', rate: number = 1): string {
  const meta = currencyMeta(currency);
  const inr = Number(amountInrPaise) / 100;
  const value = meta.code === 'INR' ? inr : inr * (rate || 1);
  try {
    return new Intl.NumberFormat(meta.locale, { style: 'currency', currency: meta.code, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${meta.symbol}${Math.round(value).toLocaleString('en-US')}`;
  }
}

/**
 * Glyph-safe formatting for PDFs. @react-pdf's built-in Helvetica lacks the ₹, €,
 * ฿ glyphs, so we render the 3-letter ISO code instead of the symbol.
 */
export function formatMoneyCode(amountInrPaise: number | bigint, currency: string = 'INR', rate: number = 1): string {
  const meta = currencyMeta(currency);
  const inr = Number(amountInrPaise) / 100;
  const value = meta.code === 'INR' ? inr : inr * (rate || 1);
  try {
    return new Intl.NumberFormat(meta.locale, { style: 'currency', currency: meta.code, currencyDisplay: 'code', maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${meta.code} ${Math.round(value).toLocaleString('en-US')}`;
  }
}
