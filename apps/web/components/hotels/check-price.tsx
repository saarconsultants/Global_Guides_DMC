'use client';
// "Check price" for a live hotel the search listed without a price: asks the
// supplier's room search (/api/hotel-rooms) and hands back the priced hotel.

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Hotel, Room } from '@/lib/itinerary/types';

export interface PriceCheckStay { checkIn: string; checkOut: string; rooms: Room[]; nationality?: string }

/** The cheapest offer becomes the card price; booking takes the cheapest offer, like any other search price. */
export function pricedFromOptions(h: Hotel, options: NonNullable<Hotel['roomOptions']>): Hotel | null {
  const sorted = [...options].filter((o) => o.totalPaise > 0).sort((a, b) => a.totalPaise - b.totalPaise);
  const best = sorted[0];
  if (!best) return null;
  const { needsPriceCheck: _, ...rest } = h;
  return { ...rest, pricePerNightPaise: best.pricePerNightPaise, refundable: best.refundable, roomOptions: sorted };
}

export function CheckPriceButton({ hotel, stay, onPriced, className = '' }: {
  hotel: Hotel; stay: PriceCheckStay; onPriced: (h: Hotel) => void; className?: string;
}) {
  const [state, setState] = useState<'idle' | 'checking' | 'none' | 'error'>('idle');
  async function check() {
    setState('checking');
    try {
      const res = await fetch('/api/hotel-rooms', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotelId: hotel.id, checkIn: stay.checkIn.slice(0, 10), checkOut: stay.checkOut.slice(0, 10), rooms: stay.rooms, nationality: stay.nationality }),
      });
      const r = await res.json().catch(() => null);
      if (!r?.ok) { setState('error'); return; }
      const priced = pricedFromOptions(hotel, r.options ?? []);
      if (!priced) { setState('none'); return; }
      onPriced(priced);
    } catch { setState('error'); }
  }
  if (state === 'none') return <p role="status" className={`text-[12.5px] font-semibold text-[rgb(var(--text-secondary))] ${className}`}>No rooms for these dates</p>;
  return (
    <div className={className}>
      <Button size="sm" variant="secondary" className="w-full" onClick={check} disabled={state === 'checking'} aria-label={`Check the live price for ${hotel.name}`}>
        {state === 'checking' ? 'Checking…' : state === 'error' ? 'Try again' : 'Check price'}
      </Button>
      {state === 'error' && <p role="status" className="mt-1 text-[11.5px] text-danger-500">The price couldn&apos;t load.</p>}
    </div>
  );
}
