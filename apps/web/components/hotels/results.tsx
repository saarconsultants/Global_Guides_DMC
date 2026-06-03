'use client';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { Input } from '@/components/ui/input';
import { useMoney } from '@/components/providers/currency-provider';
import type { Hotel } from '@/lib/itinerary/types';
import { Star, Search } from 'lucide-react';
import Link from 'next/link';
import { SelectHotelButton } from './select-hotel-button';
import { HotelPhoto } from './hotel-photo';

interface Props {
  hotels: Hotel[];
  nights: number;
}

export function HotelResults({ hotels, nights }: Props) {
  const money = useMoney();
  const [q, setQ] = useState('');

  if (!hotels.length) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-[rgb(var(--text-secondary))]">No hotels found for this city.</CardContent>
      </Card>
    );
  }

  const query = q.trim().toLowerCase();
  const filtered = query
    ? hotels.filter((h) => h.name.toLowerCase().includes(query) || h.address.toLowerCase().includes(query))
    : hotels;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--text-tertiary))]" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by hotel name or area…" className="pl-9" />
        </div>
        <p className="text-sm text-[rgb(var(--text-secondary))]">{filtered.length}{query ? ` of ${hotels.length}` : ''} options · {nights} night{nights !== 1 ? 's' : ''}</p>
      </div>
      {filtered.length === 0 && (
        <Card><CardContent className="py-10 text-center text-sm text-[rgb(var(--text-secondary))]">No hotels match “{q}”. <button onClick={() => setQ('')} className="text-crimson-700 hover:underline">Clear</button></CardContent></Card>
      )}
      {filtered.map((h) => (
        <Card key={h.id}>
          <CardContent className="pt-5">
            <div className="grid gap-4 md:grid-cols-[140px_1fr_auto]">
              <HotelPhoto
                thumb={h.thumb}
                allImages={h.allImages}
                hotelName={h.name}
                className="w-[140px] h-[140px] rounded-md"
                placeholder={<div className="w-[140px] h-[140px] rounded-md bg-gradient-to-br from-navy-500 to-navy-900 text-white/60 text-xs flex items-center justify-center">Hotel photo</div>}
              />
              <div>
                <div className="flex items-center gap-1 text-gold-500">{Array.from({ length: h.stars }).map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-gold-500" />)}</div>
                <h3 className="font-semibold text-navy-900 text-lg mt-0.5 inline-flex items-center gap-2">
                  {h.id.startsWith('HB-') ? (
                    <Link href={`/hotels/${h.id}` as any} className="hover:text-crimson-700 hover:underline underline-offset-2">{h.name}</Link>
                  ) : (
                    h.name
                  )}
                  {h.id.startsWith('HB-') && <Pill variant="success">LIVE</Pill>}
                </h3>
                <p className="text-xs text-[rgb(var(--text-secondary))]">{h.address}</p>
                {h.rating && (
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-crimson-900 text-white font-semibold text-xs">{h.rating.score}</span>
                    <span className="text-[rgb(var(--text-secondary))] text-xs">{h.rating.label} · {h.rating.reviewCount} ratings</span>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {h.refundable && <Pill variant="success">Fully refundable</Pill>}
                  <Pill variant="neutral">{h.mealPlan}</Pill>
                  <Pill variant="neutral">{h.room.name}</Pill>
                </div>
              </div>
              <div className="md:text-right md:border-l md:border-border-subtle md:pl-6">
                <p className="text-xs text-[rgb(var(--text-secondary))]">from / night</p>
                <p className="text-2xl font-bold text-navy-900 font-mono tabular-nums">{money(h.pricePerNightPaise)}</p>
                <p className="text-xs text-[rgb(var(--text-secondary))]">Total: {money(h.pricePerNightPaise * nights)}</p>
                <SelectHotelButton hotelName={h.name} />
              </div>
            </div>

            {h.roomOptions && h.roomOptions.length > 1 && (
              <details className="mt-3 group/rooms">
                <summary className="cursor-pointer text-xs font-medium text-crimson-700 hover:underline select-none">
                  View {h.roomOptions.length} room &amp; board options
                </summary>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wider text-[rgb(var(--text-secondary))] border-b border-border-subtle">
                        <th className="py-1.5 pr-3 font-semibold">Room</th>
                        <th className="py-1.5 pr-3 font-semibold">Board</th>
                        <th className="py-1.5 pr-3 font-semibold">Cancellation</th>
                        <th className="py-1.5 pr-3 font-semibold text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {h.roomOptions.map((r, i) => (
                        <tr key={i} className="border-b border-border-subtle/50">
                          <td className="py-1.5 pr-3">{r.roomName}</td>
                          <td className="py-1.5 pr-3">{r.board}</td>
                          <td className="py-1.5 pr-3">{r.refundable ? <span className="text-success-500">Refundable</span> : <span className="text-[rgb(var(--text-tertiary))]">Non-refundable</span>}</td>
                          <td className="py-1.5 pr-3 text-right font-mono">{money(r.totalPaise)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
