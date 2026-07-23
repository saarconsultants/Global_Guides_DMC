import { Card, CardContent } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { getWalletBalance, listWalletTxns } from '@/lib/db/wallet';
import { formatDateShort } from '@/lib/utils';
import { getDisplayMoney } from '@/lib/money-server';
import { Wallet, Download, Plus, Receipt } from 'lucide-react';
import { RechargeButton } from '@/components/wallet/recharge-button';

export const dynamic = 'force-dynamic';

export default async function StatementPage() {
  const { fmt } = await getDisplayMoney();
  const balance = await getWalletBalance();
  const txns = await listWalletTxns();

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 space-y-6">
      <PageHeader
        title="Account statement"
        description="Wallet ledger and booking-level debits. Top up to enable instant bookings."
        actions={
          <>
            <a href="/api/export/statement" className="inline-flex"><Button variant="secondary" className="gap-1.5"><Download className="w-4 h-4" />Export CSV</Button></a>
            <RechargeButton />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card plain className="lg:col-span-2 relative overflow-hidden bg-gradient-to-br from-crimson-700 via-crimson-900 to-black text-white border-0">
          <div className="absolute -top-12 -right-12 w-60 h-60 rounded-full bg-amber-500/25 blur-3xl" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-amber-300/10 blur-3xl" />
          <CardContent className="relative pt-6">
            <p className="text-[11px] uppercase tracking-widest text-amber-300 font-bold inline-flex items-center gap-1.5"><Wallet className="w-3 h-3" /> Wallet balance</p>
            <p className="mt-2 text-5xl font-bold font-mono tabular-nums">{fmt(balance)}</p>
            <p className="text-sm text-white/75 mt-2 max-w-md">Top up via ICICI Virtual Account once Razorpay is wired (Phase 2). Until then, manually credit via the admin DB tool.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-[11px] uppercase tracking-widest text-[rgb(var(--text-secondary))] font-bold">This month</p>
            <p className="mt-2 text-3xl font-bold text-navy-900">{txns.length}</p>
            <p className="text-sm text-[rgb(var(--text-secondary))] mt-0.5">transactions</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-2">
          {txns.length === 0 ? (
            <EmptyState
              icon={<Receipt className="w-7 h-7" />}
              title="No transactions yet"
              body="Confirm a booking to see a debit, or top up to see a credit. Every wallet movement is logged here forever."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-crimson-700 font-bold border-b-[1.5px] border-crimson-100">
                    <th className="py-3 pr-4 font-semibold">Date</th>
                    <th className="py-3 pr-4 font-semibold">Type</th>
                    <th className="py-3 pr-4 font-semibold">Reference</th>
                    <th className="py-3 pr-4 font-semibold">Note</th>
                    <th className="py-3 pr-4 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {txns.map((t) => (
                    <tr key={t.id} className="border-b border-border-subtle hover:bg-surface-2 transition-colors">
                      <td className="py-3 pr-4">{formatDateShort(t.createdAt)}</td>
                      <td className="py-3 pr-4"><Pill variant={t.type === 'DEBIT' ? 'danger' : t.type === 'REFUND' ? 'warning' : 'success'}>{t.type}</Pill></td>
                      <td className="py-3 pr-4 font-mono text-xs">{t.ref ?? '—'}</td>
                      <td className="py-3 pr-4 text-[rgb(var(--text-secondary))]">{t.note ?? '—'}</td>
                      <td className={`py-3 pr-4 font-mono text-right ${t.type === 'DEBIT' ? 'text-danger-500' : 'text-success-500'}`}>
                        {t.type === 'DEBIT' ? '−' : '+'}{fmt(t.amountPaise)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
