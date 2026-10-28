import { db } from '@/lib/db/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Pill } from '@/components/ui/pill';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { saveCommissionRuleAction, deleteCommissionRuleAction } from '@/app/actions/admin';
import { Percent, Info, Check } from 'lucide-react';
import { AutoSubmitSelect, AutoSubmitNumber } from '@/components/admin/auto-submit';
import { ActionForm } from '@/components/ui/action-form';
import { AdminPage, GhostEmpty, RowFact } from '@/components/admin/admin-ui';
import { PRODUCT_TYPES, APPLIES_TO, productLabel, appliesToLabel } from '@/components/admin/commission-labels';
import { formatINR } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type Rule = {
  id: string;
  agencyId: string | null;
  productType: string;
  percent: number | null;
  flatPaise: bigint | null;
  appliesTo: string;
  active: boolean;
  note: string | null;
  agency: { name: string; code: string } | null;
};

export default async function AdminCommissionsPage() {
  const [rules, agencies] = await Promise.all([
    db.commissionRule.findMany({ orderBy: [{ agencyId: 'asc' }, { productType: 'asc' }], include: { agency: { select: { name: true, code: true } } } }),
    db.agency.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, code: true } }),
  ]);

  const platformRules = rules.filter((r) => !r.agencyId) as Rule[];
  const agencyRules   = rules.filter((r) =>  r.agencyId) as Rule[];

  return (
    <AdminPage>
      <PageHeader
        title="Commission rules"
        description="The share the platform earns on each product. An agency-specific rule wins over the platform default."
      />

      <Card>
        <CardContent className="pt-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-md bg-navy-50 text-ink-soft inline-flex items-center justify-center flex-shrink-0">
              <Info className="w-4 h-4" aria-hidden />
            </div>
            <div className="text-sm">
              <p className="font-semibold text-ink">Platform commission is not agency markup</p>
              <p className="text-[rgb(var(--text-secondary))] mt-1 leading-relaxed">
                What you set here is the cut <strong className="text-ink">Global Guides</strong> earns from each agency&apos;s bookings. Agencies can&apos;t see or change it. Agencies set their own customer-facing markup under <strong className="text-ink">Settings → Sales &amp; markup</strong>, separately.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <RuleTable title="Platform defaults" subtitle="Applies to every agency without its own rule." rows={platformRules} platform />
      <RuleTable title="Agency-specific rules" subtitle="Only the agency listed gets this rate." rows={agencyRules} />

      <Card>
        <CardContent className="pt-6">
          <h2 className="text-[17px] font-bold text-ink tracking-[-0.01em] mb-1">Add a rule</h2>
          <p className="text-[13px] text-[rgb(var(--text-secondary))] mb-4">Choose who it applies to and the product, then a percent, a flat fee, or both.</p>
          <RuleForm agencies={agencies} />
        </CardContent>
      </Card>
    </AdminPage>
  );
}

/** Hidden copies of every field except the one being edited, so a single-field save keeps the rest intact. */
function HiddenRule({ r, omit }: { r: Rule; omit: 'productType' | 'percent' | 'appliesTo' | 'active' }) {
  return (
    <>
      <input type="hidden" name="id" value={r.id} />
      <input type="hidden" name="agencyId" value={r.agencyId ?? ''} />
      {omit !== 'productType' && <input type="hidden" name="productType" value={r.productType} />}
      {omit !== 'percent' && <input type="hidden" name="percent" value={r.percent ?? ''} />}
      <input type="hidden" name="flatPaise" value={r.flatPaise != null ? String(r.flatPaise) : ''} />
      {omit !== 'appliesTo' && <input type="hidden" name="appliesTo" value={r.appliesTo} />}
      <input type="hidden" name="note" value={r.note ?? ''} />
      {omit !== 'active' && <input type="hidden" name="active" value={r.active ? 'on' : ''} />}
    </>
  );
}

function scopeName(r: Rule) {
  return r.agency?.name ?? 'Platform default';
}

