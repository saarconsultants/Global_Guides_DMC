import './globals.css';
import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono, Fraunces } from 'next/font/google';
import { TopNav } from '@/components/layout/top-nav';
import { Toaster } from '@/components/ui/toast';
import { BugReportButton } from '@/components/feedback/bug-report-button';
import { getActor } from '@/lib/auth/ctx';
import { formatMoney } from '@/lib/money';
import { getDisplayRate } from '@/lib/fx-display';
import { CurrencyProvider } from '@/components/providers/currency-provider';
import { db } from '@/lib/db/client';
import { countUnread, listNotifications } from '@/lib/db/notifications';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', display: 'swap' });
const jbm = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jbm', display: 'swap' });
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', display: 'swap' });

export const metadata: Metadata = {
  title: 'Global Guides DMC',
  description: 'B2B travel agent platform — itinerary builder, leads, proposals, bookings',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor();
  let walletLabel = '₹ 0';
  let currency = 'INR';
  let rate = 1;
  let notif: { unread: number; items: any[] } | undefined = undefined;
  if (actor?.agencyId) {
    const [a, unread, items] = await Promise.all([
      db.agency.findUnique({ where: { id: actor.agencyId }, select: { walletPaise: true, currency: true } }),
      countUnread(actor.agencyId, actor.userId),
      listNotifications(actor.agencyId, actor.userId, 15),
    ]);
    currency = a?.currency ?? 'INR';
    rate = await getDisplayRate(currency);
    walletLabel = formatMoney(a?.walletPaise ?? 0n, currency, rate);
    notif = { unread, items: items.map((n) => ({ id: n.id, kind: n.kind, title: n.title, body: n.body, href: n.href, readAt: n.readAt?.toISOString() ?? null, createdAt: n.createdAt.toISOString() })) };
  }

  return (
    <html lang="en" className={`${jakarta.variable} ${jbm.variable} ${fraunces.variable}`}>
      <body>
        <CurrencyProvider currency={currency} rate={rate}>
          <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:rounded-md focus:bg-crimson-900 focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-white">Skip to content</a>
          <TopNav
            walletLabel={walletLabel}
            actor={actor ? { name: actor.name ?? actor.email, role: actor.role, agencyName: actor.agency?.name ?? 'Platform', logoUrl: actor.agency?.logoUrl ?? null } : null}
            notif={notif}
          />
          <main id="main-content" className="min-h-screen">{children}</main>
          <BugReportButton />
        </CurrencyProvider>
        <Toaster />
      </body>
    </html>
  );
}
