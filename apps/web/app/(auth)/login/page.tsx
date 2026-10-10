'use client';
import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { loginAction } from '@/app/actions/auth';
import { Dialog } from '@/components/ui/dialog';
import { Eye, EyeOff, Mail, MessageCircle, Phone } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [forgotOpen, setForgotOpen] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const r = await loginAction({ email, password });
    if (r.ok) start(() => router.push((params.get('next') ?? r.redirectTo) as any));
    else setError(r.error);
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-canvas">
      {/* Brand panel */}
      <aside className="hidden lg:flex relative overflow-hidden bg-ink text-white items-end p-12">
        <img src="/promos/login.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,12,18,0.15)_0%,rgba(10,12,18,0.35)_45%,rgba(10,12,18,0.9)_100%)]" />
        <img src="/brand/ggdmc-logo-white.svg" alt="Global Guides DMC" className="absolute top-10 left-12 h-11 w-auto" />
        <div className="relative max-w-lg">
          <h1 className="text-[40px] leading-[1.02] font-extrabold tracking-[-0.02em] [text-wrap:balance]">Quote, send and book outbound trips under your own brand.</h1>
          <p className="mt-4 text-white/80 leading-relaxed text-[15px]">Live fares and wholesale rooms, an AI trip architect grounded in real inventory, and proposals your customers accept in one tap.</p>
          <div className="mt-6 grid grid-cols-3 gap-3 max-w-md">
            <div className="rounded-md bg-white/10 border border-white/15 backdrop-blur px-3 py-2.5"><div className="label text-amber-500">Quote</div><div className="text-[13px] font-bold mt-0.5">under 10 min</div></div>
            <div className="rounded-md bg-white/10 border border-white/15 backdrop-blur px-3 py-2.5"><div className="label text-amber-500">Share</div><div className="text-[13px] font-bold mt-0.5">WhatsApp link</div></div>
            <div className="rounded-md bg-white/10 border border-white/15 backdrop-blur px-3 py-2.5"><div className="label text-amber-500">Track</div><div className="text-[13px] font-bold mt-0.5">every open</div></div>
          </div>
        </div>
      </aside>

      <main className="flex items-center justify-center p-6 lg:p-12">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8">
            <Link href="/dashboard" className="lg:hidden inline-block mb-6"><img src="/brand/ggdmc-logo.svg" alt="Global Guides DMC" className="h-10 w-auto" /></Link>
            <h2 className="text-[26px] font-extrabold tracking-[-0.02em] text-ink">Welcome back</h2>
            <p className="text-sm text-[rgb(var(--text-secondary))] mt-1">Sign in to your agency workspace.</p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <Label required>Email</Label>
                <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@agency.com" />
              </div>
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
              {error && <div role="alert" className="rounded-md bg-danger-100 text-danger-500 px-3 py-2 text-sm animate-in slide-in-from-top-1 fade-in duration-200">{error}</div>}
              <Button type="submit" disabled={pending} size="lg" className="w-full gap-2">
                {pending ? <><Spinner size="sm" className="text-white" />Signing in…</> : 'Sign in'}
              </Button>
            </form>
            <p className="mt-6 text-sm text-[rgb(var(--text-secondary))] text-center">
              New to Global Guides? <Link href="/signup" className="text-crimson-700 hover:underline font-medium">Create your agency</Link>
            </p>
          </CardContent>
        </Card>
      </main>

      <Dialog open={forgotOpen} onClose={() => setForgotOpen(false)} title="Forgot your password?" size="sm">
        <div className="space-y-4 text-sm text-ink">
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
    </div>
  );
}
