'use client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

/**
 * Starts a new trip in the builder for this hotel's city, prefilled with the
 * searched dates and guests. The builder picks hotels itself, so the exact
 * property can be swapped in from the trip's Stays section afterwards.
 */
export function SelectHotelButton({ hotelName, cityCode, checkin, nights, adults }: {
  hotelName: string; cityCode: string; checkin?: string; nights: number; adults?: string;
}) {
  const router = useRouter();
  function start() {
    const qs = new URLSearchParams({ dest: cityCode, nights: String(nights) });
    if (checkin) qs.set('date', checkin);
    if (adults) qs.set('adults', adults);
    router.push(`/itinerary/new?${qs.toString()}` as any);
  }
  return (
    <Button className="mt-2 w-full gap-1.5" onClick={start} aria-label={`Plan a trip in this city, starting from ${hotelName}`}>
      <Plus className="w-4 h-4" />Plan a trip here
    </Button>
  );
}
