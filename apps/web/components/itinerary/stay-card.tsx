'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { Pass, PassMain, PassStub, Perforation } from '@/components/ui/pass';
import { ChangeHotelModal } from './change-hotel-modal';
import type { Hotel, Stay, Room } from '@/lib/itinerary/types';
import { useMoney } from '@/components/providers/currency-provider';
import { Star, Hotel as HotelIcon, Bed } from 'lucide-react';
import { HotelPhoto } from '@/components/hotels/hotel-photo';

interface Props {
  cityCode: string;
  cityName: string;
  nights: number;
  stay: Stay;
  rooms?: Room[];
  onChange: (h: Hotel) => void;
}

export function StayCard({ cityCode, cityName, nights, stay, rooms, onChange }: Props) {
  const money = useMoney();
  const [open, setOpen] = useState(false);
  const h = stay.hotel;
  return (
    <>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-[18px] font-extrabold text-ink tracking-[-0.01em] inline-flex items-center gap-2"><Bed className="w-4 h-4 text-crimson-700" />{cityName} · {nights} night{nights !== 1 ? 's' : ''}</h3>
        {h.id.startsWith('HB-') && <Pill variant="live">Live rate</Pill>}
      </div>
      <Pass>
        <PassMain className="flex gap-4 lg:gap-5">
          <div className="w-[120px] h-[120px] lg:w-[136px] lg:h-[136px] shrink-0 rounded-md overflow-hidden">
            <HotelPhoto thumb={h.thumb} allImages={h.allImages} hotelName={h.name} className="w-full h-full rounded-md" placeholder={<div className="w-full h-full rounded-md bg-ink text-white flex flex-col items-center justify-center gap-2"><span className="inline-flex items-center gap-0.5 text-amber-500">{Array.from({ length: h.stars }).map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-500" />)}</span><span className="font-mono text-[15px] font-bold tracking-[0.06em] tnum">{cityCode}</span></div>} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-0.5 text-amber-500" aria-label={`${h.stars} star`}>{Array.from({ length: h.stars }).map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-500" />)}</span>
            <h4 className="mt-1 text-[16px] font-bold text-ink tracking-[-0.01em] leading-tight">{h.name}</h4>
            <p className="text-[12.5px] text-[rgb(var(--text-secondary))] truncate">{h.address}</p>
            {h.rating && (
              <p className="mt-1.5 flex items-center gap-2 text-[12.5px]">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-[5px] bg-ink text-white font-bold text-[11px] tnum">{h.rating.score}</span>
                <span className="text-[rgb(var(--text-secondary))]">{h.rating.label} · <span className="tnum">{h.rating.reviewCount}</span> ratings</span>
              </p>
            )}
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div><div className="label">Check-in</div><div className="mt-0.5 text-[13px] font-bold text-ink tnum">{fmt(stay.checkIn)}</div></div>
              <div><div className="label">Check-out</div><div className="mt-0.5 text-[13px] font-bold text-ink tnum">{fmt(stay.checkOut)}</div></div>
              <div><div className="label">Room</div><div className="mt-0.5 text-[13px] font-bold text-ink truncate">{h.room.name}</div></div>
              <div><div className="label">Board</div><div className="mt-0.5 text-[13px] font-bold text-ink truncate">{h.mealPlan}{h.refundable ? '' : ''}</div></div>
            </div>
            <p className={`mt-2 text-[12px] font-semibold ${h.refundable ? 'text-success-600' : 'text-[rgb(var(--text-secondary))]'}`}>{h.refundable ? 'Fully refundable before check-in' : 'Non-refundable rate'}</p>
          </div>
        </PassMain>
        <Perforation />
        <PassStub>
          <div className="label">{nights} night{nights !== 1 ? 's' : ''} × {money(h.pricePerNightPaise)}</div>
          <div className="money text-[24px] text-ink leading-none">{money(h.pricePerNightPaise * nights)}</div>
          <div className="text-[12px] text-[rgb(var(--text-secondary))] mb-1">for the stay</div>
          <Button size="sm" onClick={() => setOpen(true)} className="w-full">Change hotel</Button>
          <Button size="sm" variant="secondary" className="w-full" onClick={() => setOpen(true)}>Change room</Button>
        </PassStub>
      </Pass>
      <ChangeHotelModal
        open={open}
        onClose={() => setOpen(false)}
        cityCode={cityCode}
        cityName={cityName}
        currentHotelId={h.id}
        onPick={onChange}
        checkIn={stay.checkIn}
        checkOut={stay.checkOut}
        rooms={rooms}
      />
    </>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
