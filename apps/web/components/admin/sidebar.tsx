'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Building2, Sparkles, Percent, Coins, LogOut, ArrowLeftRight, Menu, X, Bug, Plug, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { href: '/admin',             label: 'Overview',         icon: LayoutDashboard },
  { href: '/admin/agencies',    label: 'Agencies',         icon: Building2 },
  { href: '/admin/templates',   label: 'Templates',        icon: Sparkles },
  { href: '/admin/commissions', label: 'Commission rules', icon: Percent },
  { href: '/admin/revenue',     label: 'Revenue ledger',   icon: Coins },
  { href: '/admin/performance', label: 'Performance',      icon: BarChart3 },
  { href: '/admin/inventory',   label: 'Inventory APIs',   icon: Plug },
  { href: '/admin/bug-reports', label: 'Bug reports',      icon: Bug },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-40 bg-ink text-white px-4 h-16 flex items-center justify-between border-b border-white/10">
        <Link href="/admin" className="flex items-center gap-2">
          <img src="/brand/ggdmc-logo-white.svg" alt="Global Guides DMC" className="h-8 w-auto" />
          <span className="ml-1 rounded-[5px] bg-white/10 text-white/80 text-[10.5px] font-bold uppercase tracking-[0.1em] px-1.5 py-0.5">Admin</span>
        </Link>
        <button onClick={() => setOpen(!open)} aria-label={open ? 'Close menu' : 'Open menu'} className="w-10 h-10 inline-flex items-center justify-center rounded-md hover:bg-white/10">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {open && <div onClick={() => setOpen(false)} className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />}

      <aside aria-label="Platform admin" className={cn(
        'bg-ink text-white w-[260px] flex flex-col',
        'fixed inset-y-0 left-0 z-50 transition-transform lg:translate-x-0',
        // Desktop: pinned, full viewport height on every page length.
        'lg:sticky lg:top-0 lg:bottom-auto lg:self-start lg:h-screen lg:z-auto',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      )}>
        <div className="px-6 py-6 border-b border-white/10 hidden lg:block">
          <Link href="/admin"><img src="/brand/ggdmc-logo-white.svg" alt="Global Guides DMC" className="h-10 w-auto" /></Link>
          <span className="inline-block mt-3 rounded-[5px] bg-white/10 text-white/80 text-[10.5px] font-bold uppercase tracking-[0.1em] px-1.5 py-0.5">Platform admin</span>
        </div>
        <nav aria-label="Admin sections" className="px-3 py-4 space-y-0.5 flex-1 overflow-y-auto mt-16 lg:mt-0">
          {items.map((n) => {
            const Icon = n.icon;
            const active = pathname === n.href || (n.href !== '/admin' && pathname?.startsWith(n.href));
            return (
              <Link
                key={n.href}
                href={n.href as any}
                aria-current={active ? 'page' : undefined}
                onClick={() => setOpen(false)}
                className={cn(
                  'relative flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                  active
                    ? 'bg-white/10 text-white font-bold before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-full before:bg-crimson-500'
                    : 'text-white/75 hover:bg-white/10 hover:text-white font-semibold',
                )}
              >
                <Icon className="w-4 h-4 opacity-80" aria-hidden />{n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/10 space-y-1">
          <Link href="/admin/agencies" className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-white/80 hover:bg-white/10 hover:text-white"><ArrowLeftRight className="w-4 h-4" /> View as agency</Link>
          <a href="/logout" className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-white/80 hover:bg-white/10 hover:text-white"><LogOut className="w-4 h-4" /> Sign out</a>
        </div>
      </aside>
    </>
  );
}
