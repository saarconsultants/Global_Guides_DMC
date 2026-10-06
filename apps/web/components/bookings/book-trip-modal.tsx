'use client';
// Book a proposal. For live Hotelbeds hotels this is the certified flow:
//   1. Check  — live price + cancellation terms + hotel remarks (/api/bookings/prepare)
//   2. Review — agent sees any price change, deadlines and remarks
//   3. Guests — first + last name for every guest in every room
//   4. Confirm — /api/bookings/confirm books each hotel (60s, never retried)
// Leamigo transfers ride the same flow: re-priced + prebooked at step 1, the
// lead passenger's contact collected at step 3, booked at step 4.
// Proposals with nothing live skip straight to a wallet confirmation.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { useMoney } from '@/components/providers/currency-provider';
import { CheckCircle2, Wallet, AlertTriangle, Briefcase, Loader2, Info } from 'lucide-react';

interface Props {
  proposalId: string;
  code: string;
  tripName: string;
  customerName?: string | null;
  netCostPaise: number;   // canonical INR paise (supplier net, debited from wallet)
  balancePaise: number;   // agency wallet balance, INR paise
  accepted: boolean;      // has the customer accepted the proposal?
  variant?: 'button' | 'link';
}

interface Policy { from: string; amountPaise: number }
interface Rate { roomName: string; board: string; rooms: number; adults: number; childAges: number[]; cancellationPolicies: Policy[]; rateComments?: string }
interface Hotel { hotelId: string; hotelName: string; cityName: string; address: string; checkIn: string; checkOut: string; rates: Rate[]; netPaise: number; quotedPaise: number; priceChangePct: number; sameRoomAndBoard: boolean }
interface Issue { cityName: string; hotelName: string; reason: string }
interface TQ { key: string; fromName: string; toName: string; pickupDate: string; pickupTime: string; vehicleName: string; provider: string; netPaise: number; quotedPaise: number; priceChangePct: number; sameVehicle: boolean; cancellationText: string; kind: string }
interface Contact { salutation: 'Mr' | 'Mrs' | 'Ms' | 'Miss' | 'Dr'; firstName: string; lastName: string; email: string; phone: string; flightNumber: string }
interface Prep { hotels: Hotel[]; transfers: TQ[]; manual: Issue[]; problems: Issue[]; token?: string; expiresAt?: string; tolerancePct: number; rooms: Array<{ adults: number; children?: number }>; leadName: string | null }
interface Guest { name: string; surname: string }
interface Booked { supplier?: string; hotelName?: string; fromName?: string; toName?: string; status: string; reference?: string; error?: string }

type Step = 'check' | 'review' | 'guests' | 'booking' | 'done';

