'use client';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { Plus } from 'lucide-react';

export function SelectHotelButton({ hotelName }: { hotelName: string }) {
  return (
    <Button
      className="mt-3 w-full gap-1.5"
      onClick={() =>
        toast.info(
          'Hotel noted',
          `Open this search from inside an itinerary to swap "${hotelName}" into a stay. (Standalone hotel-add coming next release.)`,
        )
      }
    >
      <Plus className="w-4 h-4" />Select
    </Button>
  );
}
