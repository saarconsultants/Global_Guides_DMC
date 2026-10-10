'use client';
import { useState, useEffect, useRef } from 'react';
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
  kind: 'arrival' | 'departure';
  cityCode: string;
  cityName: string;
  airportCode?: string;
  airportName?: string;
  hotelAtlasCode?: string;          // Hotelbeds hotel code from HB- prefix
  hotelName: string;
  /** Supplier coordinates of the hotel — lets Leamigo quote this leg. */
  hotel?: { address?: string; latitude?: number; longitude?: number };
  /** HH:mm pickup, from the attached flight when known. */
  pickupTime?: string;
  pickupDate: string;               // YYYY-MM-DD
  adults: number;
  children?: number;
  onPick: (t: Transfer) => void;
}

type Source = 'live' | 'mock' | 'loading';

export function AddTransferModal({ open, onClose, kind, cityCode, cityName, airportCode, airportName, hotelAtlasCode, hotelName, hotel, pickupTime, pickupDate, adults, children = 0, onPick }: Props) {
  const money = useMoney();
  const [alternatives, setAlternatives] = useState<Transfer[]>([]);
  const [source, setSource] = useState<Source>('mock');
  const [warning, setWarning] = useState<string | undefined>();
  const requestId = useRef(0);

  useEffect(() => {
    const hasCoords = typeof hotel?.latitude === 'number' && typeof hotel?.longitude === 'number';
    if (!open || !airportCode || (!hotelAtlasCode && !hasCoords)) return;
    const myReq = ++requestId.current;
    setSource('loading');
    setWarning(undefined);


    fetch('/api/search-transfers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind, airportCode, airportName, hotelAtlasCode,
        hotel: { name: hotelName, address: hotel?.address, latitude: hotel?.latitude, longitude: hotel?.longitude },
        pickupDate, pickupTime, adults, children,
      }),
    })
      .then((res) => res.json())
      .then((r) => {
        if (myReq !== requestId.current) return;
        if (!r.ok) {
          setSource('mock');
          console.error("[supplier-search]", r.error); setWarning(r.error);
          setAlternatives([]);
          return;
        }
        setSource(r.source === 'live' ? 'live' : 'mock');
        if (r.warning) console.error("[supplier-search]", r.warning); setWarning(r.warning);
        setAlternatives(r.alternatives);
      })
      .catch((e) => {
        if (myReq !== requestId.current) return;
        setSource('mock');
        console.error("[supplier-search]", e); setWarning(String(e?.message ?? e));
        setAlternatives([]);
      });
  }, [open, kind, airportCode, hotelAtlasCode, pickupDate, pickupTime, adults, children, airportName, hotelName, hotel?.latitude, hotel?.longitude, hotel?.address]);

  const verb = kind === 'arrival' ? 'Arrival transfer' : 'Departure transfer';

  return (
    <Dialog open={open} onClose={onClose} title={`${verb} — ${cityName}`} size="lg">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-[rgb(var(--text-secondary))]">
          {kind === 'arrival' ? `${airportName ?? airportCode} → ${hotelName}` : `${hotelName} → ${airportName ?? airportCode}`}
        </p>
        {source === 'live'   && <Pill variant="success">{alternatives.length} live option{alternatives.length !== 1 ? 's' : ''}</Pill>}
        {source === 'mock'   && <Pill variant="warning">Sample prices — live rates unavailable right now</Pill>}
      </div>

      {warning && source !== 'live' && (
        <div className="rounded-md border border-warning-500/30 bg-amber-50 text-amber-700 px-3 py-2 text-xs mb-3">
          Live prices couldn&apos;t load. Try again in a minute.
        </div>
      )}

      {source === 'loading' ? (
        <div className="text-center py-12 text-sm text-[rgb(var(--text-secondary))]">
          <Spinner size="sm" className="inline mr-2" /> Searching live transfers…
        </div>
      ) : alternatives.length === 0 ? (
        <p className="text-sm text-[rgb(var(--text-secondary))] text-center py-8">
          No live transfers for this route and date. Try changing the hotel, or keep the standard private transfer already on the trip.
        </p>
      ) : (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          {alternatives.map((t) => (
            <div key={t.id} className="p-4 rounded-md border border-border-subtle bg-surface flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ink inline-flex items-center gap-2">
                  <Car className="w-4 h-4 text-crimson-700" />
                  {vehicleLabel(t.vehicle)}
                  {(t.id.startsWith('TR-') || t.id.startsWith('LM-')) && <Pill variant="success">Live price</Pill>}
                </p>
                {t.description && <p className="text-xs text-ink mt-1">{t.description}</p>}
                <p className="text-xs text-[rgb(var(--text-secondary))] mt-1">Up to {t.bagsAllowed} bags · {kind === 'arrival' ? 'Airport pickup' : 'Hotel pickup'} on {pickupDate}{pickupTime ? ` at ${pickupTime}` : ''}</p>
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

function vehicleLabel(v: string) {
  return v === 'PRIVATE_PREMIUM' ? 'Private Premium' : v === 'PRIVATE' ? 'Private' : 'Shared shuttle';
}
