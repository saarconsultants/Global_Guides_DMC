'use client';
import { useState, useTransition } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { resetMemberPasswordAction } from '@/app/actions/team';

/** Owner-only: set a new password for a teammate, then share it with them yourself. */
export function ResetPasswordButton({ userId, email }: { userId: string; email: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function close() {
    setOpen(false);
    setError(null);
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-crimson-700 hover:underline text-xs font-medium mr-3">Reset password</button>
      <Dialog open={open} onClose={close} title="Reset password" size="sm">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const fd = new FormData(e.currentTarget);
            start(async () => {
              try {
                const r = await resetMemberPasswordAction(userId, fd);
                if (!r.ok) { setError(r.error ?? 'Something went wrong. Please try again.'); return; }
                toast.success('Password changed', `Share the new password with ${email} privately.`);
                close();
              } catch {
                setError('Something went wrong. Please try again.');
              }
            });
          }}
        >
          <p className="text-sm text-ink">Set a new password for <strong>{email}</strong>. Their old password stops working straight away. Share the new one with them privately, for example on a call.</p>
          <div>
            <Label htmlFor={`pw-${userId}`} required>New password</Label>
            <Input id={`pw-${userId}`} name="password" type="password" autoComplete="new-password" minLength={8} required />
          </div>
          <div>
            <Label htmlFor={`pw2-${userId}`} required>Type it again</Label>
            <Input id={`pw2-${userId}`} name="confirm" type="password" autoComplete="new-password" minLength={8} required />
          </div>
          {error && <p role="alert" className="rounded-md bg-danger-100 text-danger-500 px-3 py-2 text-sm">{error}</p>}
          <div className="flex justify-end gap-2 pt-2 border-t border-border-subtle">
            <Button type="button" variant="ghost" onClick={close} disabled={pending}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Set new password'}</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
