import { db } from '@/lib/db/client';
import { TEMPLATE_CARD_SELECT } from '@/lib/db/templates';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { EmptyState } from '@/components/ui/empty-state';
import { Button, ButtonLink } from '@/components/ui/button';
import { getDisplayMoney } from '@/lib/money-server';
import { Plane, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { cloneAndRedirectAction } from '@/app/actions/clone-template';
import { RouteCode } from '@/components/ui/pass';

/** Template destinations are stored as JSON; pull out the city codes for the route chip. */
function cityCodes(raw: string): string[] {
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.map((d: any) => String(d?.cityCode ?? '').toUpperCase()).filter(Boolean);
  } catch {
    return [];
  }
}

export const dynamic = 'force-dynamic';

export default async function FITPackagesPage() {
  const { fmt } = await getDisplayMoney();
  const templates = await db.itineraryTemplate.findMany({
    where: { published: true },
    orderBy: { createdAt: 'desc' },
    take: 24,
    select: TEMPLATE_CARD_SELECT,
  });

  return (
    <div className="shell py-10 space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/holidays" className="hit-area text-[rgb(var(--text-secondary))] hover:text-ink">Holidays</Link>
        <span className="text-[rgb(var(--text-tertiary))]">›</span>
        <span className="text-ink font-medium">FIT packages</span>
      </div>
      <PageHeader
        eyebrow="Free Independent Traveller"
        title="FIT packages"
        description="Privately curated trips for individuals, couples, and families. Every quote is built from net hotel and transfer rates with your markup applied — no fixed-date constraints."
        actions={<ButtonLink href="/itinerary/new" className="gap-1.5"><Sparkles className="w-4 h-4" />New trip</ButtonLink>}
      />

      {templates.length === 0 ? (
        <EmptyState
          icon={<Plane className="w-7 h-7" />}
          title="No FIT templates yet"
          body="Once the platform publishes itinerary templates, they'll show up here as starting points for your own quotes."
          primary={{ label: 'Build from scratch', href: '/itinerary/new' }}
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 stagger">
          {templates.map((t) => {
            const codes = cityCodes(t.destinations);
            return (
            <Card key={t.id} className="lift min-w-0 overflow-hidden">
              <CardContent className="pt-5 space-y-2 min-w-0">
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <Pill variant="neutral" className="shrink-0">{t.totalNights}N</Pill>
                  {codes.length > 0 && <RouteCode codes={codes} className="max-w-full flex-wrap justify-end" />}
                </div>
                <h2 className="text-base font-semibold text-ink break-words">{t.title}</h2>
                <p className="text-sm text-[rgb(var(--text-secondary))] line-clamp-2">A handpicked itinerary you can clone and customise.</p>
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-border-subtle">
                  <span className="text-sm text-[rgb(var(--text-secondary))] min-w-0">From <span className="money text-[16px] text-ink">{fmt(t.startingPricePaise)}</span></span>
                  <form action={cloneAndRedirectAction.bind(null, t.id)} className="shrink-0">
                    <Button type="submit" size="sm" variant="secondary">Use this package</Button>
                  </form>
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
