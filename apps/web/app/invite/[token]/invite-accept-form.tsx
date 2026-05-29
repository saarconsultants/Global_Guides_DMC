'use client';
import { useState, useTransition } from 'react';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Eye, EyeOff } from 'lucide-react';
import { acceptInviteAction } from '@/app/actions/team';

export function InviteAcceptForm({ token, email, agencyName, role }: { token: string; email: string; agencyName: string; role: string }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set('name', name);
    fd.set('password', password);
    start(async () => {
      try { await acceptInviteAction(token, fd); }
      catch (err: any) { setError(err?.message ?? 'Failed to accept invite'); }
    });
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div className="rounded-md bg-surface-2 px-3 py-2 text-xs text-[rgb(var(--text-secondary))]">
        Joining <strong className="text-navy-900">{agencyName}</strong> as <strong className="text-navy-900">{role.toLowerCase()}</strong>
      </div>
      <div><Label>Email</Label><Input value={email} readOnly className="font-mono text-sm bg-surface-2" /></div>
      <div><Label required>Your name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Priya Sharma" /></div>
      <div>
        <Label required>Set a password</Label>
        <div className="relative">
          <Input type={showPwd ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="pr-10" placeholder="min 8 characters" />
          <button type="button" onClick={() => setShowPwd(!showPwd)} aria-label={showPwd ? 'Hide password' : 'Show password'} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[rgb(var(--text-tertiary))] hover:text-navy-700 cursor-pointer">
            {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      {error && <div className="rounded-md bg-danger-100 text-danger-500 px-3 py-2 text-sm">{error}</div>}
      <Button type="submit" disabled={pending} className="w-full gap-2">{pending ? <><Spinner size="sm" className="text-white" />Creating account…</> : 'Accept &amp; sign in'}</Button>
    </form>
  );
}
