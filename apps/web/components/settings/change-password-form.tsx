'use client';
import { useRef, useState, useTransition } from 'react';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { changeOwnPasswordAction } from '@/app/actions/auth';

export function ChangePasswordForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      ref={ref}
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        start(async () => {
          try {
            const r = await changeOwnPasswordAction(fd);
            if (!r.ok) { setError(r.error ?? 'Something went wrong. Please try again.'); return; }
            ref.current?.reset();
            toast.success('Password changed', 'Use your new password next time you sign in.');
          } catch {
            setError('Something went wrong. Please try again.');
          }
        });
      }}
    >
      <div>
        <Label htmlFor="pw-current" required>Current password</Label>
        <Input id="pw-current" name="current" type="password" autoComplete="current-password" required />
      </div>
      <div>
        <Label htmlFor="pw-new" required>New password</Label>
        <Input id="pw-new" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <div>
        <Label htmlFor="pw-confirm" required>Type it again</Label>
        <Input id="pw-confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      {error && <p role="alert" className="rounded-md bg-danger-100 text-danger-500 px-3 py-2 text-sm">{error}</p>}
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Change password'}</Button>
      </div>
    </form>
  );
}
