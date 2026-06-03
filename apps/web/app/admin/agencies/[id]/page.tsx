import { db } from '@/lib/db/client';
import { Card, CardContent } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { formatINR, formatDateShort } from '@/lib/utils';
import { notFound } from 'next/navigation';
import { setAgencyStatusAction, updateAgencyMarkupAction, creditAgencyWalletAction, saveCommissionRuleAction, deleteCommissionRuleAction } from '@/app/actions/admin';
import { ArrowLeft, FileText, Users as UsersIcon, Wallet, Percent, Coins, Trash2, Plus } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  ACTIVE: 'success', PENDING: 'warning', SUSPENDED: 'danger',
};

export default async function AdminAgencyDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agency = await db.agency.findUnique({
    where: { id }, include: {
      users: { orderBy: { createdAt: 'asc' } },
      proposals: { take: 10, orderBy: { createdAt: 'desc' }, include: { lead: true } },
      commissionEntries: { take: 10, orderBy: { createdAt: 'desc' } },
      _count: { select: { proposals: true, bookings: true, commissionEntries: true } },
    },
  });
  if (!agency) notFound();

  const totalRevenue = agency.commissionEntries.reduce((s, e) => s + Number(e.amountPaise), 0);
  const [commissionRules, platformRules] = await Promise.all([
    db.commissionRule.findMany({ where: { agencyId: agency.id }, orderBy: { productType: 'asc' } }),
    db.commissionRule.findMany({ where: { agencyId: null, active: true }, orderBy: { productType: 'asc' } }),
  ]);
  const PRODUCT_TYPES = ['FLIGHT', 'HOTEL', 'TRANSFER', 'ACTIVITY', 'VISA', 'INSURANCE', 'INVOICE_TOTAL'];
  const APPLIES_TO = ['NET', 'MARKUP', 'TOTAL'];

  return (
    <div className="p-8 space-y-6">
      <Link href="/admin/agencies" className="inline-flex items-center gap-1.5 text-sm text-[rgb(var(--text-secondary))] hover:text-navy-900"><ArrowLeft className="w-4 h-4" />Back to agencies</Link>

      <PageHeader
        eyebrow={agency.code}
        title={agency.name}
        description={`${agency.email ?? '—'} · ${agency.contact ?? '—'} · /${agency.slug} · joined ${formatDateShort(agency.createdAt)}`}
        actions={
          <div className="flex items-center gap-3">
            <Pill variant={statusVariant[agency.status] ?? 'neutral'}>{agency.status}</Pill>
            {agency.logoUrl && <img src={agency.logoUrl} alt="" className="h-10 w-auto rounded bg-white p-1 border border-border-subtle" />}
            <span className="w-8 h-8 rounded-full border border-border-subtle" style={{ background: agency.primaryColor ?? '#0369A1' }} />
          </div>
        }
      />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 stagger">
        <Card className="lift"><CardContent className="pt-5">
          <p className="text-[11px] uppercase tracking-widest text-[rgb(var(--text-secondary))] font-bold">Users</p>
          <p className="font-mono text-3xl font-bold text-navy-900">{agency.users.length}</p>
          <p className="text-xs text-[rgb(var(--text-secondary))]">team members</p>
        </CardContent></Card>
        <Card className="lift"><CardContent className="pt-5">
          <p className="text-[11px] uppercase tracking-widest text-[rgb(var(--text-secondary))] font-bold">Proposals</p>
          <p className="font-mono text-3xl font-bold text-navy-900">{agency._count.proposals}</p>
          <p className="text-xs text-[rgb(var(--text-secondary))]">{agency._count.bookings} booked</p>
        </CardContent></Card>
        <Card className="lift"><CardContent className="pt-5">
          <p className="text-[11px] uppercase tracking-widest text-[rgb(var(--text-secondary))] font-bold">Wallet</p>
          <p className="font-mono text-3xl font-bold text-navy-900">{formatINR(agency.walletPaise)}</p>
          <p className="text-xs text-[rgb(var(--text-secondary))]">available balance</p>
        </CardContent></Card>
        <Card className="lift"><CardContent className="pt-5">
          <p className="text-[11px] uppercase tracking-widest text-[rgb(var(--text-secondary))] font-bold">Commission earned</p>
          <p className="font-mono text-3xl font-bold text-amber-700">{formatINR(BigInt(totalRevenue))}</p>
          <p className="text-xs text-[rgb(var(--text-secondary))]">{agency._count.commissionEntries} entries</p>
        </CardContent></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <h3 className="text-sm font-semibold text-navy-900 mb-3 inline-flex items-center gap-1.5"><UsersIcon className="w-4 h-4 text-crimson-700" />Account status</h3>
            <form action={setAgencyStatusAction.bind(null, agency.id)} className="space-y-2">
              <select name="status" defaultValue={agency.status} className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm">
                <option value="ACTIVE">ACTIVE — full access</option>
                <option value="PENDING">PENDING — onboarding</option>
                <option value="SUSPENDED">SUSPENDED — login blocked</option>
              </select>
              <Button size="sm" variant="secondary" className="w-full">Update status</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <h3 className="text-sm font-semibold text-navy-900 mb-3 inline-flex items-center gap-1.5"><Percent className="w-4 h-4 text-crimson-700" />Default markup</h3>
            <form action={updateAgencyMarkupAction.bind(null, agency.id)} className="space-y-2">
              <div className="flex items-center gap-2">
                <Input type="number" name="markupPct" defaultValue={agency.markupPct} step={0.5} min={0} max={100} className="flex-1" />
                <span className="text-sm text-[rgb(var(--text-secondary))]">%</span>
              </div>
              <Button size="sm" variant="secondary" className="w-full">Save markup</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <h3 className="text-sm font-semibold text-navy-900 mb-3 inline-flex items-center gap-1.5"><Wallet className="w-4 h-4 text-crimson-700" />Wallet credit</h3>
            <form action={creditAgencyWalletAction.bind(null, agency.id)} className="space-y-2">
              <Input type="number" name="rupees" placeholder="₹ amount" min={1} step={500} />
              <Input type="text" name="note" placeholder="Note (optional)" />
              <Button size="sm" className="w-full">Credit wallet</Button>
            </form>
            <p className="text-xs text-[rgb(var(--text-secondary))] mt-2">Adds a CREDIT WalletTxn row.</p>
          </CardContent>
        </Card>
      </div>

      {/* Agency-specific commission overrides */}
      <section>
        <h2 className="text-xl font-semibold text-navy-900 mb-1 inline-flex items-center gap-2"><Coins className="w-5 h-5 text-crimson-700" />Commission overrides</h2>
        <p className="text-sm text-[rgb(var(--text-secondary))] mb-3">Rules set here apply only to <span className="font-medium text-navy-900">{agency.name}</span> and take priority over platform defaults. Product types without an override fall back to the platform rule.</p>
        <Card><CardContent className="pt-5 space-y-5">
          {commissionRules.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs uppercase tracking-wider text-[rgb(var(--text-secondary))] border-b border-border-subtle"><th className="py-2 pr-4">Product</th><th className="py-2 pr-4">Rate</th><th className="py-2 pr-4">Applies to</th><th className="py-2 pr-4">Status</th><th className="py-2 pr-4">Note</th><th></th></tr></thead>
                <tbody>
                  {commissionRules.map((r) => (
                    <tr key={r.id} className="border-b border-border-subtle/60">
                      <td className="py-2 pr-4 font-medium text-navy-900">{r.productType}</td>
                      <td className="py-2 pr-4 font-mono">{r.percent != null ? `${r.percent}%` : ''}{r.flatPaise ? ` +₹${Number(r.flatPaise) / 100}` : ''}{r.percent == null && !r.flatPaise ? '—' : ''}</td>
                      <td className="py-2 pr-4">{r.appliesTo}</td>
                      <td className="py-2 pr-4"><Pill variant={r.active ? 'success' : 'neutral'}>{r.active ? 'Active' : 'Inactive'}</Pill></td>
                      <td className="py-2 pr-4 text-[rgb(var(--text-secondary))] text-xs">{r.note ?? '—'}</td>
                      <td className="py-2 text-right">
                        <form action={deleteCommissionRuleAction.bind(null, r.id)}>
                          <button className="w-8 h-8 inline-flex items-center justify-center rounded-md text-danger-500 hover:bg-danger-100" aria-label="Delete rule"><Trash2 className="w-4 h-4" /></button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-[rgb(var(--text-secondary))]">No overrides yet — this agency uses the platform defaults{platformRules.length ? ` (${platformRules.map((r) => `${r.productType} ${r.percent ?? 0}%`).join(', ')})` : ''}.</p>
          )}

          {/* Add rule */}
          <form action={saveCommissionRuleAction} className="border-t border-border-subtle pt-4 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
            <input type="hidden" name="agencyId" value={agency.id} />
            <input type="hidden" name="active" value="on" />
            <div>
              <Label>Product</Label>
              <select name="productType" className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm">
                {PRODUCT_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <Label>Commission %</Label>
              <Input type="number" name="percent" step={0.5} min={0} max={100} placeholder="e.g. 8" />
            </div>
            <div>
              <Label>Applies to</Label>
              <select name="appliesTo" className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm">
                {APPLIES_TO.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" />Add override</Button>
            <div className="sm:col-span-4">
              <Input name="note" placeholder="Note (optional) — e.g. negotiated rate for FY26" />
            </div>
          </form>
        </CardContent></Card>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-navy-900 mb-3">Team ({agency.users.length})</h2>
        <Card><CardContent className="pt-2">
          {agency.users.length === 0 ? (
            <EmptyState dense icon={<UsersIcon className="w-7 h-7" />} title="No users yet" body="The owner can invite team members from Settings → Team." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs uppercase tracking-wider text-[rgb(var(--text-secondary))] border-b border-border-subtle"><th className="py-3 pr-4">Email</th><th>Name</th><th>Role</th><th>Last login</th><th>Joined</th></tr></thead>
                <tbody>
                  {agency.users.map((u) => (
                    <tr key={u.id} className="border-b border-border-subtle hover:bg-surface-2"><td className="py-3 pr-4">{u.email}</td><td>{u.name ?? '—'}</td><td><Pill variant="neutral">{u.role}</Pill></td><td className="text-[rgb(var(--text-secondary))] text-xs">{u.lastLoginAt ? formatDateShort(u.lastLoginAt) : 'never'}</td><td className="text-[rgb(var(--text-secondary))] text-xs">{formatDateShort(u.createdAt)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent></Card>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-navy-900 mb-3">Recent proposals</h2>
        <Card><CardContent className="pt-2">
          {agency.proposals.length === 0 ? (
            <EmptyState dense icon={<FileText className="w-7 h-7" />} title="No proposals yet" body="Once this agency creates proposals, the most recent 10 show up here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs uppercase tracking-wider text-[rgb(var(--text-secondary))] border-b border-border-subtle"><th className="py-3 pr-4">Code</th><th>Customer</th><th>Trip</th><th className="text-right">Price</th><th>Status</th></tr></thead>
                <tbody>
                  {agency.proposals.map((p) => (
                    <tr key={p.id} className="border-b border-border-subtle hover:bg-surface-2"><td className="py-3 pr-4 font-mono text-xs">{p.code}</td><td>{p.lead?.customerName ?? '—'}</td><td>{p.name}</td><td className="text-right font-mono">{formatINR(p.pricePaise)}</td><td><Pill variant={p.status === 'ACCEPTED' || p.status === 'BOOKED' ? 'success' : p.status === 'DECLINED' ? 'danger' : 'neutral'}>{p.status}</Pill></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent></Card>
      </section>
    </div>
  );
}
