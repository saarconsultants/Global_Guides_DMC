import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarRange } from 'lucide-react';
import Link from 'next/link';
import { requireAgency } from '@/lib/auth/ctx';
import { AdhocGroupForm } from './adhoc-form';

export const dynamic = 'force-dynamic';

export default async function AdhocGroupPage() {
  await requireAgency();
  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/holidays" className="text-[rgb(var(--text-secondary))] hover:text-ink">Holidays</Link>
        <span className="text-[rgb(var(--text-tertiary))]">›</span>
        <span className="text-ink font-medium">Ad-hoc group</span>
      </div>
      <PageHeader
        eyebrow="Ad-hoc group"
        title="Custom group quote (15+ pax)"
        description="Tell us the destination, dates, and rough group size. Our ops team comes back with net rates within 48 hours so you can pitch a custom package."
      />

      <Card>
        <CardContent className="pt-6">
          <AdhocGroupForm />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5 text-xs text-[rgb(var(--text-secondary))]">
          <strong className="text-ink inline-flex items-center gap-1.5"><CalendarRange className="w-3.5 h-3.5" />What happens next</strong>
          <ol className="mt-2 space-y-1 list-decimal list-inside">
            <li>Ops cross-checks net rates from our DMC network in the destination.</li>
            <li>You get a costed quote sheet (per-pax in twin / single / extra-bed).</li>
            <li>Lock seats with 25% deposit — we hold inventory for 14 days.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
