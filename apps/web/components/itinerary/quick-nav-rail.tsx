'use client';
import { Plane, Banknote, Car, Shield } from 'lucide-react';

const items = [
  { key: 'flights', icon: Plane,    label: 'Flights' },
  { key: 'price',   icon: Banknote, label: 'Price' },
  { key: 'trans',   icon: Car,      label: 'Transfers' },
  { key: 'ins',     icon: Shield,   label: 'Insurance' },
] as const;

export function QuickNavRail() {
  function jump(key: string) {
    const el = document.getElementById(`section-${key}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  return (
    <aside className="hidden lg:flex fixed left-4 top-1/2 -translate-y-1/2 z-30 flex-col gap-2 p-2 rounded-2xl glass shadow-md">
      {items.map(({ key, icon: Icon, label }) => (
        <button key={key} onClick={() => jump(key)} title={label} aria-label={label} className="h-10 w-10 inline-flex items-center justify-center rounded-full bg-surface/80 hover:bg-crimson-50 hover:text-crimson-700 text-navy-700 transition-colors cursor-pointer">
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </aside>
  );
}
