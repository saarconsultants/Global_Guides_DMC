'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { signupAgencyAction } from '@/app/actions/auth';
import { Sparkles } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [agencyName, setAgencyName] = useState('');
  const [contact, setContact] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const r = await signupAgencyAction({ agencyName, contact, name, email, password });
    if (r.ok) start(() => router.push('/dashboard'));
    else setError(r.error);
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-canvas">
      <aside className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-crimson-500 via-crimson-700 to-crimson-900 text-white items-center justify-center p-12">
        <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-amber-500/25 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-amber-300/15 blur-3xl" />
        <div className="relative max-w-md">
          <img src="/brand/ggdmc-logo-white.svg" alt="Global Guides DMC" className="h-12 w-auto mb-6" />
          <p className="text-xs uppercase tracking-widest text-amber-300 font-bold inline-flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Onboard your agency</p>
          <h1 className="mt-3 font-display text-4xl font-semibold leading-tight">Build your first proposal in 30 minutes.</h1>
          <ul className="mt-6 space-y-2 text-sm text-white/85">
            <li className="flex items-start gap-2"><span className="text-amber-300 font-bold mt-0.5">→</span> Multi-city itinerary builder with AI suggestions</li>
            <li className="flex items-start gap-2"><span className="text-amber-300 font-bold mt-0.5">→</span> Brand the customer proposal with your logo &amp; colours</li>
            <li className="flex items-start gap-2"><span className="text-amber-300 font-bold mt-0.5">→</span> Real-time price summary, refundability flags, day-by-day plan</li>
            <li className="flex items-start gap-2"><span className="text-amber-300 font-bold mt-0.5">→</span> One-click convert lead → booking</li>
          </ul>
        </div>
      </aside>
      <main className="flex items-center justify-center p-6 lg:p-12">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8">
            <h2 className="font-display text-2xl font-semibold text-navy-900">Create your agency</h2>
            <p className="text-sm text-[rgb(var(--text-secondary))] mt-1">You'll be the agency owner. Add team members later.</p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div><Label required>Agency name</Label><Input value={agencyName} onChange={(e) => setAgencyName(e.target.value)} required placeholder="e.g. Wandermark Travels Pvt Ltd" /></div>
              <div><Label>Agency phone</Label><Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="optional" /></div>
              <hr className="border-border-subtle" />
              <div><Label required>Your name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
              <div><Label required>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
              <div><Label required>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} placeholder="min 8 characters" /></div>
              {error && <div className="rounded-md bg-danger-100 text-danger-500 px-3 py-2 text-sm">{error}</div>}
              <Button type="submit" disabled={pending} className="w-full">{pending ? 'Creating…' : 'Create agency &amp; sign in'}</Button>
            </form>
            <p className="mt-6 text-sm text-[rgb(var(--text-secondary))] text-center">
              Already onboarded? <Link href="/login" className="text-crimson-700 hover:underline font-medium">Sign in</Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
