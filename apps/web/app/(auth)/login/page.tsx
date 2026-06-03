'use client';
import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { loginAction } from '@/app/actions/auth';
import { Sparkles, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

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
      <aside className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-crimson-500 via-crimson-700 to-crimson-900 text-white items-center justify-center p-12">
        <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-amber-500/25 blur-3xl animate-[float_12s_ease-in-out_infinite]" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-amber-300/15 blur-3xl animate-[float_10s_ease-in-out_infinite_reverse]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-crimson-300/10 blur-3xl animate-[float_14s_ease-in-out_infinite]" />
        <style>{`@keyframes float { 0%,100% { transform: translate(0,0); } 50% { transform: translate(20px,-30px); } }`}</style>

        <div className="relative max-w-md">
          <img src="/brand/ggdmc-logo-white.svg" alt="Global Guides DMC" className="h-12 w-auto mb-6" />
          <p className="text-xs uppercase tracking-widest text-amber-300 font-bold inline-flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> The platform</p>
          <h1 className="mt-3 font-display text-4xl font-semibold leading-tight">The B2B travel OS for outbound agencies.</h1>
          <p className="mt-4 text-white/80 leading-relaxed">AI-assisted itinerary builder, live inventory, and white-label customer proposals — all in one workspace.</p>
          <ul className="mt-6 space-y-2 text-sm text-white/80">
            <li className="flex items-start gap-2"><span className="text-amber-300 font-bold mt-0.5">→</span> Build a quote in under 30 minutes</li>
            <li className="flex items-start gap-2"><span className="text-amber-300 font-bold mt-0.5">→</span> Share branded proposals via WhatsApp</li>
            <li className="flex items-start gap-2"><span className="text-amber-300 font-bold mt-0.5">→</span> Track every customer click and acceptance</li>
          </ul>
        </div>
      </aside>

      <main className="flex items-center justify-center p-6 lg:p-12">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8">
            <Link href="/dashboard" className="lg:hidden inline-block mb-6"><img src="/brand/ggdmc-logo.svg" alt="Global Guides DMC" className="h-10 w-auto" /></Link>
            <h2 className="font-display text-2xl font-semibold text-navy-900">Welcome back</h2>
            <p className="text-sm text-[rgb(var(--text-secondary))] mt-1">Sign in to your agency workspace.</p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <Label required>Email</Label>
                <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@agency.com" />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label required>Password</Label>
                  <button type="button" className="text-xs text-crimson-700 hover:underline">Forgot?</button>
                </div>
                <div className="relative">
                  <Input type={showPwd ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required className="pr-10" />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[rgb(var(--text-tertiary))] hover:text-navy-700 cursor-pointer" aria-label={showPwd ? 'Hide password' : 'Show password'}>
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {error && <div className="rounded-md bg-danger-100 text-danger-500 px-3 py-2 text-sm animate-in slide-in-from-top-1 fade-in duration-200">{error}</div>}
              <Button type="submit" disabled={pending} className="w-full gap-2">
                {pending ? <><Spinner size="sm" className="text-white" />Signing in…</> : 'Sign in'}
              </Button>
            </form>
            <p className="mt-6 text-sm text-[rgb(var(--text-secondary))] text-center">
              New to Global Guides? <Link href="/signup" className="text-crimson-700 hover:underline font-medium">Create your agency</Link>
            </p>
            <details className="mt-6 text-xs text-[rgb(var(--text-tertiary))] cursor-pointer group">
              <summary className="hover:text-[rgb(var(--text-secondary))] select-none">Dev test accounts ▾</summary>
              <div className="mt-2 space-y-1 font-mono bg-surface-2 rounded p-3">
                <p>admin@globalguides.com / admin123 — <span className="text-crimson-700">super-admin</span></p>
                <p>travel@globalguidesdmc.com / agent123 — <span className="text-crimson-700">your agency</span></p>
                <p>demo@wandermark.in / agent123 — <span className="text-crimson-700">demo agency</span></p>
              </div>
            </details>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
