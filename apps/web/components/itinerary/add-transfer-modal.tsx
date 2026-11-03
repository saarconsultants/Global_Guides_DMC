'use client';
import { useState, useEffect, useRef } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { Spinner } from '@/components/ui/spinner';
import { useMoney } from '@/components/providers/currency-provider';
import { sampleTransferOptions } from '@/lib/itinerary/mock-inventory';
import type { Transfer, TransferVehicle } from '@/lib/itinerary/types';
import { Car } from 'lucide-react';
import { TransferSupplierDetails, TransferSupplierPhoto } from './transfer-supplier-info';

interface Props {
  open: boolean;
  onClose: () => void;
  kind: 'arrival' | 'departure' | 'inter-city';
  cityCode: string;
  cityName: string;
  fromCityCode?: string;            // inter-city only
  fromCityName?: string;
  airportCode?: string;
  airportName?: string;
  hotelAtlasCode?: string;          // Hotelbeds hotel code from HB- prefix
  hotelName?: string;
  /** Supplier coordinates of the hotel — lets Leamigo quote this leg. */
  hotel?: { address?: string; latitude?: number; longitude?: number };
  /** HH:mm pickup, from the attached flight when known. */
  pickupTime?: string;
  pickupDate: string;               // YYYY-MM-DD
  adults: number;
  children?: number;
  current?: Transfer;               // set when changing a transfer already on the trip
  onPick: (t: Transfer) => void;
}

type Source = 'live' | 'mock' | 'loading';
type VehicleClass = 'ALL' | TransferVehicle;

const CLASSES: Array<{ key: VehicleClass; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'SHARED', label: 'Shared' },
  { key: 'PRIVATE', label: 'Private' },
  { key: 'PRIVATE_PREMIUM', label: 'Premium' },
];

