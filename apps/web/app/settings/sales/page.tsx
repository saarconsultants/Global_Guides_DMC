import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { Button, ButtonLink } from '@/components/ui/button';
import { requireAgency } from '@/lib/auth/ctx';
import { db } from '@/lib/db/client';
import { saveSalesSettingsAction } from '@/app/actions/branding';
import { Percent, Plane, Hotel as HotelIcon, Car, MapPin, FileText, ShieldCheck } from 'lucide-react';
import { SettingsTabs, SETTINGS_CONTAINER } from '@/components/settings/settings-tabs';
import { MarginCalculator } from '@/components/settings/margin-calculator';
import { MarkupRulesEditor } from '@/components/settings/markup-rules-editor';
import { parseMarkupRules } from '@/lib/markup';
import { SUPPORTED_CURRENCIES } from '@/lib/money';
import { CalendarRange, Globe } from 'lucide-react';
import { ActionForm } from '@/components/ui/action-form';

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
    <div className={SETTINGS_CONTAINER}>
      <PageHeader
        title="Settings"
        description="Agency profile, white-label branding, markup and team. These affect what your customers see on every share link."
        actions={<span className="text-xs text-[rgb(var(--text-secondary))]">Agency ID · <span className="font-mono">{agency.code}</span></span>}
      />
      <SettingsTabs active="sales" />
      <div>
        <h2 className="text-[18px] font-extrabold text-ink tracking-[-0.01em]">Sales &amp; markup</h2>
        <p className="text-[14px] text-[rgb(var(--text-secondary))] mt-1 max-w-2xl">Set how much you add over net cost. The default applies to every product type; a product override wins for that product.</p>
      </div>

      <ActionForm action={saveSalesSettingsAction} success="Sales settings saved" className="flex flex-col gap-5 max-w-4xl">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-lg font-semibold text-ink inline-flex items-center gap-2"><Globe className="w-4 h-4 text-crimson-700" />Display currency</h2>
            <p className="text-xs text-[rgb(var(--text-secondary))]">Quote your customers in this currency. Live exchange rates convert supplier costs automatically — your internal books stay in INR.</p>
            <div className="max-w-xs">
              <select name="currency" aria-label="Display currency" defaultValue={agency.currency ?? 'INR'} className="control">
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.code} · {c.name} ({c.symbol})</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-lg font-semibold text-ink inline-flex items-center gap-2"><Percent className="w-4 h-4 text-crimson-700" />Default markup</h2>
            <p className="text-xs text-[rgb(var(--text-secondary))]">Applied across all products unless an override below kicks in.</p>
            <div className="flex items-center gap-3 max-w-xs">
              <Input name="markupPct" aria-label="Default markup percent" type="number" defaultValue={agency.markupPct} step={0.5} min={0} max={100} required />
              <span className="text-sm text-[rgb(var(--text-secondary))]">%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">Per-product overrides</h2>
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
              <h2 className="text-lg font-semibold text-ink inline-flex items-center gap-2"><CalendarRange className="w-4 h-4 text-crimson-700" />Destination &amp; season rules</h2>
              <p className="text-xs text-[rgb(var(--text-secondary))]">Charge more (or less) for specific destinations or travel dates. The most specific matching rule wins; otherwise the default markup applies. Used automatically when you save a proposal.</p>
            </div>
            <MarkupRulesEditor initial={markupRules} defaultPct={agency.markupPct} />
          </CardContent>
        </Card>

        <MarginCalculator defaultMarkupPct={agency.markupPct} overrides={overrides} />

        <Card>
          <CardContent className="pt-6 text-xs text-[rgb(var(--text-secondary))]">
            <strong className="text-ink block mb-1">How this works</strong>
            <p>When you save a proposal, each line item (hotel, transfer, activity, etc.) is priced at supplier net cost plus the markup % that applies to it. The customer sees only the marked-up total. Your wallet is debited at net cost when the booking is confirmed.</p>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <ButtonLink href="/settings" variant="ghost">Cancel</ButtonLink>
          <Button type="submit">Save sales settings</Button>
        </div>
      </ActionForm>
    </div>
  );
}
