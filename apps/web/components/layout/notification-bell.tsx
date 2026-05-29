'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Bell, Check, Sparkles } from 'lucide-react';
import { markAllReadAction } from '@/app/actions/notifications';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface NotifItem {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

interface Props {
  initialUnread: number;
  initialItems: NotifItem[];
}

const kindEmoji: Record<string, string> = {
  PROPOSAL_SENT: '📤',
  PROPOSAL_VIEWED: '👀',
  PROPOSAL_ACCEPTED: '🎉',
  PROPOSAL_DECLINED: '↩️',
  LEAD_NEW: '✨',
  LEAD_FOLLOWUP: '⏰',
  BOOKING_CONFIRMED: '✅',
  TEAM_JOINED: '👥',
};

export function NotificationBell({ initialUnread, initialItems }: Props) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState(initialItems);
  const [pending, start] = useTransition();
  const wrapRef = useRef<HTMLDivElement>(null);

  // close on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function openAndMarkRead() {
    setOpen((o) => !o);
    if (!open && unread > 0) {
      // Optimistic
      setUnread(0);
      setItems((cur) => cur.map((n) => n.readAt ? n : ({ ...n, readAt: new Date().toISOString() })));
      start(() => markAllReadAction());
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={openAndMarkRead}
        className="inline-flex items-center justify-center w-9 h-9 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer relative"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span aria-label={`${unread} unread`} className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-crimson-900 text-[10px] font-bold border-2 border-crimson-900">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[360px] max-w-[calc(100vw-2rem)] z-50 bg-surface text-[rgb(var(--text-primary))] rounded-lg shadow-xl border border-border-subtle overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          <header className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
            <p className="font-semibold text-sm">Notifications</p>
            {items.length > 0 && unread === 0 && <span className="text-xs text-success-500 inline-flex items-center gap-1"><Check className="w-3 h-3" />All caught up</span>}
          </header>

          <div className="max-h-[420px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-crimson-50 text-crimson-700 inline-flex items-center justify-center mb-3"><Sparkles className="w-5 h-5" /></div>
                <p className="text-sm font-medium text-navy-900">Nothing yet</p>
                <p className="text-xs text-[rgb(var(--text-secondary))] mt-1">When a customer opens a proposal or a lead changes state, you'll see it here.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border-subtle">
                {items.map((n) => {
                  const inner = (
                    <div className={cn('px-4 py-3 flex gap-3 hover:bg-surface-2 transition-colors', !n.readAt && 'bg-amber-50/40')}>
                      <span className="text-xl flex-shrink-0 leading-none mt-0.5" aria-hidden="true">{kindEmoji[n.kind] ?? '🔔'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-navy-900 leading-snug">{n.title}</p>
                        {n.body && <p className="text-xs text-[rgb(var(--text-secondary))] mt-0.5 leading-snug line-clamp-2">{n.body}</p>}
                        <p className="text-[10px] text-[rgb(var(--text-tertiary))] mt-1">{new Date(n.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      {!n.readAt && <span className="w-2 h-2 rounded-full bg-amber-500 mt-2 flex-shrink-0" aria-label="Unread" />}
                    </div>
                  );
                  return n.href ? (
                    <li key={n.id}><Link href={n.href as any} onClick={() => setOpen(false)} className="block">{inner}</Link></li>
                  ) : (
                    <li key={n.id}>{inner}</li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
