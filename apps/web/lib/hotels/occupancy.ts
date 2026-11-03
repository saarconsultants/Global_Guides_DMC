// Room-by-room guests for hotel search, and their short form in the URL:
// "2-8.5|1" is room 1 with 2 adults and children aged 8 and 5, room 2 with 1 adult.

import type { Room } from '@/lib/itinerary/types';

export const MAX_ROOMS = 5;
export const MAX_ADULTS = 6;
export const MAX_CHILDREN = 4;
export const MAX_CHILD_AGE = 17;

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export function encodeRooms(rooms: Room[]): string {
  return rooms.map((r) => {
    const ages = (r.childAges ?? []).slice(0, r.children);
    return ages.length ? `${r.adults}-${ages.join('.')}` : String(r.adults);
  }).join('|');
}

export function decodeRooms(value?: string | null): Room[] | null {
  if (!value) return null;
  const rooms: Room[] = [];
  for (const part of value.split('|').slice(0, MAX_ROOMS)) {
    const [a, ages] = part.split('-');
    const adults = parseInt(a ?? '', 10);
    if (!Number.isFinite(adults)) return null;
    const childAges = (ages ? ages.split('.') : []).map((x) => parseInt(x, 10)).filter(Number.isFinite)
      .slice(0, MAX_CHILDREN).map((x) => clamp(x, 0, MAX_CHILD_AGE));
    rooms.push({ adults: clamp(adults, 1, MAX_ADULTS), children: childAges.length, childAges });
  }
  return rooms.length ? rooms : null;
}

export function roomsSummary(rooms: Room[]): { rooms: string; guests: string } {
  const adults = rooms.reduce((s, r) => s + r.adults, 0);
  const children = rooms.reduce((s, r) => s + r.children, 0);
  return {
    rooms: `${rooms.length} Room${rooms.length !== 1 ? 's' : ''}`,
    guests: `${adults} Adult${adults !== 1 ? 's' : ''}${children ? `, ${children} Child${children !== 1 ? 'ren' : ''}` : ''}`,
  };
}
