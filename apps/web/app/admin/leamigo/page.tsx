import { listLeamigoBookings, isLive, type LeamigoBookingRow } from '@gg/leamigo';
import { AdminPage, FilterChip } from '@/components/admin/admin-ui';
import { db } from '@/lib/db/client';
import { requireSuperAdmin } from '@/lib/auth/ctx';
import { formatDateShort } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PRODUCTS = ['all', 'transfer', 'rental', 'activity'] as const;

export default async function LeamigoBookingsPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  await requireSuperAdmin();
  const { product = 'all' } = await searchParams;

  let rows: LeamigoBookingRow[] = [];
  let failed = false;
  if (isLive()) {
    try { rows = await listLeamigoBookings(); } catch { failed = true; }
  }
  const saved = await db.booking.findMany({ where: { supplierJson: { not: null } }, select: { id: true, supplierJson: true } });
  const ours = new Map<string, string>();
  for (const b of saved) {
    try { for (const i of JSON.parse(b.supplierJson!)) if (i.reference) ours.set(String(i.reference), b.id.slice(-8).toUpperCase()); } catch { /* unreadable row: not ours */ }
  }
  const shown = product === 'all' ? rows : rows.filter((r) => r.product === product);
  const unmatched = rows.filter((r) => !ours.has(r.reference)).length;

  return (
    <AdminPage>
      <div>
        <h1 className="text-[24px] font-extrabold tracking-[-0.01em] text-ink">Leamigo bookings</h1>
        <p className="mt-1 text-sm text-[rgb(var(--text-secondary))]">Every booking made on the API key, checked against this app. {unmatched} of {rows.length} not found here.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {PRODUCTS.map((p) => (
          <FilterChip key={p} href={p === 'all' ? '/admin/leamigo' : `/admin/leamigo?product=${p}`} label={p === 'all' ? 'All' : p[0]!.toUpperCase() + p.slice(1)} active={product === p}
            count={p === 'all' ? rows.length : rows.filter((r) => r.product === p).length} />
        ))}
      </div>
      {failed && <p role="alert" className="rounded-md bg-amber-50 text-amber-800 px-3 py-2 text-sm">Leamigo&apos;s booking list couldn&apos;t load. Try again in a minute.</p>}
      <div className="overflow-x-auto rounded-lg border border-border-subtle bg-surface" tabIndex={0} role="region" aria-label="Leamigo bookings">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-border-subtle">
              {['Reference', 'Product', 'Guest', 'Travel', 'Status', 'In this app'].map((h) => <th key={h} className="label px-4 py-3 font-semibold">{h}</th>)}
              <th className="label px-4 py-3 font-semibold text-right">Supplier amount</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.reference} className="border-b border-border-subtle last:border-0">
                <td className="px-4 py-3 font-mono text-[13px]">{r.reference}</td>
                <td className="px-4 py-3 capitalize">{r.product}</td>
                <td className="px-4 py-3">{r.guest || '—'}</td>
                <td className="px-4 py-3 font-mono text-[13px] whitespace-nowrap">{r.travelDate ? formatDateShort(r.travelDate) : '—'}</td>
                <td className="px-4 py-3 capitalize">{r.status.replace(/_/g, ' ')}</td>
                <td className="px-4 py-3 font-mono text-[13px]">{ours.get(r.reference) ?? 'Not found'}</td>
                <td className="px-4 py-3 text-right tnum whitespace-nowrap">{r.currency} {(r.amountMinor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-[rgb(var(--text-secondary))]">No bookings.</td></tr>}
          </tbody>
        </table>
      </div>
    </AdminPage>
  );
}
