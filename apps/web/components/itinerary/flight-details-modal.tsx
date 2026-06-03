'use client';
import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plane } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  kind: 'arrival' | 'departure';
  cityName: string;
  initial?: { flightNumber: string; time: string };
  // True when `initial` was auto-filled from the flight attached via Flights search
  // (rather than from previously-saved details). Controls the hint text.
  prefilled?: boolean;
  onSave: (details: { flightNumber: string; time: string }) => void;
}

export function FlightDetailsModal({ open, onClose, kind, cityName, initial, prefilled, onSave }: Props) {
  const [flightNumber, setFlightNumber] = useState(initial?.flightNumber ?? '');
  const [time, setTime] = useState(initial?.time ?? '');
  const verb = kind === 'arrival' ? 'Arrival' : 'Departure';

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!flightNumber.trim() || !time) return;
    onSave({ flightNumber: flightNumber.trim().toUpperCase(), time });
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title={`${verb} flight details — ${cityName}`} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-[rgb(var(--text-secondary))]">
          {kind === 'arrival'
            ? `What flight is the customer arriving on? This tells our ops team when to schedule the airport pickup in ${cityName}.`
            : `What flight is the customer departing on? This sets the airport drop-off time from ${cityName}.`}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label required>Flight number</Label>
            <div className="relative">
              <Plane className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--text-tertiary))]" />
              <Input
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
                placeholder="e.g. AI131"
                className="pl-9 font-mono uppercase"
                maxLength={10}
                required
              />
            </div>
          </div>
          <div>
            <Label required>{verb} time (local)</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
          </div>
        </div>

        {prefilled ? (
          <div className="rounded-md bg-success-500/10 border border-success-500/30 px-3 py-2 text-xs text-success-600">
            ✓ Pre-filled from the flight you attached via Flights search. Edit if the customer is on a different flight.
          </div>
        ) : (
          <div className="rounded-md bg-surface-2 border border-border-subtle px-3 py-2 text-xs text-[rgb(var(--text-secondary))]">
            💡 If you've already attached a flight via Flights search, copy the {kind === 'arrival' ? 'last leg arrival' : 'first leg departure'} time here so the transfer matches.
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!flightNumber.trim() || !time}>Save details</Button>
        </div>
      </form>
    </Dialog>
  );
}
