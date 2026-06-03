'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { useMoney } from '@/components/providers/currency-provider';
import { confirmBookingAction } from '@/app/actions/confirm-booking';
import { CheckCircle2, Wallet, AlertTriangle, Briefcase } from 'lucide-react';

interface Props {
  proposalId: string;
  code: string;
  tripName: string;
  customerName?: string | null;
  netCostPaise: number;   // canonical INR paise (supplier net, debited from wallet)
  balancePaise: number;   // agency wallet balance, INR paise
  accepted: boolean;      // has the customer accepted the proposal?
  /** Optional custom trigger; defaults to a "Book" button. */
  variant?: 'button' | 'link';
}

export function BookTripModal({ proposalId, code, tripName, customerName, netCostPaise, balancePaise, accepted, variant = 'button' }: Props) {
  const money = useMoney();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const enough = balancePaise >= netCostPaise;
  const after = balancePaise - netCostPaise;

  function confirm() {
    start(async () => {
      const res = await confirmBookingAction(proposalId);
      if (res.ok) {
        toast.success('Booking confirmed', `${code} is now booked. Wallet debited ${money(netCostPaise)}.`);
        setOpen(false);
        router.push('/bookings');
        router.refresh();
      } else if (res.error === 'insufficient_funds') {
        toast.error('Not enough wallet balance', 'Recharge your wallet to confirm this booking.');
      } else if (res.error === 'already_booked') {
        toast.error('Already booked', 'This proposal has already been converted to a booking.');
        setOpen(false);
        router.refresh();
      } else {
        toast.error('Could not book', 'This proposal cannot be booked in its current state.');
      }
    });
  }

  return (
    <>
      {variant === 'link' ? (
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-xs font-semibold text-crimson-700 hover:underline" title="Convert to booking">
          <Briefcase className="w-3 h-3" />Book
        </button>
      ) : (
        <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5"><Briefcase className="w-4 h-4" />Book</Button>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title={`Confirm booking — ${code}`} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-[rgb(var(--text-secondary))]">
            Convert <span className="font-medium text-navy-900">{tripName}</span>{customerName ? <> for <span className="font-medium text-navy-900">{customerName}</span></> : null} into a confirmed booking. Your wallet is debited the supplier net cost; your markup stays as margin.
          </p>

          {!accepted && (
            <div className="rounded-md border border-warning-500/30 bg-amber-50 text-amber-700 px-3 py-2 text-xs inline-flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              The customer hasn't accepted this proposal yet. You can still book, but usually you'd wait for acceptance.
            </div>
          )}

          <div className="rounded-md border border-border-subtle divide-y divide-border-subtle text-sm">
            <Row label="Net cost (debited)" value={money(netCostPaise)} bold />
            <Row label="Wallet balance" value={money(balancePaise)} />
            <Row label="Balance after booking" value={money(after)} danger={!enough} />
          </div>

          {!enough ? (
            <div className="rounded-md border border-danger-500/30 bg-danger-100 text-danger-500 px-3 py-2 text-xs">
              <span className="inline-flex items-center gap-1.5"><Wallet className="w-4 h-4" />Insufficient wallet balance.</span> Ask your platform admin to credit your wallet, then try again.
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            {enough ? (
              <Button onClick={confirm} disabled={pending} className="gap-1.5">
                <CheckCircle2 className="w-4 h-4" />{pending ? 'Booking…' : 'Confirm & book'}
              </Button>
            ) : (
              <Link href="/statement"><Button variant="secondary">View wallet</Button></Link>
            )}
          </div>
        </div>
      </Dialog>
    </>
  );
}

function Row({ label, value, bold, danger }: { label: string; value: string; bold?: boolean; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="text-[rgb(var(--text-secondary))]">{label}</span>
      <span className={`font-mono tabular-nums ${bold ? 'font-bold text-navy-900' : danger ? 'text-danger-500' : 'text-navy-900'}`}>{value}</span>
    </div>
  );
}
