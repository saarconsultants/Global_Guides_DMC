// Client-safe helpers for showing activities from any supplier.
import type { Activity } from '@/lib/itinerary/types';

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
