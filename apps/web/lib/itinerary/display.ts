// Display helpers shared by the trip builder and the customer proposal page.
// The stored visa/insurance descriptions are supplier-style strings
// ("France – Tourist Visa Assistance Only – Visa Fees Directly Payable – …");
// the data stays as-is, these turn it into a plain sentence.

export function visaTitle(country: string): string {
  return `${country} tourist visa`;
}

export function visaDetail(description: string): string {
  const d = description.toLowerCase();
  const bits: string[] = [];
  if (d.includes('assistance')) bits.push('application assistance');
  if (d.includes('fees directly payable')) bits.push('visa fee paid separately');
  if (d.includes('single entry')) bits.push('single entry');
  if (!bits.length) return 'Tourist visa';
  const s = bits.join(' · ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function insuranceDetail(description: string): string {
  const cover = description.match(/\$\s?([\d,]+)/)?.[1];
  const age = description.match(/age below (\d+)/i)?.[1];
  const bits: string[] = [];
  if (cover) bits.push(`Medical cover of at least USD ${cover}`);
  if (age) bits.push(`for travellers under ${age}`);
  return bits.length ? bits.join(', ') : 'Travel insurance for the whole trip';
}

/**
 * Split `total` across `parts` in proportion to their weights, in whole paise,
 * so the pieces always add back up to `total` exactly (largest remainder).
 * Used to show a customer the trip's selling price by component without
 * exposing the net cost of each line.
 */
export function allocate(parts: number[], total: number): number[] {
  const sum = parts.reduce((s, x) => s + Math.max(0, x), 0);
  if (sum <= 0 || total <= 0) return parts.map(() => 0);
  const raw = parts.map((x) => (Math.max(0, x) / sum) * total);
  const out = raw.map((x) => Math.floor(x));
  let left = Math.round(total) - out.reduce((s, x) => s + x, 0);
  const order = raw.map((x, i) => [x - Math.floor(x), i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) {
    if (left <= 0) break;
    out[i] = out[i]! + 1;
    left -= 1;
  }
  return out;
}
