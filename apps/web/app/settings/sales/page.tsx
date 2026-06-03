import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { requireAgency } from '@/lib/auth/ctx';
import { db } from '@/lib/db/client';
import { saveSalesSettingsAction } from '@/app/actions/branding';
import { Percent, Plane, Hotel as HotelIcon, Car, MapPin, FileText, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { MarginCalculator } from '@/components/settings/margin-calculator';
import { MarkupRulesEditor } from '@/components/settings/markup-rules-editor';
import { parseMarkupRules } from '@/lib/markup';
import { CalendarRange } from 'lucide-react';

export const dynamic = 'force-dynamic';

const PRODUCT_META = [
  { key: 'FLIGHT',    label: 'Flights',    icon: Plane,       suggested: 5 },
  { key: 'HOTEL',     label: 'Hotels',     icon: HotelIcon,    suggested: 12 },
  { key: 'TRANSFER',  label: 'Transfers',  icon: Car,         suggested: 18 },
  { key: 'ACTIVITY',  label: 'Activities', icon: MapPin,       suggested: 20 },
  { key: 'VISA',      label: 'Visa',       icon: FileText,    suggested: 10 },
  { key: 'INSURANCE', label: 'Insurance',  icon: ShieldCheck, suggested: 25 },
];

export default async function SalesSettingsPage() {
  const actor = await requireAgency();
  const agency = await db.agency.findUnique({ where: { id: actor.agencyId } });
  if (!agency) return null;
  const overrides: Record<string, number> = agency.markupConfigJson ? JSON.parse(agency.markupConfigJson) : {};
  const markupRules = parseMarkupRules(agency.markupRulesJson);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/settings" className="text-[rgb(var(--text-secondary))] hover:text-navy-900">Settings</Link>
        <span className="text-[rgb(var(--text-tertiary))]">›</span>
        <span className="text-navy-900 font-medium">Sales &amp; markup</span>
      </div>
      <PageHeader
        eyebrow="Settings"
        title="Sales &amp; markup"
        description="Set how much you add over net supplier cost. The default applies to every product type, then specific overrides win for that product."
      />

      <form action={saveSalesSettingsAction} className="space-y-6">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-lg font-semibold text-navy-900 inline-flex items-center gap-2"><Percent className="w-4 h-4 text-crimson-700" />Default markup</h2>
            <p className="text-xs text-[rgb(var(--text-secondary))]">Applied across all products unless an override below kicks in.</p>
            <div className="flex items-center gap-3 max-w-xs">
              <Input name="markupPct" type="number" defaultValue={agency.markupPct} step={0.5} min={0} max={100} required />
              <span className="text-sm text-[rgb(var(--text-secondary))]">%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-navy-900">Per-product overrides</h2>
              <p className="text-xs text-[rgb(var(--text-secondary))]">Leave a field empty to use the default markup for that product. Values are %. Suggested values shown as placeholders.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {PRODUCT_META.map(({ key, label, icon: Icon, suggested }) => (
                <div key={key}>
                  <Label>
                    <span className="inline-flex items-center gap-1.5"><Icon className="w-3.5 h-3.5 text-crimson-700" />{label}</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input name={`markup_${key}`} type="number" step={0.5} min={0} max={100} defaultValue={overrides[key] ?? ''} placeholder={`default (${suggested}%)`} />
                    <span className="text-sm text-[rgb(var(--text-secondary))]">%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-navy-900 inline-flex items-center gap-2"><CalendarRange className="w-4 h-4 text-crimson-700" />Destination &amp; season rules</h2>
              <p className="text-xs text-[rgb(var(--text-secondary))]">Charge more (or less) for specific destinations or travel dates. The most specific matching rule wins; otherwise the default markup applies. Used automatically when you save a proposal.</p>
            </div>
            <MarkupRulesEditor initial={markupRules} defaultPct={agency.markupPct} />
          </CardContent>
        </Card>

        <MarginCalculator defaultMarkupPct={agency.markupPct} overrides={overrides} />

        <Card>
          <CardContent className="pt-6 text-xs text-[rgb(var(--text-secondary))]">
            <strong className="text-navy-900 block mb-1">How this works</strong>
            <p>When you save a proposal, each line item (hotel, transfer, activity, etc.) is priced at supplier net cost plus the markup % that applies to it. The customer sees only the marked-up total. Your wallet is debited at net cost when the booking is confirmed.</p>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Link href="/settings"><Button type="button" variant="ghost">Cancel</Button></Link>
          <Button type="submit">Save sales settings</Button>
        </div>
      </form>
    </div>
  );
}
