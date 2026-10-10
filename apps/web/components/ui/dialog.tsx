'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Accessible name when there is no visible `title`. */
  ariaLabel?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  glass?: boolean;
}

const FOCUSABLE =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), iframe, summary, [contenteditable="true"], [tabindex]:not([tabindex="-1"])';

function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.getClientRects().length > 0 && !el.closest('[inert]'),
  );
}

// Portal-based modal. We deliberately do NOT use the native <dialog> element:
// its top-layer + close-event behavior interacts badly with React re-renders
// (modals were closing themselves a beat after async content loaded). A plain
// portal overlay is fully under React's control and has no hidden side-effects.
//
// Accessibility: the PANEL (not the backdrop) is the role="dialog" element,
// aria-modal and named by its title. Focus moves into it on open, Tab and
// Shift+Tab are trapped inside, Escape closes only this (topmost) dialog, and
// focus returns to whatever opened it on close.
export function Dialog({ open, onClose, title, ariaLabel, children, size = 'md', glass: _glass }: DialogProps) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Portals require a DOM target — only available after mount (SSR-safe).
  useEffect(() => { setMounted(true); }, []);

  // Body scroll lock while open.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, [open]);

  // Move focus into the panel on open; restore it to the trigger on close.
  useEffect(() => {
    if (!open || !mounted) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) {
      // Prefer the first control in the body (skip the header close button).
      const body = panel.querySelector<HTMLElement>('[data-dialog-body]');
      const first = (body && focusables(body)[0]) || panel;
      first.focus({ preventScroll: true });
    }
    return () => {
      if (trigger && trigger.isConnected && trigger !== document.body) trigger.focus({ preventScroll: true });
    };
  }, [open, mounted]);

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    // React synthetic events bubble through portals to ancestor dialogs, so
    // stop propagation: only the innermost (topmost) dialog reacts.
    if (e.key === 'Escape') {
      e.stopPropagation();
      e.preventDefault();
      onCloseRef.current();
      return;
    }
    if (e.key !== 'Tab') return;
    const panel = panelRef.current;
    if (!panel) return;
    e.stopPropagation();
    const items = focusables(panel);
    if (items.length === 0) { e.preventDefault(); panel.focus(); return; }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === panel || !panel.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !panel.contains(active))) {
      e.preventDefault();
      first.focus();
    }
  }

  if (!mounted || !open) return null;

  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-5xl' } as const;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-navy-900/60 backdrop-blur-sm p-4 sm:p-6"
      // Backdrop click closes — only when the click target is the backdrop itself,
      // never a child. (No native-dialog scrollbar ambiguity here.)
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : ariaLabel}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={cn(
          'relative w-full my-auto rounded-lg shadow-xl border border-border-subtle max-h-[90vh] overflow-y-auto bg-surface focus:outline-none',
          sizes[size],
        )}
        // Stop propagation so clicks inside the panel never reach the backdrop handler.
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between px-6 pt-5 pb-3 bg-inherit">
          {title ? <h2 id={titleId} className="text-[18px] font-extrabold text-ink tracking-[-0.01em]">{title}</h2> : <span />}
          <button
            type="button"
            onClick={onClose}
            className="ml-auto -mr-2 h-9 w-9 inline-flex items-center justify-center rounded-md hover:bg-navy-50 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4 text-navy-700" aria-hidden />
          </button>
        </header>
        <div className="px-6 pb-6" data-dialog-body>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
