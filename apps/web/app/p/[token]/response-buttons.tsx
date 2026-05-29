'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, MessageSquare, Loader2 } from 'lucide-react';

export function ResponseButtons({ token, accent = '#C9A24A' }: { token: string; accent?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<null | 'accept' | 'decline'>(null);
  const [feedback, setFeedback] = useState('');

  async function submit(action: 'ACCEPT' | 'DECLINE') {
    const res = await fetch(`/p/${token}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, feedback }),
    });
    if (res.ok) startTransition(() => router.refresh());
  }

  if (confirming === 'accept') {
    return (
      <div className="mt-6 rounded-md bg-white/10 backdrop-blur-md border border-white/20 p-4 text-sm space-y-3">
        <p>By accepting, you confirm you're happy with the plan and price. Your travel agent will reach out to collect payment details and confirm bookings.</p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setConfirming(null)} className="px-4 py-2 rounded-md text-sm text-navy-100 hover:text-white">Cancel</button>
          <button disabled={pending} onClick={() => submit('ACCEPT')} className="px-5 py-2 rounded-md text-sm font-semibold bg-success-500 hover:bg-success-500/90 text-white inline-flex items-center gap-1.5">
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Confirm acceptance
          </button>
        </div>
      </div>
    );
  }

  if (confirming === 'decline') {
    return (
      <div className="mt-6 rounded-md bg-white/10 backdrop-blur-md border border-white/20 p-4 text-sm space-y-3">
        <p>Sorry to hear it doesn't work. Tell us what to change and we'll send a revised proposal.</p>
        <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="e.g. Different hotel in Paris, fewer activities, July dates instead of June..." className="w-full h-24 rounded-md p-3 text-sm bg-white/10 border border-white/20 text-white placeholder:text-navy-200 focus:outline-none focus:ring-2 focus:ring-crimson-500" />
        <div className="flex gap-2 justify-end">
          <button onClick={() => setConfirming(null)} className="px-4 py-2 rounded-md text-sm text-navy-100 hover:text-white">Cancel</button>
          <button disabled={pending} onClick={() => submit('DECLINE')} className="px-5 py-2 rounded-md text-sm font-semibold bg-danger-500 hover:bg-danger-500/90 text-white inline-flex items-center gap-1.5">
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />} Send feedback
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <button onClick={() => setConfirming('accept')} style={{ background: accent, color: '#081428' }} className="px-6 py-3 rounded-md text-sm font-semibold hover:opacity-90 inline-flex items-center gap-2 cursor-pointer">
        <Check className="w-4 h-4" /> Accept this proposal
      </button>
      <button onClick={() => setConfirming('decline')} className="px-6 py-3 rounded-md text-sm font-semibold border border-white/40 hover:bg-white/10 inline-flex items-center gap-2 cursor-pointer">
        <MessageSquare className="w-4 h-4" /> Request changes
      </button>
    </div>
  );
}
