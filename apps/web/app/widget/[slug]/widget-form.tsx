'use client';
import { useState } from 'react';
import { Check } from 'lucide-react';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function WidgetForm({ slug }: { slug: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    if (!String(fd.get('customerEmail') ?? '').trim() && !String(fd.get('customerPhone') ?? '').trim()) {
      setError('Please add an email or a phone number so we can send you the proposal.');
      return;
    }
    setBusy(true);
    fd.append('slug', slug);
    try {
      const res = await fetch('/api/public/lead', { method: 'POST', body: fd });
      const j = await res.json();
      if (!res.ok || !j.ok) { setError(j.error ?? 'Something went wrong. Please try again.'); setBusy(false); return; }
      setDone(true);
    } catch {
      setError('We couldn’t reach the server. Please check your connection and try again.');
    }
    setBusy(false);
  }

  if (done) {
    return (
      <div className="px-6 py-10 text-center space-y-3" role="status">
        <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center bg-success-100">
          <Check className="w-6 h-6 text-success-600" aria-hidden />
        </div>
        <h2 className="text-lg font-extrabold text-ink">Thanks, we’ve got your request</h2>
        <p className="text-sm text-[rgb(var(--text-secondary))]">We’ll reply within 24 hours with a trip proposal made for you.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="px-6 py-6 space-y-4">
      <input type="text" name="_hp" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div>
        <Label htmlFor="w-customerName" required>Your name</Label>
        <Input id="w-customerName" name="customerName" required autoComplete="name" placeholder="Rakesh Mehta" />
      </div>

      <fieldset>
        <legend className="label mb-1.5">How can we reach you?<span className="text-crimson-700 ml-0.5" aria-hidden>*</span></legend>
        <p className="text-[12px] text-[rgb(var(--text-secondary))] -mt-0.5 mb-2">Email or phone, at least one.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="w-customerEmail" className="sr-only">Email</Label>
            <Input id="w-customerEmail" type="email" name="customerEmail" autoComplete="email" placeholder="Email" />
          </div>
          <div>
            <Label htmlFor="w-customerPhone" className="sr-only">Phone or WhatsApp</Label>
            <Input id="w-customerPhone" type="tel" name="customerPhone" autoComplete="tel" placeholder="Phone / WhatsApp" />
          </div>
        </div>
      </fieldset>

      <div>
        <Label htmlFor="w-destinations" required>Where do you want to go?</Label>
        <Input id="w-destinations" name="destinations" required placeholder="Bali, Phuket, Dubai…" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor="w-originCity">From</Label>
          <Input id="w-originCity" name="originCity" placeholder="Delhi" />
        </div>
        <div>
          <Label htmlFor="w-travelDate">Travel date</Label>
          <Input id="w-travelDate" type="date" name="travelDate" className="px-2.5 text-[14px]" />
        </div>
        <div>
          <Label htmlFor="w-nights">Nights</Label>
          <Input id="w-nights" type="number" inputMode="numeric" name="nights" min={1} max={60} placeholder="6" />
        </div>
      </div>
      {error && <div role="alert" className="rounded-md bg-danger-100 text-danger-500 px-3 py-2 text-sm font-semibold">{error}</div>}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? 'Sending…' : 'Request a proposal'}
      </Button>
      <p className="text-[12.5px] text-center text-[rgb(var(--text-secondary))]">We’ll reply within 24 hours. No payment needed.</p>
      <p className="text-[10.5px] text-center text-[rgb(var(--text-tertiary))]">Powered by Global Guides DMC</p>
    </form>
  );
}
