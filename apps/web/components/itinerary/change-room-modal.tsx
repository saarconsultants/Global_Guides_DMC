'use client';
import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { useMoney } from '@/components/providers/currency-provider';
import { roomChoices, isSampleHotel, type RoomChoice } from '@/lib/itinerary/rooms';
import type { Hotel, Room } from '@/lib/itinerary/types';

interface Props {
  open: boolean;
  onClose: () => void;
  hotel: Hotel;
  nights: number;
  onPick: (h: Hotel) => void;
  onChangeHotel: () => void;
  /** Needed for suppliers whose search has no rooms (Unifystays): they're fetched when this opens. */
  checkIn?: string;
  checkOut?: string;
  rooms?: Room[];
}

export function ChangeRoomModal({ open, onClose, hotel, nights, onPick, onChangeHotel, checkIn, checkOut, rooms }: Props) {
  const money = useMoney();
  // Unifystays rooms come from their own search, so load them when the modal opens.
  const fetchRooms = hotel.id.startsWith('US-');
  const [fetched, setFetched] = useState<{ options: NonNullable<Hotel['roomOptions']>; partial: boolean } | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  useEffect(() => {
    if (!open || !fetchRooms || !checkIn || !checkOut || !rooms?.length) return;
    let live = true;
    setState('loading');
    fetch('/api/hotel-rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hotelId: hotel.id, checkIn: checkIn.slice(0, 10), checkOut: checkOut.slice(0, 10), rooms }) })
      .then((r) => r.json())
      .then((r) => { if (!live) return; if (r.ok) { setFetched({ options: r.options, partial: r.partial }); setState('idle'); } else setState('error'); })
      .catch(() => { if (live) setState('error'); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, hotel.id, checkIn, checkOut]);
  const shown = fetchRooms && fetched ? { ...hotel, roomOptions: fetched.options } : hotel;
  const choices = roomChoices(shown);
  const byRoom = new Map<string, RoomChoice[]>();
  for (const c of choices) byRoom.set(c.roomName, [...(byRoom.get(c.roomName) ?? []), c]);
  // Unifystays offer ids change on every room search, so match those by room and board.
  const isCurrent = (c: RoomChoice) => (hotel.rateKey && c.rateKey && !fetchRooms ? c.rateKey === hotel.rateKey : c.roomName === hotel.room.name && c.board === hotel.mealPlan);
  const select = (c: RoomChoice) => {
    onPick({ ...shown, room: { ...hotel.room, name: c.roomName }, mealPlan: c.board, refundable: c.refundable, pricePerNightPaise: c.pricePerNightPaise, rateKey: c.rateKey });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title={`Change room — ${hotel.name}`} size="lg">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="text-xs text-[rgb(var(--text-secondary))]">Now: {hotel.room.name}, {hotel.mealPlan}</p>
        {isSampleHotel(hotel) ? <Pill variant="warning">Sample prices</Pill> : <Pill variant="success">Live prices</Pill>}
      </div>
      {fetchRooms && state === 'loading' ? (
        <p role="status" className="py-10 text-center text-sm text-[rgb(var(--text-secondary))]"><Spinner size="sm" className="inline mr-2" />Getting live rooms from every supplier… this can take up to 30 seconds.</p>
      ) : fetchRooms && state === 'error' ? (
        <p role="alert" className="py-10 text-center text-sm text-[rgb(var(--text-secondary))]">Live rooms couldn&apos;t load. Close and open Change room to try again.</p>
      ) : choices.length === 0 ? (
        <div className="text-center py-8 space-y-3">
          <p className="text-sm text-[rgb(var(--text-secondary))]">The supplier sent no other rooms for this hotel.</p>
          <Button size="sm" variant="secondary" onClick={() => { onClose(); onChangeHotel(); }}>Change hotel instead</Button>
        </div>
      ) : (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          {[...byRoom.entries()].map(([room, rates]) => (
            <section key={room} className="rounded-md border border-border-subtle bg-surface">
              <h3 className="px-4 pt-3 pb-1 font-bold text-ink text-[14px]">{room}</h3>
              <ul className="divide-y divide-border-subtle">
                {rates.map((c, i) => (
                  <li key={`${c.board}-${c.refundable}-${i}`} className={`px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 ${isCurrent(c) ? 'bg-crimson-50/40' : ''}`}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">{c.board}</p>
                      <p className={`text-xs ${c.refundable ? 'text-success-600' : 'text-[rgb(var(--text-secondary))]'}`}>{c.refundable ? (c.cancellationFrom ? `Free cancellation until ${c.cancellationFrom.slice(0, 16).replace('T', ' ')} (hotel local time)` : 'Refundable') : 'Non-refundable'}</p>
                      {c.promotions && c.promotions.length > 0 && <p className="text-xs text-crimson-700">{c.promotions.join(' · ')}</p>}
                    </div>
                    <div className="flex items-center gap-3 ml-auto">
                      <div className="text-right">
                        <p className="money text-[15px] text-ink">{money(c.pricePerNightPaise)}</p>
                        <p className="text-[11px] text-[rgb(var(--text-secondary))] tnum">per night · {money(c.pricePerNightPaise * nights)} total</p>
                      </div>
                      <Button size="sm" disabled={isCurrent(c)} onClick={() => select(c)}>{isCurrent(c) ? 'Selected' : 'Select'}</Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Dialog>
  );
}
