'use client';
import { useState } from 'react';
import { Pill } from '@/components/ui/pill';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { Pass, PassMain, PassStub, Perforation } from '@/components/ui/pass';
import { useMoney } from '@/components/providers/currency-provider';
import type { Hotel } from '@/lib/itinerary/types';
import { Star, Search, Hotel as HotelIcon } from 'lucide-react';
import Link from 'next/link';
import { SelectHotelButton } from './select-hotel-button';
import { HotelPhoto } from './hotel-photo';

interface Props {
  hotels: Hotel[];
  nights: number;
  checkin?: string;
  adults?: string;
}

/**
 * No supplier photo: an ink plate carrying the property's own facts (star band
 * and city code) rather than a grey placeholder box.
 */
function InkPlate({ stars, cityCode }: { stars: number; cityCode: string }) {
  return (
    <div className="w-full h-full rounded-md bg-ink text-white flex flex-col items-center justify-center gap-2">
      <span className="inline-flex items-center gap-0.5 text-amber-500" aria-hidden>
        {Array.from({ length: stars }).map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-500" />)}
      </span>
      <span className="font-mono text-[15px] font-bold tracking-[0.06em] tnum">{cityCode}</span>
    </div>
  );
}

/** "08 Nov, 23:59" — first date a cancellation fee applies (hotel local time, as supplied). */
function freeUntil(policies?: Array<{ from: string }>): string | null {
  const first = [...(policies ?? [])].sort((a, b) => a.from.localeCompare(b.from))[0];
  const m = first?.from.match(/^\d{4}-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m[1]! - 1];
  return `${m[2]} ${mon}, ${m[3]}:${m[4]}`;
}

export function HotelResults({ hotels, nights, checkin, adults }: Props) {
  const money = useMoney();
  const [q, setQ] = useState('');

  if (!hotels.length) {
    return <EmptyState icon={<HotelIcon className="w-5 h-5" />} title="No rooms in this city for these dates" body="Try shifting the dates by a day, or widen the star and board filters." />;
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
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by hotel name or area" className="pl-9" />
        </div>
        <p className="text-sm text-[rgb(var(--text-secondary))]"><span className="font-bold text-ink tnum">{filtered.length}</span>{query ? ` of ${hotels.length}` : ''} properties · <span className="tnum">{nights}</span> night{nights !== 1 ? 's' : ''}</p>
      </div>
      {filtered.length === 0 && (
        <EmptyState dense title={`Nothing matches “${q}”`} body="Try a shorter name or the neighbourhood." secondary={{ label: 'Clear filter', onClick: () => setQ('') }} />
      )}
      {filtered.map((h) => (
        <Pass key={h.id} className="lift">
          <PassMain className="flex gap-4 lg:gap-5">
            <div className="w-[128px] h-[128px] lg:w-[150px] lg:h-[150px] shrink-0 rounded-md overflow-hidden">
              <HotelPhoto thumb={h.thumb} allImages={h.allImages} hotelName={h.name} className="w-full h-full rounded-md" placeholder={<InkPlate stars={h.stars} cityCode={h.cityCode} />} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-0.5 text-amber-500" aria-label={`${h.stars} star`}>{Array.from({ length: h.stars }).map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-500" />)}</span>
                {h.id.startsWith('HB-') && <Pill variant="live">Live</Pill>}
              </div>
              <h3 className="mt-1 text-[17px] font-bold text-ink tracking-[-0.01em] leading-tight">
                {h.id.startsWith('HB-') ? <Link href={`/hotels/${h.id}` as any} className="hover:text-crimson-700">{h.name}</Link> : h.name}
              </h3>
              <p className="mt-0.5 text-[12.5px] text-[rgb(var(--text-secondary))] truncate">{h.address}</p>
              {h.rating && (
                <div className="mt-2 flex items-center gap-2 text-[13px]">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-[5px] bg-ink text-white font-bold text-[12px] tnum">{h.rating.score}</span>
                  <span className="text-[rgb(var(--text-secondary))]">{h.rating.label} · <span className="tnum">{h.rating.reviewCount}</span> ratings</span>
                </div>
              )}
              <div className="mt-3 grid grid-cols-3 gap-3 max-w-md">
                <div><div className="label">Board</div><div className="mt-0.5 text-[13px] font-bold text-ink truncate">{h.mealPlan}</div></div>
                <div><div className="label">Room</div><div className="mt-0.5 text-[13px] font-bold text-ink truncate">{h.room.name}</div></div>
                <div><div className="label">Cancellation</div>{(() => {
                  const until = h.refundable ? freeUntil(h.roomOptions?.[0]?.cancellationPolicies) : null;
                  return <div className={`mt-0.5 text-[13px] font-bold truncate ${h.refundable ? 'text-success-600' : 'text-[rgb(var(--text-secondary))]'}`} title={until ? 'Hotel local time' : undefined}>{until ? `Free until ${until}` : h.refundable ? 'Fully refundable' : 'Non-refundable'}</div>;
                })()}</div>
              </div>
              {h.roomOptions && h.roomOptions.length > 1 && (
                <details className="mt-3 group/rooms">
                  <summary className="cursor-pointer text-[12.5px] font-bold text-crimson-700 hover:underline select-none">{h.roomOptions.length} room and board options</summary>
                  <div className="mt-2 overflow-x-auto">
                    <table className="gg-table text-[12.5px]">
                      <thead><tr><th>Room</th><th>Board</th><th>Cancellation</th><th className="text-right">Total</th></tr></thead>
                      <tbody>
                        {h.roomOptions.map((r, i) => (
                          <tr key={i}><td>{r.roomName}</td><td>{r.board}</td><td>{r.refundable ? <span className="text-success-600 font-semibold">{freeUntil(r.cancellationPolicies) ? `Free until ${freeUntil(r.cancellationPolicies)}` : 'Refundable'}</span> : <span className="text-[rgb(var(--text-tertiary))]">Non-refundable</span>}{r.promotions?.[0]?.name && <span className="ml-2"><Pill variant="live">{r.promotions[0].name}</Pill></span>}</td><td className="text-right money">{money(r.totalPaise)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
            </div>
          </PassMain>
          <Perforation />
          <PassStub>
            <div className="label">Per night</div>
            <div className="money text-[24px] text-ink leading-none">{money(h.pricePerNightPaise)}</div>
            <div className="text-[12px] text-[rgb(var(--text-secondary))] tnum">{money(h.pricePerNightPaise * nights)} for {nights} night{nights !== 1 ? 's' : ''}</div>
            <SelectHotelButton hotelName={h.name} cityCode={h.cityCode} checkin={checkin} nights={nights} adults={adults} />
          </PassStub>
        </Pass>
      ))}
    </div>
  );
}
