import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CalendarRange, Mail } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function AdhocGroupPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/holidays" className="text-[rgb(var(--text-secondary))] hover:text-navy-900">Holidays</Link>
        <span className="text-[rgb(var(--text-tertiary))]">›</span>
        <span className="text-navy-900 font-medium">Ad-hoc group</span>
      </div>
      <PageHeader
        eyebrow="Ad-hoc group"
        title="Custom group quote (15+ pax)"
        description="Tell us the destination, dates, and rough group size. Our ops team comes back with net rates within 48 hours so you can pitch a custom package."
      />

      <Card>
        <CardContent className="pt-6">
          <form className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Destination(s)</Label>
                <Input name="destinations" placeholder="Bali, Phuket, Dubai…" required />
              </div>
              <div>
                <Label>Approx. group size</Label>
                <Input name="paxCount" type="number" min={15} max={500} placeholder="e.g. 35" required />
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <Label>Travel from</Label>
                <Input name="fromDate" type="date" />
              </div>
              <div>
                <Label>Travel to</Label>
                <Input name="toDate" type="date" />
              </div>
              <div>
                <Label>Nights</Label>
                <Input name="nights" type="number" min={1} max={30} placeholder="6" />
              </div>
            </div>
            <div>
              <Label>Group type</Label>
              <select name="groupType" className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm">
                <option>Corporate offsite</option>
                <option>Wedding / family event</option>
                <option>College / school tour</option>
                <option>MICE / conference</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <Label>Brief / special requirements</Label>
              <textarea name="brief" rows={4} className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm" placeholder="Dietary preferences, accessibility, must-see activities, budget per head…" />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
              <p className="text-xs text-[rgb(var(--text-secondary))]">We'll reply on your registered email and WhatsApp.</p>
              <Button type="submit" className="gap-1.5"><Mail className="w-4 h-4" />Send to ops</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5 text-xs text-[rgb(var(--text-secondary))]">
          <strong className="text-navy-900 inline-flex items-center gap-1.5"><CalendarRange className="w-3.5 h-3.5" />What happens next</strong>
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
