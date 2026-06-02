import { Card, CardContent } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { formatINR } from '@/lib/utils';
import type { Hotel } from '@/lib/itinerary/types';
import { Star } from 'lucide-react';
import { SelectHotelButton } from './select-hotel-button';

interface Props {
  hotels: Hotel[];
  nights: number;
}

export function HotelResults({ hotels, nights }: Props) {
  if (!hotels.length) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-[rgb(var(--text-secondary))]">No hotels found for this city.</CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-[rgb(var(--text-secondary))]">{hotels.length} options · {nights} night{nights !== 1 ? 's' : ''}</p>
      {hotels.map((h) => (
        <Card key={h.id}>
          <CardContent className="pt-5">
            <div className="grid gap-4 md:grid-cols-[140px_1fr_auto]">
              {h.thumb ? (
                <img
                  src={h.thumb}
                  alt={h.name}
                  loading="lazy"
                  className="w-[140px] h-[140px] rounded-md object-cover bg-navy-900"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div className="w-[140px] h-[140px] rounded-md bg-gradient-to-br from-navy-500 to-navy-900 text-white/60 text-xs flex items-center justify-center">Hotel photo</div>
              )}
              <div>
                <div className="flex items-center gap-1 text-gold-500">{Array.from({ length: h.stars }).map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-gold-500" />)}</div>
                <h3 className="font-semibold text-navy-900 text-lg mt-0.5 inline-flex items-center gap-2">
                  {h.name}
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
                <p className="text-xs text-[rgb(var(--text-secondary))]">per night</p>
                <p className="text-2xl font-bold text-navy-900 font-mono tabular-nums">{formatINR(h.pricePerNightPaise)}</p>
                <p className="text-xs text-[rgb(var(--text-secondary))]">Total: {formatINR(h.pricePerNightPaise * nights)}</p>
                <SelectHotelButton hotelName={h.name} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