function ProductField({ r }: { r: Rule }) {
  return (
    <form action={saveCommissionRuleAction} className="inline">
      <HiddenRule r={r} omit="productType" />
      <AutoSubmitSelect name="productType" defaultValue={r.productType} options={PRODUCT_TYPES} ariaLabel={`Product, ${scopeName(r)} rule`} />
    </form>
  );
}

function PercentField({ r }: { r: Rule }) {
  return (
    <form action={saveCommissionRuleAction} className="inline-flex items-center gap-1">
      <HiddenRule r={r} omit="percent" />
      <AutoSubmitNumber name="percent" defaultValue={r.percent} step="0.1" ariaLabel={`Commission percent, ${scopeName(r)} ${productLabel(r.productType)} rule`} />
      <span className="money text-[13px] text-[rgb(var(--text-secondary))]">%</span>
    </form>
  );
}

function AppliesToField({ r }: { r: Rule }) {
  return (
    <form action={saveCommissionRuleAction} className="inline">
      <HiddenRule r={r} omit="appliesTo" />
      <AutoSubmitSelect name="appliesTo" defaultValue={r.appliesTo} options={APPLIES_TO} ariaLabel={`Applies to, ${scopeName(r)} ${productLabel(r.productType)} rule`} />
    </form>
  );
}

function ActiveToggle({ r }: { r: Rule }) {
  return (
    <form action={saveCommissionRuleAction} className="inline">
      <HiddenRule r={r} omit="active" />
      <input type="hidden" name="active" value={!r.active ? 'on' : ''} />
      <button className="cursor-pointer min-h-8" aria-pressed={r.active} aria-label={`${scopeName(r)} ${productLabel(r.productType)} rule active`} title={r.active ? 'Click to turn off' : 'Click to turn on'}>
        <Pill variant={r.active ? 'success' : 'neutral'}>{r.active ? 'On' : 'Off'}</Pill>
      </button>
    </form>
  );
}

function DeleteRule({ r, hoverReveal }: { r: Rule; hoverReveal?: boolean }) {
  return (
    <ActionForm action={deleteCommissionRuleAction.bind(null, r.id)} confirm={`Delete the ${productLabel(r.productType)} commission rule? This can't be undone.`} success="Rule deleted" className="inline">
      <button type="submit" className={`inline-flex items-center min-h-8 text-danger-500 hover:underline text-xs font-semibold ${hoverReveal ? 'opacity-100 [@media(hover:hover)_and_(pointer:fine)]:lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 transition-opacity' : ''}`}>Delete</button>
    </ActionForm>
  );
}

function Flat({ r }: { r: Rule }) {
  return r.flatPaise != null ? <span className="money">{formatINR(r.flatPaise)}</span> : <span className="text-[rgb(var(--text-tertiary))]">—</span>;
}

function Scope({ r }: { r: Rule }) {
  return r.agency
    ? <span className="whitespace-nowrap"><span className="font-semibold text-ink">{r.agency.name}</span> <span className="font-mono text-[12px] font-bold text-crimson-700">{r.agency.code}</span></span>
    : <Pill variant="neutral">Platform default</Pill>;
}

