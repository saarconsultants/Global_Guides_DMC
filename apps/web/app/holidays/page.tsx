import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { Plane, Users, CalendarRange, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const SECTIONS = [
  {
    href: '/holidays/fit',
    icon: Plane,
    eyebrow: 'FIT',
    title: 'FIT packages',
    body: 'Free Independent Traveller — fully tailored, family-of-4 style trips with private transfers and chosen hotels.',
    cta: 'Browse FIT inventory',
    pill: { variant: 'success' as const, label: 'Most popular' },
  },
  {
    href: '/holidays/group',
    icon: Users,
    eyebrow: 'GIT',
    title: 'Group tours',
    body: 'Pre-set departure dates that pool customers from many agencies. Lower per-head cost, fixed itinerary.',
    cta: 'See upcoming departures',
    pill: { variant: 'info' as const, label: 'Fixed dates' },
  },
  {
    href: '/holidays/adhoc',
    icon: CalendarRange,
    eyebrow: 'Custom',
    title: 'Ad-hoc group',
    body: 'Build a private group quote (15+ pax) — weddings, corporate offsites, college tours. We help you source net rates.',
    cta: 'Request a quote',
    pill: { variant: 'warning' as const, label: 'Quote-based' },
  },
];

export default function HolidaysPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10 space-y-6">
      <PageHeader
        eyebrow="Holidays"
        title="What kind of trip are you putting together?"
        description="Pick the product type that fits your customer. Each one has its own pricing model, inventory pool, and turnaround time."
      />

      <div className="grid gap-4 md:grid-cols-3 stagger">
        {SECTIONS.map(({ href, icon: Icon, eyebrow, title, body, cta, pill }) => (
          <Card key={href} className="lift group">
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-md bg-gradient-to-br from-crimson-700 to-crimson-900 text-white inline-flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <Pill variant={pill.variant}>{pill.label}</Pill>
              </div>
              <p className="text-[10px] uppercase tracking-widest text-[rgb(var(--text-secondary))] font-bold">{eyebrow}</p>
              <h2 className="text-lg font-bold text-navy-900">{title}</h2>
              <p className="text-sm text-[rgb(var(--text-secondary))] leading-relaxed">{body}</p>
              <Link href={href as any} className="inline-flex">
                <Button variant="ghost" className="gap-1.5 group-hover:text-crimson-700 px-0">{cta}<ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" /></Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