const fmtDate = (s: string) => new Date(s).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function BookTripModal({ proposalId, code, tripName, customerName, netCostPaise, balancePaise, accepted, variant = 'button' }: Props) {
  const money = useMoney();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('check');
  const [prep, setPrep] = useState<Prep | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acceptRise, setAcceptRise] = useState(false);
  const [guests, setGuests] = useState<{ adults: Guest[]; children: Guest[] }[]>([]);
  const [contact, setContact] = useState<Contact>({ salutation: 'Mr', firstName: '', lastName: '', email: '', phone: '', flightNumber: '' });
  const [result, setResult] = useState<{ status: string; hotels: Booked[] } | null>(null);

  const hasHotels = (prep?.hotels.length ?? 0) > 0;
  const hasTransfers = (prep?.transfers?.length ?? 0) > 0;
  const live = hasHotels || hasTransfers;
  const increase = [...(prep?.hotels ?? []), ...(prep?.transfers ?? [])].reduce((s, h) => s + Math.max(0, h.netPaise - h.quotedPaise), 0);
  const debit = netCostPaise + increase;
  const enough = balancePaise >= debit;
  const rises = [...(prep?.hotels ?? []).map((h) => ({ name: h.hotelName, pct: h.priceChangePct })), ...(prep?.transfers ?? []).map((t) => ({ name: `${t.fromName} → ${t.toName}`, pct: t.priceChangePct }))].filter((x) => x.pct > (prep?.tolerancePct ?? 2));

  async function begin() {
    setOpen(true); setStep('check'); setError(null); setPrep(null); setAcceptRise(false); setResult(null);
    try {
      const r = await fetch('/api/bookings/prepare', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ proposalId }) });
      const j = await r.json();
      if (!j.ok) { setError(j.error ?? 'Could not check prices.'); return; }
      setPrep({ ...j, transfers: j.transfers ?? [] });
      const lead = (j.leadName ?? customerName ?? '').trim().split(/\s+/);
      setContact((c) => ({ ...c, firstName: c.firstName || lead[0] || '', lastName: c.lastName || lead.slice(1).join(' ') }));
      setGuests((j.rooms as Prep['rooms']).map((room, i) => ({
        adults: Array.from({ length: room.adults }, (_, k) => (i === 0 && k === 0 && lead[0] ? { name: lead[0], surname: lead.slice(1).join(' ') } : { name: '', surname: '' })),
        children: Array.from({ length: room.children ?? 0 }, () => ({ name: '', surname: '' })),
      })));
      setStep('review');
    } catch { setError('Network error while checking prices. Try again.'); }
  }

  function setGuest(room: number, kind: 'adults' | 'children', idx: number, field: keyof Guest, v: string) {
    setGuests((g) => g.map((r, i) => i !== room ? r : { ...r, [kind]: r[kind].map((p, k) => k !== idx ? p : { ...p, [field]: v }) }));
  }
  const contactOk = !!(contact.firstName.trim() && contact.lastName.trim() && /^\S+@\S+\.\S+$/.test(contact.email) && /^\+\d{8,15}$/.test(contact.phone.replace(/[\s-]/g, '')));
  const guestsOk = (!hasHotels || guests.every((r) => [...r.adults, ...r.children].every((p) => p.name.trim() && p.surname.trim()))) && (!hasTransfers || contactOk);

  async function confirm() {
    setStep('booking'); setError(null);
    try {
      const r = await fetch('/api/bookings/confirm', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ proposalId, quoteToken: prep?.token, guests: hasHotels ? { rooms: guests } : undefined, contact: hasTransfers ? contact : undefined, acceptPriceChange: acceptRise }) });
      const j = await r.json();
      if (j.ok) {
        setResult({ status: j.status, hotels: j.hotels ?? [] }); setStep('done');
        if (j.status === 'CONFIRMED') toast.success('Booking confirmed', `${code} is booked. Wallet debited ${money(debit)}.`);
        else toast.error('Partly booked', 'Some hotels did not confirm. Our team has been alerted.');
        router.refresh();
      } else {
        setError(j.error ?? 'Could not book.');
        setResult(j.hotels ? { status: 'FAILED', hotels: j.hotels } : null);
        setStep(j.code === 'guests' ? 'guests' : 'review');
        if (j.code === 'quote') setPrep(null);
      }
    } catch { setError('Network error. Check Bookings before retrying — the hotel may already be booked.'); setStep('review'); }
  }

  const close = () => { if (step !== 'booking') setOpen(false); };

  return (
    <>
      {variant === 'link' ? (
        <button onClick={begin} className="inline-flex items-center gap-1 text-xs font-semibold text-crimson-700 hover:underline" title="Convert to booking">
          <Briefcase className="w-3 h-3" />Book
        </button>
      ) : (
        <Button size="sm" onClick={begin} className="gap-1.5"><Briefcase className="w-4 h-4" />Book</Button>
      )}

      <Dialog open={open} onClose={close} title={`Book ${code}`} size={live && step !== 'done' ? 'lg' : 'sm'}>
        <div className="space-y-4">
          {error && (
            <div className="rounded-md border border-danger-500/30 bg-danger-100 text-danger-500 px-3 py-2 text-xs inline-flex items-start gap-2 w-full">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />{error}
            </div>
          )}

          {step === 'check' && !error && (
            <div className="py-8 flex flex-col items-center gap-3 text-sm text-[rgb(var(--text-secondary))]">
              <Loader2 className="w-6 h-6 animate-spin text-crimson-700" />Checking live hotel prices and cancellation terms…
            </div>
          )}
          {step === 'check' && error && <div className="flex justify-end"><Button onClick={begin}>Try again</Button></div>}

          {step === 'review' && prep && (
            <>
              <p className="text-sm text-[rgb(var(--text-secondary))]">
                <span className="font-medium text-ink">{tripName}</span>{customerName ? <> for <span className="font-medium text-ink">{customerName}</span></> : null}
              </p>
              {!accepted && <Note tone="warn">The customer hasn't accepted this proposal yet.</Note>}

              {prep.hotels.map((h) => (
                <div key={h.hotelId} className="rounded-md border border-border-subtle p-3 space-y-2 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{h.hotelName}</p>
                      <p className="text-xs text-[rgb(var(--text-secondary))]">{h.cityName} · <span className="font-mono">{h.checkIn} → {h.checkOut}</span></p>
                    </div>
                    <div className="text-right">
                      <p className="money font-bold text-ink">{money(h.netPaise)}</p>
                      {Math.abs(h.priceChangePct) >= 0.5 && (
                        <p className={`text-xs ${h.priceChangePct > 0 ? 'text-danger-500' : 'text-emerald-700'}`}>
                          {h.priceChangePct > 0 ? '+' : ''}{h.priceChangePct.toFixed(1)}% vs quoted {money(h.quotedPaise)}
                        </p>
                      )}
                    </div>
                  </div>
                  {!h.sameRoomAndBoard && <Note tone="warn">The quoted room or board is no longer available — this is the closest match.</Note>}
                  {h.rates.map((r, i) => (
                    <div key={i} className="border-t border-border-subtle pt-2 space-y-1">
                      <p className="text-ink">{r.rooms} × {r.roomName} · {r.board}</p>
                      <p className="text-xs text-[rgb(var(--text-secondary))]">
                        {r.cancellationPolicies.length === 0 ? 'Non-refundable — no refund if cancelled.' :
                          r.cancellationPolicies.map((c, k) => <span key={k} className="block">From {fmtDate(c.from)} (hotel local time): cancellation fee {money(c.amountPaise)}</span>)}
                      </p>
                      {r.rateComments && <p className="text-xs bg-[rgb(var(--surface-sunken,245_245_245))] rounded p-2 whitespace-pre-line"><span className="font-semibold">Hotel remarks: </span>{r.rateComments}</p>}
                    </div>
                  ))}
                </div>
              ))}

              {prep.transfers.map((t) => (
                <div key={t.key} className="rounded-md border border-border-subtle p-3 space-y-1 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{t.fromName} → {t.toName}</p>
                      <p className="text-xs text-[rgb(var(--text-secondary))]"><span className="font-mono">{t.pickupDate} {t.pickupTime}</span> · {t.vehicleName} · {t.provider} via Leamigo</p>
                    </div>
                    <div className="text-right">
                      <p className="money font-bold text-ink">{money(t.netPaise)}</p>
                      {Math.abs(t.priceChangePct) >= 0.5 && (
                        <p className={`text-xs ${t.priceChangePct > 0 ? 'text-danger-500' : 'text-emerald-700'}`}>{t.priceChangePct > 0 ? '+' : ''}{t.priceChangePct.toFixed(1)}% vs quoted {money(t.quotedPaise)}</p>
                      )}
                    </div>
                  </div>
                  {!t.sameVehicle && <Note tone="warn">The quoted vehicle is no longer offered — this is the closest match.</Note>}
                  <p className="text-xs text-[rgb(var(--text-secondary))]">Cancellation: {t.cancellationText}</p>
                </div>
              ))}

              {prep.manual.length > 0 && <Note tone="info">Booked by our team after confirmation: {prep.manual.map((m) => `${m.hotelName} (${m.cityName})`).join(', ')}.</Note>}
              {prep.problems.map((p, i) => <Note key={i} tone="warn">{p.hotelName} ({p.cityName}): {p.reason}</Note>)}

              <div className="rounded-md border border-border-subtle divide-y divide-border-subtle text-sm">
                <Row label="Total debited from wallet" value={money(debit)} bold />
                <Row label="Wallet balance" value={money(balancePaise)} />
                <Row label="Balance after booking" value={money(balancePaise - debit)} danger={!enough} />
              </div>

              {rises.length > 0 && (
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" checked={acceptRise} onChange={(e) => setAcceptRise(e.target.checked)} className="mt-1" />
                  I accept the higher supplier price for {rises.map((x) => x.name).join(', ')}.
                </label>
              )}
              {!enough && <Note tone="warn"><Wallet className="w-4 h-4 inline mr-1" />Insufficient wallet balance. Recharge, then try again.</Note>}

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button variant="ghost" onClick={close}>Cancel</Button>
                {!enough ? <Link href="/statement"><Button variant="secondary">View wallet</Button></Link>
                  : prep.problems.length > 0 ? <Button onClick={begin}>Check again</Button>
                  : <Button disabled={rises.length > 0 && !acceptRise} onClick={() => (live ? setStep('guests') : confirm())}>
                      {live ? (hasHotels ? 'Continue to guest names' : 'Continue to passenger contact') : 'Confirm & book'}
                    </Button>}
              </div>
            </>
          )}

          {step === 'guests' && prep && (
            <>
              {hasHotels && <p className="text-sm text-[rgb(var(--text-secondary))]">Names exactly as on passports. The hotel receives these.</p>}
              <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                {hasTransfers && (
                  <div className="rounded-md border border-border-subtle p-3 space-y-2">
                    <p className="label">Lead passenger — for the transfer driver</p>
                    <div className="grid grid-cols-[90px_1fr_1fr] gap-2">
                      <select className="control" value={contact.salutation} onChange={(e) => setContact({ ...contact, salutation: e.target.value as Contact['salutation'] })}>
                        {['Mr', 'Mrs', 'Ms', 'Miss', 'Dr'].map((x) => <option key={x}>{x}</option>)}
                      </select>
                      <input className="control" placeholder="First name" value={contact.firstName} onChange={(e) => setContact({ ...contact, firstName: e.target.value })} />
                      <input className="control" placeholder="Last name" value={contact.lastName} onChange={(e) => setContact({ ...contact, lastName: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input className="control" type="email" placeholder="Email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
                      <input className="control" type="tel" placeholder="Mobile, e.g. +919876543210" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
                    </div>
                    {prep.transfers.some((t) => t.kind !== 'inter-city') && (
                      <input className="control w-full" placeholder="Flight number (optional, helps the driver track delays)" value={contact.flightNumber} onChange={(e) => setContact({ ...contact, flightNumber: e.target.value })} />
                    )}
                  </div>
                )}
                {hasHotels && guests.map((room, ri) => (
                  <div key={ri} className="rounded-md border border-border-subtle p-3 space-y-2">
                    <p className="label">Room {ri + 1}</p>
                    {(['adults', 'children'] as const).map((kind) => room[kind].map((g, gi) => (
                      <div key={kind + gi} className="grid grid-cols-[90px_1fr_1fr] gap-2 items-center">
                        <span className="text-xs text-[rgb(var(--text-secondary))]">{kind === 'adults' ? 'Adult' : 'Child'} {gi + 1}{ri === 0 && kind === 'adults' && gi === 0 ? ' (lead)' : ''}</span>
                        <input className="control" placeholder="First name" value={g.name} onChange={(e) => setGuest(ri, kind, gi, 'name', e.target.value)} />
                        <input className="control" placeholder="Last name" value={g.surname} onChange={(e) => setGuest(ri, kind, gi, 'surname', e.target.value)} />
                      </div>
                    )))}
                  </div>
                ))}
              </div>
              <Note tone="info">Confirming books these hotels and transfers with the suppliers and debits {money(debit)} from your wallet. Cancellation fees apply as shown on the previous step.</Note>
              <div className="flex items-center justify-between gap-2 pt-1">
                <Button variant="ghost" onClick={() => setStep('review')}>Back</Button>
                <Button disabled={!guestsOk} onClick={confirm} className="gap-1.5"><CheckCircle2 className="w-4 h-4" />Confirm & book</Button>
              </div>
            </>
          )}

          {step === 'booking' && (
            <div className="py-8 flex flex-col items-center gap-3 text-sm text-[rgb(var(--text-secondary))]">
              <Loader2 className="w-6 h-6 animate-spin text-crimson-700" />
              Confirming with the hotels — this can take up to a minute. Don't close this window.
            </div>
          )}

          {step === 'done' && result && (
            <>
              <div className={`rounded-md px-3 py-3 text-sm ${result.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                {result.status === 'CONFIRMED' ? `${code} is confirmed.` : `${code} is partly confirmed. Our team will follow up on the hotels below that failed.`}
              </div>
              {result.hotels.length > 0 && (
                <div className="rounded-md border border-border-subtle divide-y divide-border-subtle text-sm">
                  {result.hotels.map((h, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 gap-3">
                      <span className="text-ink">{h.hotelName ?? `${h.fromName} → ${h.toName}`}</span>
                      {h.status === 'CONFIRMED' ? <span className="font-mono text-xs text-emerald-700">{h.reference}</span> : <span className="text-xs text-danger-500">{h.error ?? 'Failed'}</span>}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end"><Button onClick={() => { setOpen(false); router.push('/bookings'); }}>Go to bookings</Button></div>
            </>
          )}
        </div>
      </Dialog>
    </>
  );
}

function Note({ tone, children }: { tone: 'warn' | 'info'; children: React.ReactNode }) {
  return (
    <div className={`rounded-md border px-3 py-2 text-xs inline-flex items-start gap-2 w-full ${tone === 'warn' ? 'border-warning-500/30 bg-amber-50 text-amber-700' : 'border-border-subtle bg-[rgb(var(--surface-sunken,245_245_245))] text-[rgb(var(--text-secondary))]'}`}>
      {tone === 'warn' ? <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />}<span>{children}</span>
    </div>
  );
}

function Row({ label, value, bold, danger }: { label: string; value: string; bold?: boolean; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="text-[rgb(var(--text-secondary))]">{label}</span>
      <span className={`money ${bold ? 'font-bold text-ink' : danger ? 'text-danger-500' : 'text-ink'}`}>{value}</span>
    </div>
  );
}
