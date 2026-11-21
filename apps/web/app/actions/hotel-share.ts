'use server';
// Share 2–4 hotel options with a customer as a public page, priced with the agency's hotel markup.

import { randomBytes } from 'node:crypto';
import { db } from '@/lib/db/client';
import { requireAgency } from '@/lib/auth/ctx';
import { isLiveHotelId } from '@/lib/hotels/supplier';
import { MAX_SHARED_HOTELS, type SharedHotel } from '@/lib/hotels/share';
import type { Hotel } from '@/lib/itinerary/types';

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export async function createHotelShareAction(args: {
  cityName: string; checkIn: string; checkOut: string;
  rooms: Array<{ adults: number; children?: number }>;
  hotels: Array<Pick<Hotel, 'id' | 'name' | 'stars' | 'address' | 'thumb' | 'room' | 'mealPlan' | 'refundable' | 'pricePerNightPaise'>>;
}): Promise<{ ok: true; token: string; markupPct: number } | { ok: false; error: string }> {
  const actor = await requireAgency();
  const picked = (args.hotels ?? []).slice(0, MAX_SHARED_HOTELS);
  if (picked.length < 2) return { ok: false, error: 'Pick at least two hotels to compare.' };
  if (!ISO.test(args.checkIn) || !ISO.test(args.checkOut) || args.checkOut <= args.checkIn) return { ok: false, error: 'Search with valid dates first.' };
  const nights = Math.round((Date.parse(args.checkOut) - Date.parse(args.checkIn)) / 86_400_000);

  // The hotel markup from Settings → Sales, else the agency default.
  const agency = await db.agency.findUnique({ where: { id: actor.agencyId }, select: { markupPct: true, markupConfigJson: true } });
  let overrides: Record<string, number> = {};
  try { overrides = agency?.markupConfigJson ? JSON.parse(agency.markupConfigJson) : {}; } catch { /* unreadable config: use the default */ }
  const markupPct = Number.isFinite(overrides.HOTEL) ? overrides.HOTEL! : agency?.markupPct ?? 15;

  const hotels: SharedHotel[] = picked.map((h) => {
    const perNight = Math.round(Math.max(0, Number(h.pricePerNightPaise) || 0) * (1 + markupPct / 100));
    return {
      name: String(h.name).slice(0, 160), stars: Math.min(5, Math.max(0, Number(h.stars) || 0)), address: String(h.address ?? '').slice(0, 240),
      thumb: typeof h.thumb === 'string' && /^https:\/\//.test(h.thumb) ? h.thumb : undefined,
      // "Best available" is the agent-side placeholder for a hotel whose room isn't chosen yet: not for customers.
      room: /^best available/i.test(h.room?.name ?? '') ? '' : String(h.room?.name ?? '').slice(0, 160),
      board: /^best available/i.test(h.mealPlan ?? '') ? '' : String(h.mealPlan ?? '').slice(0, 80), refundable: !!h.refundable,
      perNightPaise: perNight, totalPaise: perNight * nights, sample: !isLiveHotelId(String(h.id)),
    };
  });
  if (hotels.some((h) => h.perNightPaise <= 0)) return { ok: false, error: 'One of these hotels has no price. Search again and pick others.' };

  const adults = args.rooms.reduce((s, r) => s + (Number(r.adults) || 0), 0) || 1;
  const children = args.rooms.reduce((s, r) => s + (Number(r.children) || 0), 0);
  const guests = `${adults} adult${adults !== 1 ? 's' : ''}${children ? `, ${children} child${children !== 1 ? 'ren' : ''}` : ''} · ${args.rooms.length || 1} room${(args.rooms.length || 1) !== 1 ? 's' : ''}`;

  const token = randomBytes(18).toString('base64url');
  await db.hotelShare.create({
    data: { token, agencyId: actor.agencyId, createdById: actor.userId, cityName: String(args.cityName).slice(0, 80), checkIn: args.checkIn, checkOut: args.checkOut, guests, hotels: JSON.stringify(hotels) },
  });
  return { ok: true, token, markupPct };
}
