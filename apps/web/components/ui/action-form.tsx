'use client';
// Wrapper for server-action forms that would otherwise save silently.
// Adds an optional confirm step, a pending state (all fields disabled while the
// action runs), and success/error toasts. Children remain server-rendered.
import { useRef, useTransition } from 'react';
import { toast } from '@/components/ui/toast';

interface Props {
  action: (formData: FormData) => Promise<unknown>;
  /** Toast title shown after the action resolves without throwing. */
  success?: string;
  /** If set, window.confirm() must be accepted before the action runs. */
  confirm?: string;
  resetOnSuccess?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function ActionForm({ action, success, confirm: confirmMsg, resetOnSuccess, className, children }: Props) {
  const [pending, start] = useTransition();
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        if (confirmMsg && !window.confirm(confirmMsg)) return;
        const fd = new FormData(e.currentTarget);
        start(async () => {
          try {
            await action(fd);
            if (success) toast.success(success);
            if (resetOnSuccess) ref.current?.reset();
          } catch (err: any) {
            // redirect() inside a server action throws a control-flow error — let it pass.
            if (typeof err?.digest === 'string' && err.digest.startsWith('NEXT_REDIRECT')) throw err;
            toast.error('Something went wrong', err?.message ?? 'Please try again.');
          }
        });
      }}
    >
      <fieldset disabled={pending} className="contents">{children}</fieldset>
    </form>
  );
}
