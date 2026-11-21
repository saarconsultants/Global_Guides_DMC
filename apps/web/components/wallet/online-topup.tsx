'use client';
// Pay into the wallet online (UPI, card, net banking) through Razorpay's checkout.
// Renders nothing until NEXT_PUBLIC_RAZORPAY_KEY_ID is set.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';
const QUICK = [10_000, 25_000, 50_000, 1_00_000];

function loadCheckout(): Promise<boolean> {
  if ((window as any).Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = CHECKOUT_SRC; s.onload = () => resolve(true); s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function OnlineTopup() {
  const router = useRouter();
  const [rupees, setRupees] = useState('');
  const [busy, setBusy] = useState(false);
  if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) return null;
  const amount = Math.round(Number(rupees));
  const valid = Number.isFinite(amount) && amount >= 100 && amount <= 5_00_000;

  async function pay() {
    setBusy(true);
    try {
      const order = await fetch('/api/wallet/topup/order', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ rupees: amount }) }).then((r) => r.json());
      if (!order.ok) { toast.error('Could not start the payment', order.error); return; }
      if (!(await loadCheckout())) { toast.error('Payment window blocked', 'Your browser could not load the payment page. Check your connection or ad blocker and try again.'); return; }
      await new Promise<void>((done) => {
        new (window as any).Razorpay({
          key: order.keyId, order_id: order.orderId, amount: order.amountPaise, currency: 'INR',
          name: 'Global Guides DMC', description: `Wallet top-up · ${order.agencyName}`, prefill: { email: order.email },
          handler: async (res: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
            const v = await fetch('/api/wallet/topup/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderId: res.razorpay_order_id, paymentId: res.razorpay_payment_id, signature: res.razorpay_signature }) }).then((r) => r.json()).catch(() => null);
            if (v?.credited) toast.success('Wallet topped up', `₹${amount.toLocaleString('en-IN')} added to your wallet.`);
            else if (v?.pending) toast.info('Payment received', v.message);
            // The money may have moved even if our check failed: say so, with the reference.
            else toast.error('Payment not confirmed yet', `${v?.error ?? 'We could not confirm the payment.'} Reference: ${res.razorpay_payment_id}`);
            setRupees(''); router.refresh(); done();
          },
          modal: { ondismiss: () => done() },
        }).open();
      });
    } catch {
      toast.error('Network error', 'Nothing was charged. Try again.');
    } finally { setBusy(false); }
  }

  return (
    <div className="rounded-md border border-border-subtle bg-surface-2 p-3 space-y-2">
      <p className="text-sm font-bold text-ink">Pay online: UPI, card or net banking</p>
      <div className="flex flex-wrap gap-1.5">
        {QUICK.map((q) => (
          <button key={q} type="button" onClick={() => setRupees(String(q))} className={`min-h-9 px-2.5 rounded-md border text-[12.5px] font-semibold tnum ${amount === q ? 'border-crimson-700 bg-crimson-50 text-crimson-700' : 'border-border bg-surface text-ink-soft hover:border-border-strong'}`}>₹{q.toLocaleString('en-IN')}</button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input type="number" inputMode="numeric" min={100} max={500000} step={100} value={rupees} onChange={(e) => setRupees(e.target.value)} aria-label="Top-up amount in rupees" placeholder="Amount in ₹" className="control flex-1 money" />
        <Button size="sm" disabled={!valid || busy} onClick={pay}>{busy ? 'Opening…' : valid ? `Pay ₹${amount.toLocaleString('en-IN')}` : 'Pay online'}</Button>
      </div>
      <p className="text-xs text-[rgb(var(--text-secondary))]">₹100 to ₹5,00,000 per payment. Your wallet is credited as soon as the payment goes through.</p>
    </div>
  );
}
