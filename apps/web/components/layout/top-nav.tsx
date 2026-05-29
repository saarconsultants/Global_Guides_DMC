'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Plane, Users, Hotel, Megaphone, ClipboardList, Settings, Receipt, Headphones, Pencil, Wallet, ChevronDown, LogOut, Sparkles, ShieldCheck, Menu, X, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificationBell } from './notification-bell';

const NAV_AGENCY = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/suggested', label: 'Suggested', icon: Sparkles },
  { href: '/flights', label: 'Flights', icon: Plane },
  { href: '/holidays', label: 'Holidays', icon: Users },
  { href: '/hotels', label: 'Hotels', icon: Hotel },
  { href: '/marketing', label: 'Marketing', icon: Megaphone },
  { href: '/leads', label: 'My Leads', icon: ClipboardList },
  { href: '/bookings', label: 'Bookings', icon: Briefcase },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/statement', label: 'Statement', icon: Receipt },
] as const;

interface Props {
  walletLabel?: string;
  actor: { name: string; role: string; agencyName: string; logoUrl: string | null } | null;
  notif?: { unread: number; items: Array<{ id: string; kind: string; title: string; body: string | null; href: string | null; readAt: string | null; createdAt: string }> };
}

export function TopNav({ walletLabel = '₹ 0', actor, notif }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  if (
    !pathname ||
    pathname.startsWith('/p/') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/admin')
  ) return null;
  if (!actor) return null;

  return (
    <header className="sticky top-0 z-30 w-full">
      <div className="bg-crimson-900 text-white">
        {/* Utility strip */}
        <div className="hidden lg:flex h-9 border-b border-white/10 px-6 items-center justify-end gap-5 text-xs">
          <span className="inline-flex items-center gap-1.5 cursor-pointer text-white/70 hover:text-white transition-colors"><Headphones className="w-3.5 h-3.5" /> Contact <ChevronDown className="w-3 h-3" /></span>
          <span className="inline-flex items-center gap-1.5 cursor-pointer text-white/70 hover:text-white transition-colors"><Pencil className="w-3.5 h-3.5" /> Write to us</span>
          <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-crimson-900 font-semibold cursor-pointer hover:bg-amber-300 transition-colors">Escalate</span>
          <Link href="/statement" className="inline-flex items-center gap-1.5 cursor-pointer text-white/70 hover:text-white transition-colors"><Wallet className="w-3.5 h-3.5" /> Recharge {walletLabel} <ChevronDown className="w-3 h-3" /></Link>
          {actor.role === 'SUPER_ADMIN' && (
            <Link href="/admin" className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white text-crimson-900 font-semibold cursor-pointer hover:bg-amber-300 transition-colors">
              <ShieldCheck className="w-3.5 h-3.5" /> Admin
            </Link>
          )}
          <span className="inline-flex items-center gap-2 cursor-pointer text-white/80 hover:text-white transition-colors">
            {actor.logoUrl ? <img src={actor.logoUrl} alt="" className="w-5 h-5 rounded-full object-cover bg-white" /> : <span className="w-5 h-5 rounded-full bg-white/15 inline-flex items-center justify-center text-[10px] font-bold">{(actor.name || '?')[0]}</span>}
            {actor.name} <ChevronDown className="w-3 h-3" />
          </span>
          <a href="/logout" className="inline-flex items-center gap-1 text-white/70 hover:text-white transition-colors" title="Sign out"><LogOut className="w-3.5 h-3.5" /></a>
        </div>

        {/* Main nav row */}
        <div className="h-16 px-4 lg:px-6 flex items-center gap-4 lg:gap-6">
          <Link href="/dashboard" className="flex items-center gap-3" aria-label="Global Guides — home">
            <img src="/brand/ggdmc-logo-white.svg" alt="Global Guides DMC" className="h-9 w-auto" />
            {actor.agencyName !== 'Global Guides DMC LLP' && (
              <span className="hidden sm:flex items-center gap-2 pl-3 border-l border-white/15 text-xs text-white/70 truncate max-w-[180px]">
                <span className="text-white/40 uppercase tracking-widest text-[10px] font-bold">on behalf of</span>
                <span className="font-medium text-white truncate">{actor.agencyName}</span>
              </span>
            )}
          </Link>

          <nav className="hidden lg:flex items-center gap-1 text-sm ml-2">
            {NAV_AGENCY.map((n) => {
              const Icon = n.icon;
              const active = pathname === n.href || pathname?.startsWith(n.href + '/');
              return (
                <Link
                  key={n.href}
                  href={n.href as any}
                  className={cn(
                    'group inline-flex items-center gap-1.5 px-3 py-2 rounded-md transition-colors',
                    active ? 'text-crimson-900 bg-amber-500' : 'text-white/80 hover:text-white hover:bg-white/10',
                  )}
                >
                  <Icon className="w-4 h-4 opacity-80" />
                  {n.label}
                </Link>
              );
            })}
          </nav>

          {notif && <div className="ml-auto lg:ml-0"><NotificationBell initialUnread={notif.unread} initialItems={notif.items} /></div>}

          <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden w-10 h-10 inline-flex items-center justify-center rounded-md text-white hover:bg-white/10" aria-label={mobileOpen ? 'Close menu' : 'Open menu'}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-white/10 bg-crimson-900">
            <nav className="px-3 py-3 grid grid-cols-2 gap-1 text-sm">
              {NAV_AGENCY.map((n) => {
                const Icon = n.icon;
                const active = pathname === n.href || pathname?.startsWith(n.href + '/');
                return (
                  <Link
                    key={n.href}
                    href={n.href as any}
                    onClick={() => setMobileOpen(false)}
                    className={cn('inline-flex items-center gap-2 px-3 py-2.5 rounded-md', active ? 'bg-amber-500 text-crimson-900' : 'text-white/85 hover:bg-white/10 hover:text-white')}
                  >
                    <Icon className="w-4 h-4 opacity-80" />{n.label}
                  </Link>
                );
              })}
            </nav>
            <div className="px-3 py-3 border-t border-white/10 flex items-center justify-between text-xs">
              <Link href="/statement" onClick={() => setMobileOpen(false)} className="inline-flex items-center gap-1.5 text-white/70"><Wallet className="w-3.5 h-3.5" /> Wallet {walletLabel}</Link>
              {actor.role === 'SUPER_ADMIN' && <Link href="/admin" onClick={() => setMobileOpen(false)} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white text-crimson-900 font-semibold"><ShieldCheck className="w-3 h-3" /> Admin</Link>}
              <a href="/logout" className="inline-flex items-center gap-1 text-white/70"><LogOut className="w-3.5 h-3.5" /> Sign out</a>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
