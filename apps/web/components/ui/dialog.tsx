'use client';
import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
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

// Portal-based modal. We deliberately do NOT use the native <dialog> element:
// its top-layer + close-event behavior interacts badly with React re-renders
// (modals were closing themselves a beat after async content loaded). A plain
// portal overlay is fully under React's control and has no hidden side-effects.
export function Dialog({ open, onClose, title, children, size = 'md', glass }: DialogProps) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);

  // Portals require a DOM target — only available after mount (SSR-safe).
  useEffect(() => { setMounted(true); }, []);

  // ESC to close + body scroll lock while open.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-5xl' } as const;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-navy-900/60 backdrop-blur-sm p-4 sm:p-6"
      // Backdrop click closes — only when the click target is the backdrop itself,
      // never a child. (No native-dialog scrollbar ambiguity here.)
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
    >
      <div
        className={cn(
          'relative w-full my-auto rounded-xl shadow-xl max-h-[90vh] overflow-y-auto',
          sizes[size],
          glass ? 'glass' : 'bg-surface',
        )}
        // Stop propagation so clicks inside the panel never reach the backdrop handler.
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between px-6 pt-5 pb-3 bg-inherit">
          {title ? <h2 id={titleId} className="text-lg font-semibold text-navy-900 tracking-tight">{title}</h2> : <span />}
          <button
            onClick={onClose}
            className="ml-auto -mr-2 h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-navy-50 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4 text-navy-700" />
          </button>
        </header>
        <div className="px-6 pb-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
