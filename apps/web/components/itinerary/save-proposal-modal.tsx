'use client';
import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { Check, Copy, ExternalLink, MessageCircle, Mail, Percent } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  defaultMarkupPct: number;
  netPaise: number;
  currentTotalPaise: number;
  onSave: (args: { customer: { name: string; email?: string; phone?: string }; markupPct: number }) => Promise<{ ok: true; code: string; shareToken: string } | { ok: false; error: string }>;
}

export function SaveProposalModal({ open, onClose, defaultMarkupPct, netPaise, currentTotalPaise, onSave }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [markup, setMarkup] = useState(String(defaultMarkupPct));
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ code: string; shareToken: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const markupPct = Math.max(0, Math.min(100, parseFloat(markup) || 0));
  // Live preview: customer total = net + markup
  const previewTotal = Math.round(netPaise * (1 + markupPct / 100));
  const margin = previewTotal - netPaise;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setBusy(true);
    const r = await onSave({ customer: { name: name || 'Unknown customer', email: email || undefined, phone: phone || undefined }, markupPct });
    setBusy(false);
    if (r.ok) {
      setResult({ code: r.code, shareToken: r.shareToken });
      toast.success(`Proposal saved as ${r.code}`, 'Share the link with your customer to track their response.');
    } else {
      setError(r.error);
      toast.error('Save failed', r.error);
    }
  }

  function reset() { setName(''); setEmail(''); setPhone(''); setMarkup(String(defaultMarkupPct)); setResult(null); setError(null); onClose(); }

  const shareUrl = result ? `${typeof window !== 'undefined' ? window.location.origin : ''}/p/${result.shareToken}` : '';
  const customerFirstName = (name || 'there').split(/\s+/)[0];

  // Pre-built share messages
  const whatsappText = result ? `Hi ${customerFirstName}, here's the trip we just put together for you (${result.code}). Tap to view, accept, or request changes:\n\n${shareUrl}` : '';
  const emailSubject = result ? `Your trip proposal · ${result.code}` : '';
  const emailBody    = result ? `Hi ${customerFirstName},\n\nHere is the trip proposal we just put together for you (${result.code}).\n\nView, accept, or request changes here:\n${shareUrl}\n\nLet me know if you'd like any tweaks.\n\nWarm regards,` : '';

  function waUrl() {
    const phoneClean = phone.replace(/\D/g, '');
    if (phoneClean) return `https://wa.me/${phoneClean}?text=${encodeURIComponent(whatsappText)}`;
    return `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
  }
  function mailtoUrl() {
    const to = email ? encodeURIComponent(email) : '';
    return `mailto:${to}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
  }

  return (
    <Dialog open={open} onClose={reset} title={result ? 'Proposal saved' : 'Save proposal'} size="md">
      {!result ? (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-[rgb(var(--text-secondary))]">Customer details (optional — you can fill these later from the lead page).</p>
          <div><Label>Customer name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rakesh Mehta" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="rakesh@example.com" /></div>
            <div><Label>WhatsApp / phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 9XXXXXXXXX" /></div>
          </div>

          {/* Markup override + live preview */}
          <div className="rounded-md border border-border-subtle bg-surface-2 p-3 space-y-2">
            <div className="flex items-center gap-3">
              <Percent className="w-4 h-4 text-crimson-700" />
              <Label className="!mb-0 flex-1">Agency markup this proposal</Label>
              <div className="flex items-center gap-1.5">
                <Input type="number" value={markup} onChange={(e) => setMarkup(e.target.value)} step={0.5} min={0} max={100} className="w-20 h-8 text-sm" />
                <span className="text-sm text-[rgb(var(--text-secondary))]">%</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-border-subtle/40">
              <div><p className="text-[10px] uppercase tracking-widest text-[rgb(var(--text-secondary))] font-bold">Net cost</p><p className="font-mono text-sm text-navy-900">₹ {(netPaise / 100).toLocaleString('en-IN')}</p></div>
              <div><p className="text-[10px] uppercase tracking-widest text-[rgb(var(--text-secondary))] font-bold">Margin</p><p className="font-mono text-sm text-success-500">₹ {(margin / 100).toLocaleString('en-IN')}</p></div>
              <div><p className="text-[10px] uppercase tracking-widest text-[rgb(var(--text-secondary))] font-bold">Customer total</p><p className="font-mono text-sm font-bold text-crimson-900">₹ {(previewTotal / 100).toLocaleString('en-IN')}</p></div>
            </div>
            {Math.abs(previewTotal - currentTotalPaise) > 100 && (
              <p className="text-[11px] text-warning-500">Heads up &mdash; this differs from the price shown in the builder ({(currentTotalPaise / 100).toLocaleString('en-IN')}). The saved proposal will use the customer total above.</p>
            )}
          </div>

          {error && <div className="rounded-md bg-danger-100 text-danger-500 px-3 py-2 text-sm">{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={reset}>Cancel</Button>
            <Button type="submit" disabled={busy} className="gap-2">{busy ? <><Spinner size="sm" className="text-white" />Saving…</> : 'Save proposal'}</Button>
          </div>
        </form>
      ) : (
        <div className="space-y-5">
          <div className="rounded-md bg-success-100 text-success-500 px-3 py-2 text-sm inline-flex items-center gap-2">
            <Check className="w-4 h-4" /> Saved as <strong className="font-mono">{result.code}</strong>
          </div>

          <div>
            <Label>Customer share link</Label>
            <div className="flex items-center gap-2">
              <Input value={shareUrl} readOnly className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
              <Button size="icon" variant="secondary" onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success('Link copied'); }} aria-label="Copy link" title="Copy link">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-[rgb(var(--text-secondary))] mt-1.5">They don't need to log in. You'll see their status change here the moment they open it.</p>
          </div>

          {/* Share buttons */}
          <div>
            <Label>Share now</Label>
            <div className="grid grid-cols-2 gap-2">
              <a href={waUrl()} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-[#25D366] text-white text-sm font-semibold hover:bg-[#1ebe57] transition-colors">
                <MessageCircle className="w-4 h-4" />WhatsApp
              </a>
              <a href={mailtoUrl()} className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-action-500 text-white text-sm font-semibold hover:bg-action-600 transition-colors">
                <Mail className="w-4 h-4" />Email
              </a>
            </div>
            {phone && <p className="text-xs text-[rgb(var(--text-secondary))] mt-1.5">WhatsApp will open <span className="font-mono">{phone}</span> with a pre-filled message.</p>}
            {!phone && <p className="text-xs text-[rgb(var(--text-secondary))] mt-1.5">No phone entered &mdash; WhatsApp will let you pick a contact.</p>}
          </div>

          <div className="flex justify-between gap-2 pt-2 border-t border-border-subtle">
            <a href={`/p/${result.shareToken}`} target="_blank" rel="noreferrer" className="inline-flex"><Button variant="ghost" className="gap-1.5"><ExternalLink className="w-4 h-4" />Preview as customer</Button></a>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={reset}>Close</Button>
              <a href="/proposals" className="inline-flex"><Button variant="primary">Go to My Proposals</Button></a>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
