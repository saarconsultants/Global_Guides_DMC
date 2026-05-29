import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Pill } from '@/components/ui/pill';
import { Button } from '@/components/ui/button';
import { BlockSeatsButton } from './block-seats-button';
import { Users, CalendarDays } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

// Demo departures — until the GIT model lands these are illustrative cards.
const DEPARTURES = [
  { code: 'GIT-BALI-NOV',   dest: 'Bali, Indonesia',   nights: 6, date: '14 Nov 2026', seats: 12, sold: 7,  price: 4990000 },
  { code: 'GIT-EUROPE-DEC', dest: 'Switzerland + Paris', nights: 9, date: '04 Dec 2026', seats: 20, sold: 15, price: 18950000 },
  { code: 'GIT-DUBAI-JAN',  dest: 'Dubai + Abu Dhabi', nights: 5, date: '11 Jan 2027', seats: 18, sold: 4,  price: 5950000 },
];

const fmt = (paise: number) => `₹ ${(paise / 100).toLocaleString('en-IN')}`;

export default function GroupToursPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10 space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/holidays" className="text-[rgb(var(--text-secondary))] hover:text-navy-900">Holidays</Link>
        <span className="text-[rgb(var(--text-tertiary))]">›</span>
        <span className="text-navy-900 font-medium">Group tours</span>
      </div>
      <PageHeader
        eyebrow="Group departures"
        title="Group tours (GIT)"
        description="Fixed-date trips that pool customers across agencies. Lock seats early — once a departure fills, it's first-come-first-served."
        actions={<Pill variant="info">Updated weekly</Pill>}
      />

      {DEPARTURES.length === 0 ? (
        <EmptyState
          icon={<Users className="w-7 h-7" />}
          title="No live departures right now"
          body="Group tours are loaded by the platform team. Check back next week or ask your account manager."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 stagger">
          {DEPARTURES.map((d) => {
            const remaining = d.seats - d.sold;
            const pct = Math.round((d.sold / d.seats) * 100);
            return (
              <Card key={d.code} className="lift">
                <CardContent className="pt-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <Pill variant={remaining < 5 ? 'warning' : 'success'}>{remaining} seats left</Pill>
                    <span className="font-mono text-[10px] text-[rgb(var(--text-secondary))]">{d.code}</span>
                  </div>
                  <h3 className="text-base font-bold text-navy-900">{d.dest}</h3>
                  <div className="flex items-center gap-2 text-xs text-[rgb(var(--text-secondary))]">
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>{d.date} · {d.nights} nights</span>
                  </div>
                  <div>
                    <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-crimson-700 to-amber-500" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-[rgb(var(--text-tertiary))] mt-1">{d.sold} of {d.seats} sold</p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
                    <span className="font-mono text-sm font-bold text-crimson-900">{fmt(d.price)} <span className="text-xs text-[rgb(var(--text-secondary))] font-normal">/ pax</span></span>
                    <BlockSeatsButton code={d.code} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
