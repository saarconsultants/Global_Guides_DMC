import { db } from '@/lib/db/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pill } from '@/components/ui/pill';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { saveCommissionRuleAction, deleteCommissionRuleAction } from '@/app/actions/admin';
import { Percent, ShieldAlert } from 'lucide-react';
import { AutoSubmitSelect, AutoSubmitNumber } from '@/components/admin/auto-submit';

export const dynamic = 'force-dynamic';

const productTypes  = ['FLIGHT', 'HOTEL', 'TRANSFER', 'ACTIVITY', 'VISA', 'INSURANCE', 'INVOICE_TOTAL'];
const appliesToOpts = ['NET', 'MARKUP', 'TOTAL'];

export default async function AdminCommissionsPage() {
  const [rules, agencies] = await Promise.all([
    db.commissionRule.findMany({ orderBy: [{ agencyId: 'asc' }, { productType: 'asc' }], include: { agency: { select: { name: true, code: true } } } }),
    db.agency.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, code: true } }),
  ]);

  const platformRules = rules.filter((r) => !r.agencyId);
  const agencyRules   = rules.filter((r) =>  r.agencyId);

  return (
    <div className="p-8 space-y-6 ambient">
      <PageHeader
        eyebrow="Platform"
        title="Commission rules"
        description="Set the % the platform earns on every product type. Agency-specific overrides win over the platform default."
      />

      <Card>
        <CardContent className="pt-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-md bg-amber-500/15 text-amber-700 inline-flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="text-sm">
              <p className="font-semibold text-navy-900">Platform commission ≠ agency markup</p>
              <p className="text-[rgb(var(--text-secondary))] mt-1 leading-relaxed">
                What you set here is the cut <strong>Global Guides</strong> earns from each agency's bookings — agencies cannot see or change this. Agencies set their own customer-facing <strong>markup</strong> in their <span className="font-mono text-xs">Settings → Sales &amp; markup</span> page, which is independent.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <RuleTable title="Platform defaults" subtitle="Applies to every agency that doesn't have an override." rows={platformRules} agencies={agencies} platform />
      <RuleTable title="Agency-specific overrides" subtitle="Only the agency listed sees this rate." rows={agencyRules} agencies={agencies} />

      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold text-navy-900 mb-1">Add a new rule</h2>
          <p className="text-xs text-[rgb(var(--text-secondary))] mb-4">Pick a scope (platform or a single agency), a product type, then either a percent or a flat fee.</p>
          <RuleForm agencies={agencies} />
        </CardContent>
      </Card>
    </div>
  );
}

