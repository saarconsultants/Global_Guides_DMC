// Sample inventory has made-up prices: fine for a draft, never for a sale.
// Anything without a live supplier price stops the booking until it is replaced.

import { isLive } from '@gg/hotelbeds';
import type { Itinerary } from '@/lib/itinerary/types';

export interface SampleItem { cityName: string; hotelName: string; reason: string }

export function sampleItems(it: Itinerary): SampleItem[] {
  const out: SampleItem[] = [];
  for (const d of it.destinations) {
    const h = d.stay?.hotel;
    if (h && !(h.id.startsWith('HB-') && isLive('hotels'))) {
      out.push({ cityName: d.cityName, hotelName: h.name, reason: 'Sample price with no live hotel supplier. Remove this hotel from the trip to book the rest.' });
    }
  }
  for (const day of it.days ?? []) {
    for (const inc of day.inclusions ?? []) {
      if (inc.kind !== 'transfer') continue;
      const id = inc.transfer.id;
      if (!id.startsWith('LM-') && !id.startsWith('LMR-') && (id.startsWith('tx_') || !isLive('transfers'))) {
        out.push({ cityName: `Day ${day.dayNo}`, hotelName: `${inc.transfer.fromName} → ${inc.transfer.toName}`, reason: 'Sample price. Pick a live transfer or remove it in the builder.' });
      }
    }
    for (const slot of ['morning', 'afternoon', 'evening'] as const) {
      const a = day[slot];
      if (a && !a.id.startsWith('LMA-') && !(a.id.startsWith('ACT-') && isLive('activities'))) {
        out.push({ cityName: `Day ${day.dayNo}`, hotelName: a.name, reason: 'Sample price. Pick a live activity or remove it in the builder.' });
      }
    }
  }
  return out;
}
