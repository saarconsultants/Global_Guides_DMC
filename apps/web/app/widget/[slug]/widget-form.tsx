'use client';
import { useState } from 'react';
import { Check } from 'lucide-react';

export function WidgetForm({ slug, accent, primary }: { slug: string; accent: string; primary: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null); setBusy(true);
    const fd = new FormData(e.currentTarget);
    fd.append('slug', slug);
    try {
      const res = await fetch('/api/public/lead', { method: 'POST', body: fd });
      const j = await res.json();
      if (!res.ok || !j.ok) { setError(j.error ?? 'Something went wrong'); setBusy(false); return; }
      setDone(true);
    } catch {
      setError('Network error — please try again.');
    }
    setBusy(false);
  }

  if (done) {
    return (
      <div className="px-6 py-10 text-center space-y-3">
        <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center" style={{ background: accent + '33' }}>
          <Check className="w-6 h-6" style={{ color: primary }} />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Thanks — we've got your request</h2>
        <p className="text-sm text-gray-600">Our team will reach out within 24 hours with a tailored proposal.</p>
      </div>
    );
  }

  const inputCls = 'w-full h-10 px-3 rounded border border-gray-300 text-sm focus:outline-none focus:ring-2';

  return (
    <form onSubmit={submit} className="px-6 py-6 space-y-3">
      <input type="text" name="_hp" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Your name *</label>
        <input name="customerName" required className={inputCls} style={{ '--tw-ring-color': primary } as any} placeholder="Rakesh Mehta" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
          <input type="email" name="customerEmail" className={inputCls} placeholder="you@example.com" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Phone / WhatsApp</label>
          <input name="customerPhone" className={inputCls} placeholder="+91 9XXXXXXXXX" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Where do you want to go? *</label>
        <input name="destinations" required className={inputCls} placeholder="Bali, Phuket, Dubai…" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">From</label>
          <input name="originCity" className={inputCls} placeholder="Delhi" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Travel date</label>
          <input type="date" name="travelDate" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Nights</label>
          <input type="number" name="nights" min={1} max={60} className={inputCls} placeholder="6" />
        </div>
      </div>
      <p className="text-[11px] text-gray-500">Provide either email or phone so we can send you the proposal.</p>
      {error && <div className="rounded bg-red-50 text-red-700 px-3 py-2 text-xs">{error}</div>}
      <button type="submit" disabled={busy} className="w-full h-11 rounded text-white font-semibold text-sm disabled:opacity-60 transition-opacity" style={{ background: primary }}>
        {busy ? 'Sending…' : 'Request a proposal'}
      </button>
      <p className="text-[10px] text-center text-gray-400 pt-1">Powered by Global Guides DMC</p>
    </form>
  );
}
