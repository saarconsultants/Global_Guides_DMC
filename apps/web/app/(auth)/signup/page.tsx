'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/auth-shell';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { signupAgencyAction } from '@/app/actions/auth';
import { Route, Palette, ReceiptText, CircleCheck } from 'lucide-react';

const PERKS = [
  { icon: Route, text: 'Multi-city trip builder with AI suggestions' },
  { icon: Palette, text: 'Proposals branded with your logo and colours' },
  { icon: ReceiptText, text: 'Live price summary, refund rules and a day-by-day plan' },
  { icon: CircleCheck, text: 'Turn an accepted proposal into a booking in one click' },
];

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
    <AuthShell
      panelTitle="Build your first proposal in 30 minutes."
      panelBody="Set up your agency once, then quote, share and book trips under your own brand."
      panelExtra={
        <ul className="space-y-2.5 text-sm text-white/85">
          {PERKS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-2.5"><Icon aria-hidden className="w-4 h-4 mt-0.5 shrink-0 text-white/70" />{text}</li>
          ))}
        </ul>
      }
      title="Create your agency"
      subtitle="You'll be the agency owner. You can add team members later."
      footer={<>Already have an account? <Link href="/login" className="text-crimson-700 hover:underline font-medium">Sign in</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        <div><Label required>Agency name</Label><Input value={agencyName} onChange={(e) => setAgencyName(e.target.value)} required autoComplete="organization" placeholder="e.g. Wandermark Travels Pvt Ltd" /></div>
        <div>
          <Label>Agency phone <span className="font-normal text-[rgb(var(--text-tertiary))]">(optional)</span></Label>
          <Input type="tel" value={contact} onChange={(e) => setContact(e.target.value)} autoComplete="tel" placeholder="+91 98765 43210" />
        </div>
        <hr className="border-border-subtle" />
        <div><Label required>Your name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" /></div>
        <div><Label required>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@agency.com" /></div>
        <div><Label required>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" placeholder="At least 8 characters" /></div>
        {error && <div role="alert" className="rounded-md bg-danger-100 text-danger-500 px-3 py-2 text-sm">{error}</div>}
        <Button type="submit" disabled={pending} size="lg" className="w-full gap-2">
          {pending ? <><Spinner size="sm" />Creating your agency…</> : 'Create agency & sign in'}
        </Button>
      </form>
    </AuthShell>
  );
}
