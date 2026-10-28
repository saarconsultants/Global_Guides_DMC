// Plain-English labels for commission-rule values. Stored values never change.

export const PRODUCT_TYPES = [
  { value: 'FLIGHT', label: 'Flights' },
  { value: 'HOTEL', label: 'Hotels' },
  { value: 'TRANSFER', label: 'Transfers' },
  { value: 'ACTIVITY', label: 'Activities' },
  { value: 'VISA', label: 'Visa' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'INVOICE_TOTAL', label: 'Whole invoice' },
];

export const APPLIES_TO = [
  { value: 'NET', label: 'Net cost' },
  { value: 'MARKUP', label: 'Agency markup' },
  { value: 'TOTAL', label: 'Selling price' },
];

export function productLabel(v: string): string {
  return PRODUCT_TYPES.find((p) => p.value === v)?.label ?? v;
}
export function appliesToLabel(v: string): string {
  return APPLIES_TO.find((p) => p.value === v)?.label ?? v;
}

/** Stored paise -> rupee string for an input ("" when unset). */
export function paiseToRupeesInput(p: bigint | number | null | undefined): string {
  if (p == null) return '';
  const r = Number(p) / 100;
  return Number.isInteger(r) ? String(r) : r.toFixed(2);
}