function RuleTable({ title, subtitle, rows, platform }: { title: string; subtitle: string; rows: Rule[]; platform?: boolean }) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div>
          <h2 className="text-[18px] font-extrabold text-ink tracking-[-0.01em]">{title}</h2>
          <p className="text-[13px] text-[rgb(var(--text-secondary))]">{subtitle}</p>
        </div>
        <span className="text-xs text-[rgb(var(--text-secondary))] whitespace-nowrap">{rows.length} rule{rows.length !== 1 ? 's' : ''}</span>
      </div>
      <Card>
        <CardContent className={rows.length === 0 ? 'pt-4 pb-4' : 'pt-2'}>
          {rows.length === 0 ? (
            platform ? (
              <EmptyState
                dense
                icon={<Percent className="w-7 h-7" />}
                title="No platform defaults yet"
                body="Add a platform-wide commission for each product so it applies to every agency by default."
              />
            ) : (
              <GhostEmpty title="No agency-specific rules" body="Add one when an agency negotiates a different rate." />
            )
          ) : (
            <>
              {/* Mobile + tablet: stacked rows */}
              <ul className="lg:hidden divide-y divide-border-subtle">
                {rows.map((r) => (
                  <li key={r.id} className="py-3.5 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <Scope r={r} />
                      <ActiveToggle r={r} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><p className="label mb-1">Product</p><ProductField r={r} /></div>
                      <div><p className="label mb-1">Percent</p><PercentField r={r} /></div>
                      <div><p className="label mb-1">Applies to</p><AppliesToField r={r} /></div>
                      <RowFact label="Flat fee"><Flat r={r} /></RowFact>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[13px] text-[rgb(var(--text-secondary))] min-w-0 truncate">{r.note ?? ''}</p>
                      <DeleteRule r={r} />
                    </div>
                  </li>
                ))}
              </ul>

              {/* Desktop: table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left label border-b border-border">
                      <th className="py-3 pr-4 font-semibold">Scope</th>
                      <th className="py-3 pr-4 font-semibold">Product</th>
                      <th className="py-3 pr-4 font-semibold text-right">Percent</th>
                      <th className="py-3 pr-4 font-semibold text-right whitespace-nowrap">Flat fee</th>
                      <th className="py-3 pr-4 font-semibold whitespace-nowrap">Applies to</th>
                      <th className="py-3 pr-4 font-semibold">Active</th>
                      <th className="py-3 pr-4 font-semibold w-full">Note</th>
                      <th className="py-3 font-semibold"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-b border-border-subtle hover:bg-surface-2 transition-colors group align-middle">
                        <td className="py-3 pr-4"><Scope r={r} /></td>
                        <td className="py-3 pr-4"><ProductField r={r} /></td>
                        <td className="py-3 pr-4 text-right"><PercentField r={r} /></td>
                        <td className="py-3 pr-4 text-right whitespace-nowrap"><Flat r={r} /></td>
                        <td className="py-3 pr-4"><AppliesToField r={r} /></td>
                        <td className="py-3 pr-4"><ActiveToggle r={r} /></td>
                        <td className="py-3 pr-4 text-[rgb(var(--text-secondary))] text-xs max-w-xs truncate">{r.note ?? '—'}</td>
                        <td className="py-3 text-right"><DeleteRule r={r} hoverReveal /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function RuleForm({ agencies }: { agencies: { id: string; name: string; code: string }[] }) {
  return (
    <form action={saveCommissionRuleAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
      <div className="sm:col-span-2 lg:col-span-2">
        <Label>Applies to agency</Label>
        <select name="agencyId" className="control" defaultValue="">
          <option value="">All agencies (platform default)</option>
          {agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      <div>
        <Label>Product</Label>
        <select name="productType" className="control" defaultValue="HOTEL">
          {PRODUCT_TYPES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>
      <div>
        <Label>Commission %</Label>
        <Input name="percent" placeholder="e.g. 5" type="number" step="0.1" min={0} max={100} className="money" />
      </div>
      <div>
        <Label>Flat fee (₹)</Label>
        <Input name="flatRupees" placeholder="e.g. 500" type="number" step="1" min={0} className="money" />
      </div>
      <div>
        <Label>Calculated on</Label>
        <select name="appliesTo" className="control" defaultValue="TOTAL">
          {APPLIES_TO.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>
      <div className="sm:col-span-2 lg:col-span-5">
        <Label>Note</Label>
        <Input name="note" placeholder="e.g. Negotiated rate Q3 2026" className="w-full" />
      </div>
      <label className="inline-flex items-center gap-2.5 h-11 cursor-pointer select-none text-sm font-semibold text-ink">
        <input type="checkbox" name="active" defaultChecked className="peer sr-only" />
        <span aria-hidden className="w-5 h-5 rounded-[5px] border border-border-strong bg-surface inline-flex items-center justify-center text-white transition-colors peer-checked:bg-crimson-700 peer-checked:border-crimson-700 peer-focus-visible:ring-2 peer-focus-visible:ring-crimson-500 peer-focus-visible:ring-offset-2 [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100">
          <Check className="w-3.5 h-3.5" strokeWidth={3} />
        </span>
        Active
      </label>
      <div className="sm:col-span-2 lg:col-span-6 flex justify-end"><Button type="submit">Save rule</Button></div>
    </form>
  );
}
