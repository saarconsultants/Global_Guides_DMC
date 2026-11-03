'use client';
// Per-booking supplier list: every Hotelbeds hotel and Leamigo item with its
// reference and status, a two-step cancel (fee preview → confirm), and for
// Leamigo items the live status, driver, contacts, voucher and changes.

import { useEffect, useState } from 'react';
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
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1 min-h-6 hit-area text-xs font-semibold text-crimson-700 hover:underline" title="Hotels and transfers in this booking">
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
              {it.supplier === 'LEAMIGO' && it.reference && <LeamigoLivePanel bookingId={bookingId} reference={it.reference} ourStatus={it.status} open={open} />}
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

interface Live {
  status: string; serviceStatus?: string; supplierReference?: string; confirmationDeadline?: string;
  driver?: { name?: string; phone?: string; vehicle?: string; color?: string; plate?: string };
  supplier?: { name?: string; phone?: string; email?: string; emergency?: string; contact247?: string; reservations?: string };
  meetingPoints: string[]; voucherUrl?: string; voucherCodes: string[]; flightNumber?: string; addons: string[];
  from?: string; to?: string; travelDate?: string; travelTime?: string; passengers?: number; vehicle?: string; hours?: number; kmsIncluded?: number;
  tickets: Array<{ name: string; quantity: number }>; policies: string[];
}

const nice = (s?: string) => (s ? s.replace(/_/g, ' ') : '');
const inputCls = 'control h-10 w-full text-sm';