export function AddTransferModal({ open, onClose, kind, cityCode, cityName, fromCityCode, fromCityName, airportCode, airportName, hotelAtlasCode, hotelName, hotel, pickupTime, pickupDate, adults, children = 0, current, onPick }: Props) {
  const money = useMoney();
  const [alternatives, setAlternatives] = useState<Transfer[]>([]);
  const [source, setSource] = useState<Source>('loading');
  const [warning, setWarning] = useState<string | undefined>();
  const [vehicleClass, setVehicleClass] = useState<VehicleClass>('ALL');
  const requestId = useRef(0);

  useEffect(() => {
    if (!open) return;
    const myReq = ++requestId.current;
    setSource('loading');
    setWarning(undefined);
    setVehicleClass('ALL');

    fetch('/api/search-transfers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind, airportCode, airportName, hotelAtlasCode, cityCode, fromCityCode,
        hotel: hotelName ? { name: hotelName, address: hotel?.address, latitude: hotel?.latitude, longitude: hotel?.longitude } : undefined,
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
        if (r.warning) console.error("[supplier-search]", r.warning);
        setWarning(r.source === 'live' ? undefined : r.warning);
        setAlternatives(r.alternatives);
      })
      .catch((e) => {
        if (myReq !== requestId.current) return;
        setSource('mock');
        console.error("[supplier-search]", e); setWarning(String(e?.message ?? e));
        setAlternatives([]);
      });
  }, [open, kind, airportCode, hotelAtlasCode, cityCode, fromCityCode, pickupDate, pickupTime, adults, children, airportName, hotelName, hotel?.latitude, hotel?.longitude, hotel?.address]);

  const place = hotelName ?? `${cityName} centre`;
  const airport = airportName ?? airportCode ?? 'Airport';
  const fromName = kind === 'inter-city' ? `${fromCityName ?? 'City'} (City)` : kind === 'arrival' ? airport : place;
  const toName = kind === 'inter-city' ? `${cityName} (City)` : kind === 'arrival' ? place : airport;
  const title = kind === 'arrival' ? 'Arrival transfer' : kind === 'departure' ? 'Departure transfer' : 'Inter-city transfer';

  // No live ride on this route: offer every class at a sample price, clearly marked.
  const live = alternatives.length > 0;
  const options = live ? alternatives : sampleTransferOptions(kind, fromName, toName);
  const shown = vehicleClass === 'ALL' ? options : options.filter((t) => t.vehicle === vehicleClass);
  const isCurrent = (t: Transfer) => !!current && (t.id === current.id || (current.id.startsWith('tx_') && t.id.startsWith('tx_') && t.vehicle === current.vehicle));

  return (
    <Dialog open={open} onClose={onClose} title={`${title} — ${cityName}`} size="lg">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="text-xs text-[rgb(var(--text-secondary))]">{fromName} → {toName}</p>
        {source === 'live' && live && <Pill variant="success">{alternatives.length} live option{alternatives.length !== 1 ? 's' : ''}</Pill>}
        {source !== 'loading' && !live && <Pill variant="warning">Sample prices</Pill>}
      </div>

      {source === 'loading' ? (
        <div className="text-center py-12 text-sm text-[rgb(var(--text-secondary))]">
          <Spinner size="sm" className="inline mr-2" /> Searching live transfers…
        </div>
      ) : (
        <>
          {!live && (
            <div role="status" className="rounded-md border border-warning-500/30 bg-amber-50 text-amber-700 px-3 py-2 text-xs mb-3">
              {warning ? "Live prices couldn't load. Try again in a minute." : 'No live transfers for this route and date.'} These sample prices are for quoting and can&apos;t be booked.
            </div>
          )}
          <div className="flex flex-wrap gap-2 mb-3" role="group" aria-label="Vehicle class">
            {CLASSES.map((c) => {
              const count = c.key === 'ALL' ? options.length : options.filter((t) => t.vehicle === c.key).length;
              return (
                <button key={c.key} type="button" aria-pressed={vehicleClass === c.key} onClick={() => setVehicleClass(c.key)}
                  className={`min-h-9 px-3 rounded-md border text-[13px] font-semibold transition-colors ${vehicleClass === c.key ? 'border-crimson-700 bg-crimson-50 text-crimson-700' : 'border-border bg-surface text-ink-soft hover:border-border-strong'}`}>
                  {c.label} <span className="tnum font-bold">{count}</span>
                </button>
              );
            })}
          </div>
          {shown.length === 0 ? (
            <p className="text-sm text-[rgb(var(--text-secondary))] text-center py-8">
              No {CLASSES.find((c) => c.key === vehicleClass)?.label.toLowerCase()} transfers on this route right now. See the other classes above.
            </p>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {shown.map((t) => (
                <div key={t.id} className={`p-4 rounded-md border flex items-start justify-between gap-4 ${isCurrent(t) ? 'border-crimson-500 bg-crimson-50/40' : 'border-border-subtle bg-surface'}`}>
                  <TransferSupplierPhoto info={t.supplierInfo} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink inline-flex items-center gap-2 flex-wrap">
                      <Car className="w-4 h-4 text-crimson-700" />
                      {vehicleLabel(t.vehicle)}
                      {t.id.startsWith('tx_') ? <Pill variant="warning">Sample</Pill> : <Pill variant="success">Live price</Pill>}
                    </p>
                    {t.supplierInfo ? <TransferSupplierDetails info={t.supplierInfo} /> : t.description && <p className="text-xs text-ink mt-1">{t.description}</p>}
                    <p className="text-xs text-[rgb(var(--text-secondary))] mt-1">{t.supplierInfo ? '' : `Up to ${t.bagsAllowed} bag${t.bagsAllowed === 1 ? '' : 's'} · `}Pickup on {pickupDate}{pickupTime ? ` at ${pickupTime}` : ''}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-mono font-semibold text-ink">{money(t.pricePaise)}</p>
                    <Button size="sm" className="mt-2" disabled={isCurrent(t)} onClick={() => { onPick(t); onClose(); }}>{isCurrent(t) ? 'Selected' : 'Select'}</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Dialog>
  );
}

function vehicleLabel(v: string) {
  return v === 'PRIVATE_PREMIUM' ? 'Private Premium' : v === 'PRIVATE' ? 'Private' : 'Shared shuttle';
}
