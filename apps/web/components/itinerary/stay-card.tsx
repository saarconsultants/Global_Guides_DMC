'use client';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { ChangeHotelModal } from './change-hotel-modal';
import type { Hotel, Stay } from '@/lib/itinerary/types';
import { formatINR } from '@/lib/utils';
import { Star, Check } from 'lucide-react';

interface Props {
  cityCode: string;
  cityName: string;
  nights: number;
  stay: Stay;
  onChange: (h: Hotel) => void;
}

export function StayCard({ cityCode, cityName, nights, stay, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const h = stay.hotel;
  return (
    <>
      <h3 className="text-lg font-semibold text-navy-900 mb-3">Stay in {cityName} {nights} night{nights !== 1 ? 's' : ''}</h3>
      <Card>
        <CardContent className="pt-5">
          <div className="grid gap-4 md:grid-cols-[120px_1fr_auto]">
            <div className="w-[120px] h-[120px] rounded-md bg-gradient-to-br from-navy-500 to-navy-900 text-white/60 text-xs flex items-center justify-center">Hotel photo</div>
            <div>
              <div className="flex items-center gap-1 text-gold-500">{Array.from({ length: h.stars }).map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-gold-500" />)}</div>
              <h4 className="font-semibold text-navy-900 mt-0.5">{h.name} <button className="text-xs text-crimson-700 font-normal hover:underline ml-1">view</button></h4>
              <p className="text-xs text-[rgb(var(--text-secondary))]">{h.address}</p>
              {h.rating && (
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-crimson-900 text-white font-semibold text-xs">{h.rating.score}</span>
                  <span className="text-[rgb(var(--text-secondary))] text-xs">{h.rating.label} · {h.rating.reviewCount} ratings</span>
                </div>
              )}
              <div className="mt-3 grid grid-cols-2 gap-4 py-2 border-t border-border-subtle text-sm">
                <div><p className="text-[10px] uppercase tracking-widest text-[rgb(var(--text-secondary))] font-bold">Check-in</p><p className="font-medium">{fmt(stay.checkIn)}</p></div>
                <div><p className="text-[10px] uppercase tracking-widest text-[rgb(var(--text-secondary))] font-bold">Check-out</p><p className="font-medium">{fmt(stay.checkOut)}</p></div>
              </div>
              <div className="mt-2 space-y-1 text-sm">
                <p className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-success-500" /><span>Selected Room: <strong>{h.room.name}</strong></span></p>
                <p className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-success-500" /><span>{h.mealPlan}</span></p>
                {h.refundable && <p className="text-danger-500 text-xs">Fully refundable before check-in</p>}
              </div>
            </div>
            <div className="flex flex-col gap-2 self-center">
              <p className="text-xs text-[rgb(var(--text-secondary))]">{nights} × {formatINR(h.pricePerNightPaise)}/night</p>
              <p className="font-mono font-bold text-lg text-navy-900 text-right">{formatINR(h.pricePerNightPaise * nights)}</p>
              <Button size="sm" variant="brick" onClick={() => setOpen(true)}>Change Hotel</Button>
              <Pill variant="neutral" className="text-center justify-center">Change Room</Pill>
            </div>
          </div>
        </CardContent>
      </Card>
      <ChangeHotelModal open={open} onClose={() => setOpen(false)} cityCode={cityCode} cityName={cityName} currentHotelId={h.id} onPick={onChange} />
    </>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
