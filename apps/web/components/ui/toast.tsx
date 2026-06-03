'use client';
// Lightweight toast — no deps. Triggered via `toast.success(...)`, `toast.error(...)`, etc.
// Mount <Toaster /> once at the app root.

import { useEffect, useState, useSyncExternalStore } from 'react';
import { Check, X, AlertTriangle, Info, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastVariant = 'success' | 'error' | 'info' | 'warning' | 'loading';
interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  duration: number;        // ms
  action?: { label: string; onClick: () => void };
}

const listeners = new Set<() => void>();
let toasts: Toast[] = [];
let counter = 0;

function emit() { for (const l of listeners) l(); }

export const toast = {
  show(args: Omit<Toast, 'id' | 'duration'> & { duration?: number }): string {
    const id = `t${++counter}`;
    const t: Toast = { duration: args.duration ?? 4000, ...args, id };
    toasts = [...toasts, t];
    emit();
    if (t.duration > 0 && t.variant !== 'loading') {
      setTimeout(() => toast.dismiss(id), t.duration);
    }
    return id;
  },
  dismiss(id: string) {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  },
  success(title: string, description?: string) { return toast.show({ variant: 'success', title, description }); },
  error  (title: string, description?: string) { return toast.show({ variant: 'error',   title, description }); },
  info   (title: string, description?: string) { return toast.show({ variant: 'info',    title, description }); },
  warning(title: string, description?: string) { return toast.show({ variant: 'warning', title, description }); },
  loading(title: string, description?: string) { return toast.show({ variant: 'loading', title, description, duration: 0 }); },
  promise<T>(p: Promise<T>, opts: { loading: string; success: (r: T) => string; error: (e: any) => string }): Promise<T> {
    const id = toast.loading(opts.loading);
    return p.then((r) => { toast.dismiss(id); toast.success(opts.success(r)); return r; })
            .catch((e) => { toast.dismiss(id); toast.error(opts.error(e)); throw e; });
  },
};

function subscribe(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; }
function getSnap() { return toasts; }

const palette: Record<ToastVariant, { wrap: string; icon: React.ReactNode }> = {
  success: { wrap: 'bg-surface border-success-500/25 border-l-4 border-l-success-500 text-navy-900',  icon: <Check className="w-4 h-4 text-success-500 flex-shrink-0" /> },
  error:   { wrap: 'bg-surface border-danger-500/30 border-l-4 border-l-danger-500 text-navy-900',    icon: <AlertTriangle className="w-4 h-4 text-danger-500 flex-shrink-0" /> },
  info:    { wrap: 'bg-surface border-action-500/25 border-l-4 border-l-action-500 text-navy-900',    icon: <Info className="w-4 h-4 text-action-500 flex-shrink-0" /> },
  warning: { wrap: 'bg-surface border-warning-500/30 border-l-4 border-l-warning-500 text-navy-900',  icon: <AlertTriangle className="w-4 h-4 text-warning-500 flex-shrink-0" /> },
  loading: { wrap: 'bg-surface border-action-500/25 border-l-4 border-l-action-500 text-navy-900',    icon: <Loader2 className="w-4 h-4 text-action-500 animate-spin flex-shrink-0" /> },
};

export function Toaster() {
  const items = useSyncExternalStore(subscribe, getSnap, getSnap);
  return (
    <div aria-live="polite" className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] sm:w-96 pointer-events-none">
      {items.map((t) => (
        <div key={t.id}
          role={t.variant === 'error' ? 'alert' : 'status'}
          className={cn(
            'pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg backdrop-blur-md',
            'animate-in slide-in-from-top-2 fade-in duration-200',
            palette[t.variant].wrap,
          )}
        >
          {palette[t.variant].icon}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight">{t.title}</p>
            {t.description && <p className="text-xs text-[rgb(var(--text-secondary))] mt-0.5 leading-snug">{t.description}</p>}
            {t.action && <button onClick={t.action.onClick} className="mt-1.5 text-xs font-semibold text-action-500 hover:underline">{t.action.label}</button>}
          </div>
          <button onClick={() => toast.dismiss(t.id)} aria-label="Dismiss" className="text-[rgb(var(--text-tertiary))] hover:text-navy-900 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