function RuleTable({ title, subtitle, rows, agencies, platform }: { title: string; subtitle: string; rows: any[]; agencies: any[]; platform?: boolean }) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h2 className="text-xl font-semibold text-navy-900">{title}</h2>
          <p className="text-xs text-[rgb(var(--text-secondary))]">{subtitle}</p>
        </div>
        <span className="text-xs text-[rgb(var(--text-secondary))]">{rows.length} rule{rows.length !== 1 ? 's' : ''}</span>
      </div>
      <Card>
        <CardContent className="pt-2">
          {rows.length === 0 ? (
            <EmptyState
              dense
              icon={<Percent className="w-7 h-7" />}
              title={platform ? 'No platform defaults yet' : 'No agency overrides'}
              body={platform ? 'Add a platform-wide commission % per product type so it applies to every agency by default.' : 'Add an agency-specific rule when an agency negotiates a different rate.'}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-[rgb(var(--text-secondary))] border-b border-border-subtle">
                    <th className="py-3 pr-4 font-semibold">Scope</th>
                    <th className="py-3 pr-4 font-semibold">Product</th>
                    <th className="py-3 pr-4 font-semibold text-right">Percent</th>
                    <th className="py-3 pr-4 font-semibold text-right">Flat (₹)</th>
                    <th className="py-3 pr-4 font-semibold">Applies to</th>
                    <th className="py-3 pr-4 font-semibold">Active</th>
                    <th className="py-3 pr-4 font-semibold">Note</th>
                    <th className="py-3 pr-4 font-semibold"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-border-subtle hover:bg-surface-2 transition-colors group align-middle">
                      <td className="py-3 pr-4">{r.agency ? <span><span className="font-medium">{r.agency.name}</span> <span className="text-xs text-[rgb(var(--text-secondary))] font-mono">{r.agency.code}</span></span> : <Pill variant="info">Platform default</Pill>}</td>
                      <td className="py-3 pr-4 font-mono text-xs">
                        <form action={saveCommissionRuleAction} className="inline">
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="agencyId" value={r.agencyId ?? ''} />
                          <input type="hidden" name="appliesTo" value={r.appliesTo} />
                          <input type="hidden" name="note" value={r.note ?? ''} />
                          <input type="hidden" name="active" value={r.active ? 'on' : ''} />
                          <AutoSubmitSelect name="productType" defaultValue={r.productType} options={productTypes} />
                        </form>
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <form action={saveCommissionRuleAction} className="inline">
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="agencyId" value={r.agencyId ?? ''} />
                          <input type="hidden" name="productType" value={r.productType} />
                          <input type="hidden" name="appliesTo" value={r.appliesTo} />
                          <input type="hidden" name="note" value={r.note ?? ''} />
                          <input type="hidden" name="active" value={r.active ? 'on' : ''} />
                          <AutoSubmitNumber name="percent" defaultValue={r.percent} step="0.1" />
                          <span className="ml-0.5 text-xs text-[rgb(var(--text-secondary))]">%</span>
                        </form>
                      </td>
                      <td className="py-3 pr-4 text-right font-mono text-xs text-[rgb(var(--text-secondary))]">{r.flatPaise != null ? Number(r.flatPaise) / 100 : '—'}</td>
                      <td className="py-3 pr-4">
                        <form action={saveCommissionRuleAction} className="inline">
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="agencyId" value={r.agencyId ?? ''} />
                          <input type="hidden" name="productType" value={r.productType} />
                          <input type="hidden" name="percent" value={r.percent ?? ''} />
                          <input type="hidden" name="note" value={r.note ?? ''} />
                          <input type="hidden" name="active" value={r.active ? 'on' : ''} />
                          <AutoSubmitSelect name="appliesTo" defaultValue={r.appliesTo} options={appliesToOpts} className="h-8 rounded-sm border border-border bg-surface px-2 text-xs" />
                        </form>
                      </td>
                      <td className="py-3 pr-4">
                        <form action={saveCommissionRuleAction} className="inline">
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="agencyId" value={r.agencyId ?? ''} />
                          <input type="hidden" name="productType" value={r.productType} />
                          <input type="hidden" name="appliesTo" value={r.appliesTo} />
                          <input type="hidden" name="percent" value={r.percent ?? ''} />
                          <input type="hidden" name="note" value={r.note ?? ''} />
                          <input type="hidden" name="active" value={!r.active ? 'on' : ''} />
                          <button className="cursor-pointer"><Pill variant={r.active ? 'success' : 'neutral'}>{r.active ? 'ON' : 'OFF'}</Pill></button>
                        </form>
                      </td>
                      <td className="py-3 pr-4 text-[rgb(var(--text-secondary))] text-xs max-w-xs truncate">{r.note ?? '—'}</td>
                      <td className="py-3 pr-4 text-right">
                        <form action={deleteCommissionRuleAction.bind(null, r.id)} className="inline">
                          <button className="text-danger-500 hover:underline text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">Delete</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function RuleForm({ agencies }: { agencies: any[] }) {
  return (
    <form action={saveCommissionRuleAction} className="grid gap-3 md:grid-cols-7">
      <select name="agencyId" className="h-10 col-span-2 rounded-sm border border-border bg-surface px-3 text-sm" defaultValue="">
        <option value="">Platform-wide (default)</option>
        {agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      <select name="productType" className="h-10 rounded-sm border border-border bg-surface px-3 text-sm" defaultValue="HOTEL">
        {productTypes.map((p) => <option key={p}>{p}</option>)}
      </select>
      <Input name="percent" placeholder="% e.g. 5" type="number" step="0.1" />
      <Input name="flatPaise" placeholder="Flat (paise)" type="number" />
      <select name="appliesTo" className="h-10 rounded-sm border border-border bg-surface px-3 text-sm" defaultValue="TOTAL">
        {appliesToOpts.map((p) => <option key={p}>{p}</option>)}
      </select>
      <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked /> Active</label>
      <Input name="note" placeholder="Note — e.g. Negotiated rate Q3 2026" className="md:col-span-7" />
      <div className="md:col-span-7 text-right"><Button type="submit">Save rule</Button></div>
    </form>
  );
}
