// Trim long supplier prose to a concise lead (whole sentences, near maxChars).
export function summarize(text: string, maxChars = 320): { short: string; truncated: boolean } {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxChars) return { short: clean, truncated: false };
  // Cut at the last sentence end before maxChars; fall back to last word.
  const slice = clean.slice(0, maxChars);
  const lastStop = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '));
  const cut = lastStop > maxChars * 0.5 ? lastStop + 1 : slice.lastIndexOf(' ');
  return { short: clean.slice(0, cut > 0 ? cut : maxChars).trim() + '…', truncated: true };
}
