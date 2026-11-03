'use client';
import { Pill } from '@/components/ui/pill';
import { useMoney } from '@/components/providers/currency-provider';
import type { TransferSupplierInfo } from '@/lib/itinerary/types';

export function TransferSupplierPhoto({ info }: { info?: TransferSupplierInfo }) {
  if (!info?.photo) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={info.photo} alt="" loading="lazy" className="w-24 h-16 rounded-md object-contain bg-surface-2 shrink-0"
      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
  );
}

/** Everything the supplier says about a ride: who runs it, the car, what's included, the terms. */
export function TransferSupplierDetails({ info }: { info?: TransferSupplierInfo }) {
  const money = useMoney();
  if (!info) return null;
  const facts = [
    info.operator && `Operator: ${info.operator}`,
    info.category && info.category !== info.vehicleName ? `${info.vehicleName} (${info.category})` : info.vehicleName,
    info.maxPassengers ? `Up to ${info.maxPassengers} passengers` : null,
    info.maxLuggage ? `${info.maxLuggage} bags` : null,
    info.freeWaitMin ? `${info.freeWaitMin} min free waiting` : null,
    info.kmsIncluded ? `${info.kmsIncluded} km included` : null,
    info.minimumHours ? `${info.minimumHours}h minimum` : null,
    info.distanceKm ? `About ${Math.round(info.distanceKm)} km` : null,
    info.hourlyPaise ? `${money(info.hourlyPaise)} per hour` : null,
    info.taxesPaise ? `Includes ${money(info.taxesPaise)} taxes` : null,
  ].filter(Boolean);
  return (
    <div className="mt-1 space-y-1.5">
      <p className="text-xs text-ink">{facts.join(' · ')}</p>
      {info.models && info.models.length > 0 && <p className="text-xs text-[rgb(var(--text-secondary))]">Such as {info.models.join(', ')} (model not guaranteed)</p>}
      {info.features.length > 0 && <div className="flex flex-wrap gap-1">{info.features.map((f) => <Pill key={f} variant="neutral">{f}</Pill>)}</div>}
      {info.cancellation && <p className="text-xs text-[rgb(var(--text-secondary))]">Cancellation: {info.cancellation}</p>}
      {info.extras && info.extras.length > 0 && (
        <p className="text-xs text-[rgb(var(--text-secondary))]">Optional extras, not in this price: {info.extras.map((x) => `${x.name}${x.pricePaise !== null ? ` ${money(x.pricePaise)}` : ''}`).join(', ')}</p>
      )}
      {info.policies && info.policies.length > 0 && (
        <p className="text-xs text-[rgb(var(--text-secondary))]">Policies: {info.policies.map((p) => (p.description && p.description !== p.title ? `${p.title}: ${p.description}` : p.title)).join(' · ')}</p>
      )}
    </div>
  );
}
