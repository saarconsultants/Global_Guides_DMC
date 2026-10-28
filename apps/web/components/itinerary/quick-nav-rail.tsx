'use client';
import { Plane, Banknote, Bed, Car, Shield } from 'lucide-react';

// Each key jumps to the element with id `section-${key}` on the customize page.
// Transfers are added per day, so "Transfers" lands on the Day by day section.
const items = [
  { key: 'flights', icon: Plane,    label: 'Flights' },
  { key: 'price',   icon: Banknote, label: 'Price' },
  { key: 'stays',   icon: Bed,      label: 'Stays' },
  { key: 'days',    icon: Car,      label: 'Transfers' },
  { key: 'ins',     icon: Shield,   label: 'Insurance' },
] as const;

export function QuickNavRail() {
  function jump(key: string) {
    const el = document.getElementById(`section-${key}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  return (
    // Visible labels, only where there is room beside the content column
    // (≥1536px); below that the page is short enough to scroll and the price
    // rail already sits at the top.
    <nav aria-label="Jump to section" className="hidden 2xl:flex fixed left-4 top-1/2 -translate-y-1/2 z-30 flex-col gap-1 p-1.5 rounded-lg bg-surface border border-border-subtle shadow-sm">
      {items.map(({ key, icon: Icon, label }) => (
        <button key={key} type="button" onClick={() => jump(key)} className="h-9 pl-2.5 pr-3 inline-flex items-center gap-2 rounded-md text-[12.5px] font-bold text-navy-700 hover:bg-crimson-50 hover:text-crimson-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-500">
          <Icon className="w-4 h-4 shrink-0" aria-hidden />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
