'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, ChevronDown, Plus, Sparkles, Users, Megaphone, Wallet, Settings, ShieldCheck, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificationBell } from './notification-bell';
import { NavAccount, type Actor } from './nav-account';

type NavLink = { href: string; label: string; match?: string[] };
type NavGroup = { label: string; items: Array<NavLink & { desc: string; icon: React.ComponentType<{ className?: string }> }> };
type NavItem = NavLink | NavGroup;

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Home' },
  { href: '/flights', label: 'Flights' },
  { href: '/hotels', label: 'Hotels' },
  { href: '/activities', label: 'Activities' },
  {
    label: 'Packages',
    items: [
      { href: '/suggested', label: 'Suggested itineraries', desc: 'Ready-made trips to clone and sell', icon: Sparkles },
      { href: '/holidays', label: 'Holidays', desc: 'FIT, group departures and ad-hoc quotes', icon: Users },
      { href: '/marketing', label: 'Marketing flyers', desc: 'Branded PDFs and your lead widget', icon: Megaphone },
    ],
  },
  { href: '/proposals', label: 'Proposals', match: ['/itinerary'] },
  { href: '/leads', label: 'Leads' },
  { href: '/bookings', label: 'Bookings' },
  { href: '/statement', label: 'Money' },
];

interface Props {
  walletLabel?: string;
  actor: Actor | null;
  notif?: { unread: number; items: Array<{ id: string; kind: string; title: string; body: string | null; href: string | null; readAt: string | null; createdAt: string }> };
}

function isActive(pathname: string, href: string, match?: string[]) {
  if (pathname === href || pathname.startsWith(href + '/')) return true;
  return (match ?? []).some((m) => pathname.startsWith(m));
}

export function TopNav({ walletLabel = '₹ 0', actor, notif }: Props) {
  const pathname = usePathname() ?? '';
  const [mobileOpen, setMobileOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState<string | null>(null);
  const groupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (groupRef.current && !groupRef.current.contains(e.target as Node)) setGroupOpen(null); }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  useEffect(() => { setMobileOpen(false); setGroupOpen(null); }, [pathname]);

  if (!pathname || pathname.startsWith('/p/') || pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/admin')) return null;
  if (!actor) return null;

  const linkCls = (active: boolean) => cn(
    'relative inline-flex items-center gap-1 h-16 px-3 text-[14px] font-semibold transition-colors',
    active ? 'text-crimson-700' : 'text-navy-700 hover:text-ink',
    active && 'after:absolute after:left-3 after:right-3 after:bottom-0 after:h-[3px] after:rounded-t-full after:bg-crimson-700',
  );

  return (
    <header className="sticky top-0 z-30 w-full bg-surface border-b border-border-subtle">
      <div className="mx-auto max-w-[1400px] px-4 lg:px-6 h-16 flex items-center gap-2 lg:gap-4">
        <Link href="/dashboard" className="flex items-center shrink-0 mr-1" aria-label="Global Guides — home">
          <img src="/brand/ggdmc-logo.svg" alt="Global Guides DMC" className="h-9 w-auto" />
        </Link>

        <nav className="hidden lg:flex items-center" aria-label="Primary">
          {NAV.map((n) => {
            if ('items' in n) {
              const active = n.items.some((i) => isActive(pathname, i.href));
              const open = groupOpen === n.label;
              return (
                <div key={n.label} ref={groupRef} className="relative">
                  <button type="button" onClick={() => setGroupOpen(open ? null : n.label)} aria-expanded={open} className={linkCls(active)}>
                    {n.label}<ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
                  </button>
                  {open && (
                    <div className="absolute left-0 top-full mt-1 w-[300px] bg-surface rounded-lg shadow-xl border border-border-subtle z-50 overflow-hidden p-1.5">
                      {n.items.map((i) => {
                        const Icon = i.icon;
                        return (
                          <Link key={i.href} href={i.href as any} className={cn('flex items-start gap-3 px-3 py-2.5 rounded-md hover:bg-surface-2 transition-colors', isActive(pathname, i.href) && 'bg-crimson-50')}>
                            <span className="mt-0.5 w-8 h-8 rounded-md bg-navy-50 text-crimson-700 inline-flex items-center justify-center shrink-0"><Icon className="w-4 h-4" /></span>
                            <span className="min-w-0"><span className="block text-sm font-bold text-ink">{i.label}</span><span className="block text-xs text-[rgb(var(--text-secondary))] mt-0.5">{i.desc}</span></span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
            const active = isActive(pathname, n.href, n.match);
            return <Link key={n.href} href={n.href as any} aria-current={active ? 'page' : undefined} className={linkCls(active)}>{n.label}</Link>;
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 lg:gap-2.5">
          <Link href="/itinerary/new" className="hidden md:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-crimson-700 text-white text-[13px] font-bold hover:bg-crimson-900 transition-colors shadow-sm">
            <Plus className="w-4 h-4" />New trip
          </Link>
          {notif && <NotificationBell initialUnread={notif.unread} initialItems={notif.items} />}
          <div className="hidden lg:block"><NavAccount actor={actor} walletLabel={walletLabel} /></div>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden w-10 h-10 inline-flex items-center justify-center rounded-md text-navy-700 hover:bg-navy-50" aria-label={mobileOpen ? 'Close menu' : 'Open menu'} aria-expanded={mobileOpen}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-border-subtle bg-surface">
          <nav className="px-3 py-3 grid grid-cols-2 gap-1 text-sm" aria-label="Primary mobile">
            {NAV.flatMap((n) => ('items' in n ? n.items : [n])).map((n) => {
              const active = isActive(pathname, n.href, (n as NavLink).match);
              return (
                <Link key={n.href} href={n.href as any} aria-current={active ? 'page' : undefined} className={cn('px-3 py-2.5 rounded-md font-semibold', active ? 'bg-crimson-50 text-crimson-700' : 'text-navy-700 hover:bg-surface-2')}>{n.label}</Link>
              );
            })}
            <Link href="/itinerary/new" className="col-span-2 mt-1 inline-flex items-center justify-center gap-1.5 h-11 rounded-md bg-crimson-700 text-white font-bold"><Plus className="w-4 h-4" />New trip</Link>
          </nav>
          <div className="px-3 py-3 border-t border-border-subtle flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <Link href="/statement" className="inline-flex items-center gap-1.5 text-navy-700"><Wallet className="w-4 h-4" /> Wallet <span className="money">{walletLabel}</span></Link>
            <Link href="/settings" className="inline-flex items-center gap-1.5 text-navy-700"><Settings className="w-4 h-4" /> Settings</Link>
            {actor.role === 'SUPER_ADMIN' && <Link href="/admin" className="inline-flex items-center gap-1.5 text-crimson-700 font-semibold"><ShieldCheck className="w-4 h-4" /> Admin</Link>}
            <a href="/logout" className="inline-flex items-center gap-1.5 text-navy-700 ml-auto"><LogOut className="w-4 h-4" /> Sign out</a>
          </div>
        </div>
      )}
    </header>
  );
}
