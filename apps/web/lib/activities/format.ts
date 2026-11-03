// Client-safe helpers for showing activities from any supplier.
import type { Activity, ActivityOptionChoice } from '@/lib/itinerary/types';

export type ActivitySupplier = 'Hotelbeds' | 'Leamigo' | null;

export function supplierOf(a: Pick<Activity, 'id'>): ActivitySupplier {
  if (a.id.startsWith('ACT-')) return 'Hotelbeds';
  if (a.id.startsWith('LMA-')) return 'Leamigo';
  return null;            // sample inventory
}

export const isLiveActivity = (a: Pick<Activity, 'id'>) => supplierOf(a) !== null;

/** "2h 30m", "45m" — null when the supplier didn't state a duration. */
export function fmtDuration(min: number | undefined): string | null {
  if (!min || min <= 0) return null;
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h}h${m ? ` ${m}m` : ''}` : `${m}m`;
}

/** The "from" figure and its basis for cards: per person, or per group for private products. */
export function unitPrice(a: Activity): { paise: number; basis: 'person' | 'group' } {
  return { paise: a.perPersonPaise ?? a.pricePaise, basis: a.priceBasis ?? 'person' };
}

/** The same activity, switched to another of its options. */
export function withOption(a: Activity, o: ActivityOptionChoice): Activity {
  if (!a.leamigo) return a;
  const parts = (a.description ?? '').split(' · ').slice(1).filter((p) => p !== 'Free cancellation' && p !== 'Non-refundable');
  return {
    ...a,
    id: `LMA-${a.leamigo.activityId}:${o.optionId}:${o.ticketId}`,
    pricePaise: o.pricePaise, perPersonPaise: o.perPersonPaise, priceBasis: o.priceBasis,
    // First segment is the option name — booking reads it back as the voucher sub-line.
    description: [o.name, ...parts, o.freeCancellation ? 'Free cancellation' : 'Non-refundable'].filter(Boolean).join(' · '),
    leamigo: {
      ...a.leamigo, optionId: o.optionId, ticketId: o.ticketId, quantity: o.quantity, lines: o.lines,
      openDated: o.bookingType === 'open_dated', timed: o.bookingType === 'date_time_required',
      freeCancellation: o.freeCancellation, cancellationRules: o.cancellationRules,
    },
  };
}

/** What gets saved on a trip: the chosen option only, not the whole price list. */
export function forTrip(a: Activity): Activity {
  const { options: _options, ...rest } = a;
  return rest;
}

/** A supplier's cancellation rules in words. */
export function cancellationRulesText(rules: Array<{ hoursBefore: number; chargePct: number }>): string | undefined {
  if (!rules.length) return undefined;
  if (rules.every((r) => r.chargePct >= 100)) return 'Non-refundable';
  return [...rules].sort((a, b) => b.hoursBefore - a.hoursBefore)
    .map((r) => (r.hoursBefore > 0 ? `${r.chargePct}% charge if cancelled ${r.hoursBefore}+ hours before` : `${r.chargePct}% charge after that`))
    .join('; ');
}
