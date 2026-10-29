import Link from 'next/link';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'profile', href: '/settings', label: 'Profile & branding' },
  { key: 'sales', href: '/settings/sales', label: 'Sales & markup' },
  { key: 'team', href: '/settings/team', label: 'Team' },
] as const;

/** The same three tabs on /settings, /settings/sales and /settings/team. */
export function SettingsTabs({ active }: { active: (typeof TABS)[number]['key'] }) {
  return (
    <nav aria-label="Settings sections" className="flex flex-wrap gap-2 text-[13px]">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === active ? 'page' : undefined}
          className={cn(
            'px-3.5 h-11 sm:h-9 inline-flex items-center rounded-md font-bold transition-colors',
            t.key === active ? 'bg-ink text-white' : 'bg-surface border border-border text-navy-700 hover:border-border-strong',
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

/** One container for every settings page — same width and left edge as the rest of the app. */
export const SETTINGS_CONTAINER = 'mx-auto max-w-7xl px-4 sm:px-6 py-8 lg:py-10 space-y-6';
