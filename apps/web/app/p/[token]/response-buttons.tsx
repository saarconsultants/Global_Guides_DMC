'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, MessageSquare, Loader2 } from 'lucide-react';

type Mode = null | 'accept' | 'changes';

export function ResponseButtons({ token, accent = '#C9A24A' }: { token: string; accent?: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [mode, setMode] = useState<Mode>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changesSent, setChangesSent] = useState(false);

  async function send(payload: { action: 'ACCEPT' } | { action: 'REQUEST_CHANGES'; message: string }) {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/p/${token}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setError(typeof data?.error === 'string' ? data.error : "We couldn't send that just now. Please try again.");
        setSubmitting(false);
        return;
      }
      if (payload.action === 'ACCEPT') {
        // Page re-renders with the "accepted" banner; keep the button disabled meanwhile.
        startTransition(() => router.refresh());
      } else {
        setChangesSent(true);
        setMode(null);
        setMessage('');
        setSubmitting(false);
      }
    } catch {
      setError("We couldn't reach the server. Please check your connection and try again.");
      setSubmitting(false);
    }
  }

  const errorBox = error && (
    <p role="alert" className="rounded-md bg-white/15 border border-white/30 px-3 py-2 text-sm text-white">{error}</p>
  );

  if (mode === 'accept') {
    return (
      <div className="mt-6 rounded-md bg-white/10 backdrop-blur-md border border-white/20 p-4 text-sm space-y-3">
        <p>By accepting, you confirm you're happy with the plan and price. Your travel agent will reach out to collect payment details and confirm bookings.</p>
        {errorBox}
        <div className="flex gap-2 justify-end">
          <button type="button" disabled={submitting} onClick={() => { setMode(null); setError(null); }} className="px-4 py-2 rounded-md text-sm text-navy-100 hover:text-white disabled:opacity-50">Cancel</button>
          <button type="button" disabled={submitting} onClick={() => send({ action: 'ACCEPT' })} className="px-5 py-2 rounded-md text-sm font-semibold bg-success-500 hover:bg-success-500/90 text-white inline-flex items-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {submitting ? 'Confirming…' : 'Confirm acceptance'}
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'changes') {
    const empty = message.trim().length === 0;
    return (
      <div className="mt-6 rounded-md bg-white/10 backdrop-blur-md border border-white/20 p-4 text-sm space-y-3">
        <label htmlFor="change-request" className="block">Tell us what you'd like to change and we'll send you an updated proposal.</label>
        <textarea id="change-request" value={message} maxLength={2000} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. Different hotel in Paris, fewer activities, July dates instead of June..." className="w-full h-24 rounded-md p-3 text-sm bg-white/10 border border-white/20 text-white placeholder:text-navy-200 focus:outline-none focus:ring-2 focus:ring-white/60" />
        {errorBox}
        <div className="flex gap-2 justify-end">
          <button type="button" disabled={submitting} onClick={() => { setMode(null); setError(null); }} className="px-4 py-2 rounded-md text-sm text-navy-100 hover:text-white disabled:opacity-50">Cancel</button>
          <button type="button" disabled={submitting || empty} onClick={() => send({ action: 'REQUEST_CHANGES', message: message.trim() })} style={{ background: accent, color: '#081428' }} className="px-5 py-2 rounded-md text-sm font-semibold hover:opacity-90 inline-flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />} {submitting ? 'Sending…' : 'Send to your agent'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      {changesSent && (
        <p role="status" className="rounded-md bg-white/15 border border-white/30 px-4 py-3 text-sm inline-flex items-center gap-2">
          <Check className="w-4 h-4" /> Thanks, your message has been sent. Your travel agent will get back to you with an updated proposal.
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => setMode('accept')} style={{ background: accent, color: '#081428' }} className="px-6 py-3 rounded-md text-sm font-semibold hover:opacity-90 inline-flex items-center gap-2 cursor-pointer">
          <Check className="w-4 h-4" /> Accept this proposal
        </button>
        <button type="button" onClick={() => setMode('changes')} className="px-6 py-3 rounded-md text-sm font-semibold border border-white/40 hover:bg-white/10 inline-flex items-center gap-2 cursor-pointer">
          <MessageSquare className="w-4 h-4" /> {changesSent ? 'Request more changes' : 'Request changes'}
        </button>
      </div>
    </div>
  );
}
