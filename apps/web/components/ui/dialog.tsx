'use client';
import { useEffect, useId, useRef } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  glass?: boolean;
}

export function Dialog({ open, onClose, title, children, size = 'md', glass }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  // Close on backdrop click — but NOT when the click is on a scrollbar.
  // Native <dialog> fires events where e.target === the dialog element for
  // both backdrop clicks AND scrollbar clicks. We disambiguate by checking
  // the click coordinates are actually outside the dialog's content box.
  function onClickBackdrop(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target !== ref.current) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const inside =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;
    if (!inside) onClose();
  }

  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-5xl' } as const;

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={onClickBackdrop}
      aria-labelledby={title ? titleId : undefined}
      aria-modal="true"
      className={cn(
        'p-0 rounded-xl shadow-xl border-0 w-full max-h-[90vh] overflow-y-auto',
        'backdrop:bg-navy-900/60 backdrop:backdrop-blur-sm',
        sizes[size],
        glass ? 'glass' : 'bg-surface',
      )}
    >
      <div className="relative">
        <header className="sticky top-0 z-10 flex items-center justify-between px-6 pt-5 pb-3 bg-inherit border-b border-border-subtle/0">
          {title ? <h2 id={titleId} className="text-lg font-semibold text-navy-900 tracking-tight">{title}</h2> : <span />}
          <button onClick={onClose} className="ml-auto -mr-2 h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-navy-50 transition-colors cursor-pointer" aria-label="Close dialog">
            <X className="w-4 h-4 text-navy-700" />
          </button>
        </header>
        <div className="px-6 pb-6">{children}</div>
      </div>
    </dialog>
  );
}
