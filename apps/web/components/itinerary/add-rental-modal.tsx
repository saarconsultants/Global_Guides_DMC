'use client';
// Car with driver at disposal (Leamigo hourly rental) from the day's hotel.
import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { Spinner } from '@/components/ui/spinner';
import { useMoney } from '@/components/providers/currency-provider';
import type { Transfer } from '@/lib/itinerary/types';
import { Car } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  cityName: string;
  hotelName: string;
  hotel: { address?: string; latitude: number; longitude: number };
  date: string;
  passengers: number;
  onPick: (t: Transfer) => void;
}

const HOURS = [4, 6, 8, 10, 12];

export function AddRentalModal({ open, onClose, cityName, hotelName, hotel, date, passengers, onPick }: Props) {
  const money = useMoney();
  const [hours, setHours] = useState(8);
  const [time, setTime] = useState('09:00');
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [rentals, setRentals] = useState<Transfer[]>([]);
  const [warning, setWarning] = useState<string | undefined>();

  async function search() {
    setState('loading'); setWarning(undefined);
    try {
      const r = await fetch('/api/search-rentals', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotel: { name: hotelName, ...hotel }, pickupDate: date, pickupTime: time, hours, passengers }) }).then((x) => x.json());
      setRentals(r.ok ? r.rentals : []);
      const problem = r.ok ? r.warning : r.error;
      if (problem) console.error('[rental-search]', problem);
      setWarning(problem ? 'Live prices couldn\'t load. Try again in a minute.' : undefined);
    } catch (e: any) {
      console.error('[rental-search]', e);
      setRentals([]); setWarning('Live prices couldn\'t load. Try again in a minute.');
    }
    setState('done');
  }

  return (
    <Dialog open={open} onClose={onClose} title={`Car with driver — ${cityName}`} size="lg">
      <p className="text-xs text-[rgb(var(--text-secondary))] mb-3">Pickup at {hotelName} on {date} · {passengers} passenger{passengers !== 1 ? 's' : ''}</p>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <label className="text-xs"><span className="label block mb-1">Start</span>
          <input type="time" className="control" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
        <div className="text-xs"><span className="label block mb-1">Hours</span>
          <div className="flex gap-1">{HOURS.map((h) => (
            <button key={h} type="button" onClick={() => setHours(h)} aria-pressed={hours === h}
              className={`px-3 py-1.5 rounded-md border text-sm ${hours === h ? 'bg-ink text-white border-ink' : 'border-border-subtle'}`}>{h}h</button>
          ))}</div>
        </div>
        <Button onClick={search} disabled={state === 'loading' || !/^\d{2}:\d{2}$/.test(time)}>Search</Button>
      </div>

      {warning && <div className="rounded-md border border-warning-500/30 bg-amber-50 text-amber-700 px-3 py-2 text-xs mb-3">{warning}</div>}

      {state === 'loading' ? (
        <div className="text-center py-10 text-sm text-[rgb(var(--text-secondary))]"><Spinner size="sm" className="inline mr-2" />Searching live rentals…</div>
      ) : state === 'done' && rentals.length === 0 ? (
        <p className="text-sm text-[rgb(var(--text-secondary))] text-center py-8">No car-with-driver options for this time. Try a different start time or length.</p>
      ) : (
        <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-2">
          {rentals.map((t) => (
            <div key={t.id} className="p-4 rounded-md border border-border-subtle bg-surface flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ink inline-flex items-center gap-2"><Car className="w-4 h-4 text-crimson-700" />{t.leamigoRental?.vehicleName}<Pill variant="success">Live price</Pill></p>
                {t.description && <p className="text-xs text-[rgb(var(--text-secondary))] mt-1">{t.description}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-mono font-semibold text-ink">{money(t.pricePaise)}</p>
                <Button size="sm" className="mt-2" onClick={() => { onPick(t); onClose(); }}>Select</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Dialog>
  );
}
