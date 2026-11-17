// Which live supplier a hotel comes from. Client-safe (no supplier imports).
export type HotelSupplier = 'Hotelbeds' | 'Unifystays';

export function hotelSupplier(id: string): HotelSupplier | null {
  if (id.startsWith('HB-')) return 'Hotelbeds';
  if (id.startsWith('US-')) return 'Unifystays';
  return null;
}

export const isLiveHotelId = (id: string) => hotelSupplier(id) !== null;
