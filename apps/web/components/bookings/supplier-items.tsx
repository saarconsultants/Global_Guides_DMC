'use client';
// Per-booking supplier list: every Hotelbeds hotel and Leamigo transfer with
// its reference and status, and a two-step cancel (fee preview → confirm).

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { useMoney } from '@/components/providers/currency-provider';
import { statusLabel } from '@/lib/labels';
import { Settings2, Loader2 } from 'lucide-react';

export interface SupplierRow {
  supplier: 'HOTELBEDS' | 'LEAMIGO';
  status: 'CONFIRMED' | 'FAILED' | 'CANCELLED';
  reference?: string;
  title: string;
  detail: string;
  netPaise: number;
  error?: string;
}

export function SupplierItems({ bookingId, code, items }: { bookingId: string; code: string; items: SupplierRow[] }) {
  const money = useMoney();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ ref: string; feePaise: number; refundPaise: number } | null>(null);

  const route = (s: SupplierRow['supplier']) => (s === 'HOTELBEDS' ? '/api/bookings/cancel-hotel' : '/api/bookings/cancel-transfer');

  async function call(item: SupplierRow, confirm: boolean) {
    setBusy(item.reference!);
    try {
      const r = await fetch(route(item.supplier), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ bookingId, reference: item.reference, confirm }) });
      const j = await r.json();
      if (!j.ok) { toast.error('Could not cancel', j.error ?? 'Try again.'); return; }
      if (!confirm) { setPreview({ ref: item.reference!, feePaise: j.feePaise, refundPaise: j.refundPaise }); return; }
      toast.success('Cancelled', `${item.title} cancelled. ${money(j.refundPaise)} refunded to your wallet.`);
      setPreview(null);
      router.refresh();
    } catch { toast.error('Network error', 'Check the booking status before retrying.'); }
    finally { setBusy(null); }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-xs font-semibold text-crimson-700 hover:underline" title="Hotels and transfers in this booking">
        <Settings2 className="w-3.5 h-3.5" />Manage
      </button>
      <Dialog open={open} onClose={() => { setOpen(false); setPreview(null); }} title={`Suppliers · ${code}`} size="md">
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="rounded-md border border-border-subtle p-3 text-sm space-y-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">{it.title}</p>
                  <p className="text-xs text-[rgb(var(--text-secondary))]">{it.detail}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-xs">{it.supplier === 'HOTELBEDS' ? 'HB' : 'LM'} {it.reference ?? '—'}</p>
                  <p className={`text-xs font-semibold ${it.status === 'CONFIRMED' ? 'text-emerald-700' : it.status === 'CANCELLED' ? 'text-[rgb(var(--text-tertiary))]' : 'text-danger-500'}`}>{statusLabel(it.status)}</p>
                </div>
              </div>
              {it.error && <p className="text-xs text-danger-500">{it.error}</p>}
              {it.status === 'CONFIRMED' && it.reference && (
                preview?.ref === it.reference ? (
                  <div className="rounded bg-amber-50 text-amber-800 px-3 py-2 text-xs flex items-center justify-between gap-3">
                    <span>Cancellation fee {money(preview.feePaise)} · refund {money(preview.refundPaise)} to wallet.</span>
                    <span className="flex gap-2 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => setPreview(null)}>Keep</Button>
                      <Button size="sm" disabled={!!busy} onClick={() => call(it, true)}>{busy === it.reference ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm cancel'}</Button>
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => call(it, false)}>
                      {busy === it.reference ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cancel…'}
                    </Button>
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      </Dialog>
    </>
  );
}