/** What Leamigo says right now about one item, and the changes it allows. */
function LeamigoLivePanel({ bookingId, reference, ourStatus, open }: { bookingId: string; reference: string; ourStatus: SupplierRow['status']; open: boolean }) {
  const [live, setLive] = useState<Live | null>(null);
  const [product, setProduct] = useState<'transfer' | 'rental' | 'activity' | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [mode, setMode] = useState<'amend' | 'reschedule' | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const post = (payload: object) => fetch('/api/bookings/supplier-manage', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ bookingId, reference, ...payload }) }).then((r) => r.json());
  const load = () => {
    setState('loading');
    post({ action: 'details' }).then((j) => { if (j.ok) { setLive(j.live); setProduct(j.product); setState('ready'); } else setState('error'); }).catch(() => setState('error'));
  };
  useEffect(() => { if (open) load(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    setSaving(true);
    try {
      const j = await post(mode === 'amend' ? { action: 'amend', amend: form } : { action: 'reschedule', startDateTime: form.start, endDateTime: form.end, comment: form.comment });
      if (!j.ok) { toast.error('Leamigo refused the change', j.error ?? 'Try again.'); return; }
      toast.success('Sent to Leamigo', mode === 'amend' ? 'The booking was updated.' : 'Leamigo will confirm the new time.');
      setMode(null); setForm({}); load();
    } catch { toast.error('Network error', 'Check the booking before retrying.'); }
    finally { setSaving(false); }
  }

  if (state === 'loading') return <p className="text-xs text-[rgb(var(--text-secondary))] pt-1"><Loader2 className="inline w-3 h-3 animate-spin mr-1" />Checking with Leamigo…</p>;
  if (state === 'error' || !live) return <p role="status" className="text-xs text-[rgb(var(--text-secondary))] pt-1">Live details couldn&apos;t load. Reopen to try again.</p>;

  const cancelledThere = /cancel/i.test(`${live.status} ${live.serviceStatus ?? ''}`);
  const contact = live.supplier;
  const field = (k: string, label: string, type = 'text') => (
    <label className="block text-xs"><span className="label block mb-1">{label}</span>
      <input type={type} className={inputCls} value={form[k] ?? ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></label>
  );

  return (
    <div className="pt-2 mt-1 border-t border-border-subtle space-y-1 text-xs text-[rgb(var(--text-secondary))]">
      <p>Leamigo status: <span className="font-semibold text-ink capitalize">{nice(live.status)}{live.serviceStatus ? ` · ${nice(live.serviceStatus)}` : ''}</span></p>
      {ourStatus === 'CONFIRMED' && cancelledThere && <p role="alert" className="rounded bg-amber-50 text-amber-800 px-2 py-1">Leamigo shows this as cancelled, but it is still confirmed here. Contact Leamigo before the trip.</p>}
      {(live.from || live.to) && <p>Route: <span className="text-ink">{[live.from, live.to].filter(Boolean).join(' → ')}</span></p>}
      {live.travelDate && <p>When: <span className="text-ink tnum">{[live.travelDate, live.travelTime].filter(Boolean).join(' at ')}</span></p>}
      {(live.passengers || live.vehicle || live.hours) && <p>Booked: <span className="text-ink">{[live.passengers ? `${live.passengers} guest${live.passengers !== 1 ? 's' : ''}` : null, live.vehicle, live.hours ? `${live.hours} hours` : null, live.kmsIncluded ? `${live.kmsIncluded} km included` : null].filter(Boolean).join(' · ')}</span></p>}
      {live.tickets.length > 0 && <p>Tickets: <span className="text-ink">{live.tickets.map((t) => `${t.quantity} × ${t.name}`).join(', ')}</span></p>}
      {live.supplierReference && <p>Supplier reference: <span className="font-mono text-ink">{live.supplierReference}</span></p>}
      {live.confirmationDeadline && <p>Confirm by: <span className="text-ink">{live.confirmationDeadline}</span></p>}
      {live.driver && <p>Driver: <span className="text-ink">{[live.driver.name, live.driver.phone, live.driver.vehicle, live.driver.color, live.driver.plate].filter(Boolean).join(' · ')}</span></p>}
      {contact && <p>Supplier: <span className="text-ink">{[contact.name, contact.phone, contact.email].filter(Boolean).join(' · ')}</span></p>}
      {(contact?.emergency || contact?.contact247) && <p>Emergency: <span className="text-ink">{[contact.emergency, contact.contact247].filter(Boolean).join(' · ')}</span></p>}
      {live.flightNumber && <p>Flight: <span className="font-mono text-ink">{live.flightNumber}</span></p>}
      {live.meetingPoints.length > 0 && <p>Meeting point: <span className="text-ink">{live.meetingPoints.join(' · ')}</span></p>}
      {live.addons.length > 0 && <p>Add-ons: <span className="text-ink">{live.addons.join(', ')}</span></p>}
      {live.policies.length > 0 && <p>Policies: <span className="text-ink">{live.policies.join(' · ')}</span></p>}
      {live.voucherCodes.length > 0 && <p>Voucher codes: <span className="font-mono text-ink">{live.voucherCodes.join(', ')}</span></p>}
      {live.voucherUrl && (live.voucherUrl.startsWith('data:image/')
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={live.voucherUrl} alt="Supplier voucher code" className="w-32 h-32 rounded border border-border-subtle bg-white" />
        : live.voucherUrl.startsWith('https://') ? <p><a href={live.voucherUrl} target="_blank" rel="noreferrer" className="font-semibold text-crimson-700 hover:underline">Open supplier voucher</a></p> : null)}

      {ourStatus === 'CONFIRMED' && !cancelledThere && !mode && (
        <div className="flex justify-end gap-2 pt-1">
          {product !== 'activity' && <Button size="sm" variant="secondary" onClick={() => setMode('amend')}>Change details</Button>}
          {product === 'activity' && /headout/i.test(contact?.name ?? '') && <Button size="sm" variant="secondary" onClick={() => setMode('reschedule')}>Reschedule</Button>}
        </div>
      )}
      {mode === 'amend' && (
        <div className="grid sm:grid-cols-2 gap-2 pt-1">
          {field('firstName', 'First name')}{field('lastName', 'Last name')}{field('email', 'Email', 'email')}{field('phone', 'Phone', 'tel')}
          {product === 'transfer' && field('flightNumber', 'Flight number')}{field('specialRequirements', 'Notes for the driver')}
        </div>
      )}
      {mode === 'reschedule' && (
        <div className="grid sm:grid-cols-2 gap-2 pt-1">
          {field('start', 'New start', 'datetime-local')}{field('end', 'New end', 'datetime-local')}
        </div>
      )}
      {mode && (
        <div className="flex justify-end gap-2 pt-1">
          <Button size="sm" variant="ghost" onClick={() => { setMode(null); setForm({}); }}>Back</Button>
          <Button size="sm" disabled={saving} onClick={save}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send to Leamigo'}</Button>
        </div>
      )}
    </div>
  );
}
