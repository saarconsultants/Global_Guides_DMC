import { db } from '@/lib/db/client';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { formatINR } from '@/lib/utils';
import { Plane, Sparkles } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function FITPackagesPage() {
  const templates = await db.itineraryTemplate.findMany({
    where: { published: true },
    orderBy: { createdAt: 'desc' },
    take: 24,
  });

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/holidays" className="text-[rgb(var(--text-secondary))] hover:text-navy-900">Holidays</Link>
        <span className="text-[rgb(var(--text-tertiary))]">›</span>
        <span className="text-navy-900 font-medium">FIT packages</span>
      </div>
      <PageHeader
        eyebrow="Free Independent Traveller"
        title="FIT packages"
        description="Privately curated trips for individuals, couples, and families. Every quote is built from net hotel and transfer rates with your markup applied — no fixed-date constraints."
        actions={<Link href="/itinerary/new"><Button className="gap-1.5"><Sparkles className="w-4 h-4" />Start new FIT proposal</Button></Link>}
      />

      {templates.length === 0 ? (
        <EmptyState
          icon={<Plane className="w-7 h-7" />}
          title="No FIT templates yet"
          body="Once the platform publishes itinerary templates, they'll show up here as starting points for your own quotes."
          primary={{ label: 'Build from scratch', href: '/itinerary/new' }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger">
          {templates.map((t) => (
            <Card key={t.id} className="lift">
              <CardContent className="pt-5 space-y-2">
                <div className="flex items-center justify-between">
                  <Pill variant="neutral">{t.totalNights}N</Pill>
                  <span className="font-mono text-xs text-[rgb(var(--text-secondary))]">{t.destinations}</span>
                </div>
                <h3 className="text-base font-semibold text-navy-900">{t.title}</h3>
                <p className="text-sm text-[rgb(var(--text-secondary))] line-clamp-2">A handpicked itinerary you can clone and customise.</p>
                <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
                  <span className="font-mono text-sm font-bold text-crimson-900">From {formatINR(t.startingPricePaise)}</span>
                  <Link href={`/itinerary/template/${t.id}` as any}><Button size="sm" variant="secondary">Clone</Button></Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
