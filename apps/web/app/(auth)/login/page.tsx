'use client';
import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/auth-shell';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { loginAction, requestLoginCodeAction, verifyLoginCodeAction } from '@/app/actions/auth';
import { Dialog } from '@/components/ui/dialog';
import { Eye, EyeOff, Mail, MessageCircle, Phone } from 'lucide-react';

/** Only go back to a page on this site. */
const safeNext = (next: string | null) => (next?.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : null);

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [forgotOpen, setForgotOpen] = useState(false);
  // Sign in with a password, or with a 6-digit code sent by email.
  const [mode, setMode] = useState<'password' | 'code'>('password');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(false);

  const go = (redirectTo: string) => start(() => router.push((safeNext(params.get('next')) ?? redirectTo) as any));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === 'code' && !codeSent) return sendCode();
    const r = mode === 'password' ? await loginAction({ email, password }) : await verifyLoginCodeAction({ email, code });
    if (r.ok) go(r.redirectTo);
    else setError(r.error);
  }

  async function sendCode() {
    setError(null);
    setSending(true);
    const r = await requestLoginCodeAction({ email }).catch(() => ({ ok: false as const, error: 'The code could not be sent. Try again.' }));
    setSending(false);
    if (r.ok) { setCodeSent(true); setCode(''); } else setError(r.error);
  }

  function switchMode(m: 'password' | 'code') { setMode(m); setError(null); setCodeSent(false); setCode(''); }

  return (
    <>
    <AuthShell
      panelTitle="Quote, send and book outbound trips under your own brand."
      panelBody="Live fares and wholesale rooms, an AI trip planner grounded in real inventory, and proposals your customers accept in one tap."
      panelExtra={
        <div className="grid grid-cols-3 gap-3 max-w-md">
          <div className="rounded-md bg-white/10 border border-white/15 px-3 py-2.5"><div className="label text-white/70">Quote</div><div className="text-[13px] font-bold mt-0.5">under 10 min</div></div>
          <div className="rounded-md bg-white/10 border border-white/15 px-3 py-2.5"><div className="label text-white/70">Share</div><div className="text-[13px] font-bold mt-0.5">WhatsApp link</div></div>
          <div className="rounded-md bg-white/10 border border-white/15 px-3 py-2.5"><div className="label text-white/70">Track</div><div className="text-[13px] font-bold mt-0.5">every open</div></div>
        </div>
      }
      title="Welcome back"
      subtitle="Sign in to your agency workspace."
      footer={<>New to Global Guides? <Link href="/signup" className="text-crimson-700 hover:underline font-medium">Create your agency</Link></>}
    >
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label required>Email</Label>
                <Input type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); if (codeSent) setCodeSent(false); }} required placeholder="you@agency.com" />
              </div>
              {mode === 'code' ? (
                codeSent && (
                  <div>
                    <p role="status" className="mb-3 text-[13px] text-[rgb(var(--text-secondary))]">If <span className="font-semibold text-ink">{email}</span> has an account, we&apos;ve emailed it a 6-digit code. It works for 10 minutes.</p>
                    <div className="flex items-center justify-between">
                      <Label required>Code</Label>
                      <button type="button" onClick={sendCode} disabled={sending} className="text-xs font-bold text-crimson-700 hover:underline mb-1.5 disabled:opacity-50">{sending ? 'Sending…' : 'Send a new code'}</button>
                    </div>
                    <Input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} required autoFocus placeholder="6-digit code" className="font-mono tracking-[0.3em] text-lg" />
                  </div>
                )
              ) : (
              <div>
                <div className="flex items-center justify-between">
                  <Label required>Password</Label>
                  <button type="button" onClick={() => setForgotOpen(true)} className="text-xs font-bold text-crimson-700 hover:underline mb-1.5">Forgot?</button>
                </div>
                <div className="relative">
                  <Input type={showPwd ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required className="pr-10" />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[rgb(var(--text-tertiary))] hover:text-navy-700 cursor-pointer" aria-label={showPwd ? 'Hide password' : 'Show password'}>
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              )}
              {error && <div role="alert" className="rounded-md bg-danger-100 text-danger-500 px-3 py-2 text-sm animate-in slide-in-from-top-1 fade-in duration-200">{error}</div>}
              <Button type="submit" disabled={pending || sending} size="lg" className="w-full gap-2">
                {pending ? <><Spinner size="sm" className="text-white" />Signing in…</> : sending ? <><Spinner size="sm" className="text-white" />Sending code…</> : mode === 'code' && !codeSent ? 'Email me a code' : 'Sign in'}
              </Button>
              <button type="button" onClick={() => switchMode(mode === 'password' ? 'code' : 'password')} className="w-full min-h-10 text-sm font-semibold text-crimson-700 hover:underline">
                {mode === 'password' ? 'Sign in with an email code instead' : 'Use my password instead'}
              </button>
            </form>
    </AuthShell>

      <Dialog open={forgotOpen} onClose={() => setForgotOpen(false)} title="Forgot your password?" size="sm">
        <div className="space-y-4 text-sm text-ink">
          <div>
            <p className="font-bold">Sign in with an email code</p>
            <p className="mt-1 text-[rgb(var(--text-secondary))]">We email you a 6-digit code instead. Once you&apos;re in, set a new password in Settings.</p>
            <Button size="sm" variant="secondary" className="mt-2" onClick={() => { setForgotOpen(false); switchMode('code'); }}>Email me a code</Button>
          </div>
          <div>
            <p className="font-bold">Agents and counsellors</p>
            <p className="mt-1 text-[rgb(var(--text-secondary))]">Ask your agency owner to set a new password for you. They can do it in Settings › Team, using “Reset password” next to your name.</p>
          </div>
          <div>
            <p className="font-bold">Agency owners</p>
            <p className="mt-1 text-[rgb(var(--text-secondary))]">Contact Global Guides support and we'll reset it for you after confirming it's you.</p>
            <div className="mt-2 flex flex-col gap-1.5">
              <a href="https://wa.me/918378073375?text=Hi%2C%20I%20need%20a%20password%20reset%20for%20my%20agency%20account." target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-semibold text-crimson-700 hover:underline"><MessageCircle className="w-4 h-4" />WhatsApp +91 83780 73375</a>
              <a href="tel:+918378073375" className="inline-flex items-center gap-2 font-semibold text-crimson-700 hover:underline"><Phone className="w-4 h-4" />Call +91 83780 73375</a>
              <a href="mailto:travel@globalguidesdmc.com?subject=Password%20reset" className="inline-flex items-center gap-2 font-semibold text-crimson-700 hover:underline"><Mail className="w-4 h-4" />travel@globalguidesdmc.com</a>
            </div>
            <p className="mt-2 text-xs text-[rgb(var(--text-tertiary))]">Mon–Sat · 9 AM – 7 PM IST</p>
          </div>
          <div className="flex justify-end pt-2 border-t border-border-subtle">
            <Button variant="ghost" onClick={() => setForgotOpen(false)}>Close</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
