import { Card, CardContent } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Button, ButtonLink } from '@/components/ui/button';
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
    <div className="mx-auto max-w-7xl px-6 py-8 lg:py-10 space-y-6">
      <PageHeader
        title="Account statement"
        description="Wallet ledger and booking-level debits. Top up to enable instant bookings."
        actions={
          <>
            <ButtonLink href="/api/export/statement" external variant="secondary" className="gap-1.5"><Download className="w-4 h-4" />Export CSV</ButtonLink>
            <RechargeButton />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg bg-ink text-white shadow-sm overflow-hidden flex flex-col lg:flex-row">
          <div className="flex-1 px-6 py-6">
            <p className="label text-amber-500 inline-flex items-center gap-1.5"><Wallet className="w-3 h-3" /> Wallet balance</p>
            <p className="mt-2 money text-[44px] leading-none">{fmt(balance)}</p>
            <p className="text-[13px] text-white/70 mt-3 max-w-md">Bookings confirm instantly against this balance. Top up by NEFT/IMPS bank transfer and WhatsApp us the receipt.</p>
          </div>
          <div className="lg:w-[220px] border-t lg:border-t-0 lg:border-l border-dashed border-white/25 px-6 py-5 flex flex-col justify-center gap-1">
            <p className="label text-white/60">Account</p>
            <p className="font-mono text-[13px] font-bold tnum">924020014711</p>
            <p className="font-mono text-[12px] text-white/70 tnum">AXIS0001234</p>
            <p className="text-[12px] text-white/70">Global Guides DMC LLP</p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="label">This month</p>
            <p className="mt-2 text-[30px] font-extrabold text-ink tnum leading-none">{txns.length}</p>
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
                  <tr className="text-left label border-b border-border">
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
