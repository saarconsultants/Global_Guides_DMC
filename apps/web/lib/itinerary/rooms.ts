// The rooms a stay can switch to: the supplier's own rates for a live hotel, or
// sample tiers for a sample hotel (labelled, and not bookable).

import { hotelsForCity } from '@/lib/itinerary/mock-inventory';
import type { Hotel } from '@/lib/itinerary/types';

export interface RoomChoice {
  roomName: string; board: string; refundable: boolean; pricePerNightPaise: number;
  rateKey?: string;
  promotions?: string[];
  cancellationFrom?: string;   // hotel local time, as the supplier sent it
}

const SAMPLE_TIERS: Array<[string, number]> = [['Superior Room', 1.2], ['Deluxe Room', 1.4], ['Junior Suite', 1.8], ['Suite', 2.4]];
const SAMPLE_BOARDS: Array<[string, number]> = [['Room Only', 1], ['Breakfast Included', 1.15], ['Half Board', 1.35]];

export const isSampleHotel = (h: Hotel) => !h.id.startsWith('HB-');

export function roomChoices(h: Hotel): RoomChoice[] {
  if (!isSampleHotel(h)) {
    return (h.roomOptions ?? []).map((o) => ({
      roomName: o.roomName, board: o.board, refundable: o.refundable, pricePerNightPaise: o.pricePerNightPaise,
      rateKey: o.rateKey,
      promotions: (o.promotions ?? []).map((p) => p.name).filter((n): n is string => !!n),
      cancellationFrom: [...(o.cancellationPolicies ?? [])].sort((a, b) => a.from.localeCompare(b.from))[0]?.from,
    }));
  }
  // Priced from the hotel's base rate, not its current one, so switching doesn't compound.
  const base = hotelsForCity(h.cityCode).find((x) => x.id === h.id) ?? h;
  const rooms: Array<[string, number]> = [[base.room.name, 1], ...SAMPLE_TIERS.filter(([name]) => name !== base.room.name)];
  return rooms.flatMap(([roomName, rate]) => SAMPLE_BOARDS.map(([board, boardRate]) => ({
    roomName, board, refundable: h.refundable, pricePerNightPaise: Math.round(base.pricePerNightPaise * rate * boardRate),
  })));
}
