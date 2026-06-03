// Destination + season markup rules (Tier 5).
//
// An agency sets a default markup % (Agency.markupPct). On top of that, they can
// define override rules that apply when a trip's destination and/or travel date
// match — e.g. "Maldives in Dec–Jan → 22%", "all Europe → 18%".
//
// Precedence (most specific wins):
//   1. A rule constraining BOTH destination and date that matches  (score 3)
//   2. A rule constraining destination only that matches           (score 2)
//   3. A rule constraining date only that matches                  (score 1)
//   4. Agency default markupPct                                    (score 0)
// Ties break toward the narrower date window, then the rule's order in the list.

export interface MarkupRule {
  id: string;
  label?: string;
  destinations: string[];   // IATA city codes the rule applies to; [] = any destination
  start?: string;           // YYYY-MM-DD inclusive; omit for no lower bound
  end?: string;             // YYYY-MM-DD inclusive; omit for no upper bound
  markupPct: number;        // 0–100
}

export function parseMarkupRules(json: string | null | undefined): MarkupRule[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return [];
    return arr.filter(isValidRule);
  } catch {
    return [];
  }
}

export function isValidRule(r: any): r is MarkupRule {
  return (
    r &&
    typeof r === 'object' &&
    Array.isArray(r.destinations) &&
    r.destinations.every((d: any) => typeof d === 'string') &&
    typeof r.markupPct === 'number' &&
    r.markupPct >= 0 &&
    r.markupPct <= 100 &&
    (r.start === undefined || /^\d{4}-\d{2}-\d{2}$/.test(r.start)) &&
    (r.end === undefined || /^\d{4}-\d{2}-\d{2}$/.test(r.end))
  );
}

function dayNum(d: string | Date): number {
  const iso = typeof d === 'string' ? d.slice(0, 10) : d.toISOString().slice(0, 10);
  const [y, m, day] = iso.split('-').map(Number);
  return Date.UTC(y, (m ?? 1) - 1, day ?? 1) / 86_400_000;
}

interface MatchInput {
  rules: MarkupRule[];
  destinationCodes: string[];
  travelDate?: string | Date;
}

interface Resolution {
  pct: number;
  rule?: MarkupRule;        // the winning override, if any
  reason: string;           // human-readable, for the proposal note
}

/**
 * Resolve the trip-level markup % from destination/season rules, falling back to
 * `defaultPct` when nothing matches. Pure + deterministic (safe in server actions).
 */
export function resolveTripMarkupPct(defaultPct: number, input: MatchInput): Resolution {
  const dests = new Set(input.destinationCodes.map((c) => c.toUpperCase()));
  const travelDay = input.travelDate ? dayNum(input.travelDate) : undefined;

  let best: { score: number; span: number; rule: MarkupRule } | null = null;

  for (const rule of input.rules) {
    const constrainsDest = rule.destinations.length > 0;
    const constrainsDate = !!(rule.start || rule.end);

    // Destination gate
    if (constrainsDest && !rule.destinations.some((d) => dests.has(d.toUpperCase()))) continue;

    // Date gate
    if (constrainsDate) {
      if (travelDay === undefined) continue;
      if (rule.start && travelDay < dayNum(rule.start)) continue;
      if (rule.end && travelDay > dayNum(rule.end)) continue;
    }

    const score = (constrainsDest ? 2 : 0) + (constrainsDate ? 1 : 0);
    // Narrower window = more specific. Open-ended windows rank as widest.
    const span =
      rule.start && rule.end ? dayNum(rule.end) - dayNum(rule.start) : Number.MAX_SAFE_INTEGER;

    if (!best || score > best.score || (score === best.score && span < best.span)) {
      best = { score, span, rule };
    }
  }

  if (best) {
    const r = best.rule;
    const where = r.destinations.length ? r.destinations.join('/') : 'any destination';
    const when =
      r.start || r.end ? ` · ${r.start ?? '…'}→${r.end ?? '…'}` : '';
    return { pct: r.markupPct, rule: r, reason: `${r.label ? r.label + ' — ' : ''}${where}${when}` };
  }

  return { pct: defaultPct, reason: 'agency default' };
}
