import { db } from '@/lib/db/client';
import { TEMPLATE_CARD_SELECT } from '@/lib/db/templates';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Pill } from '@/components/ui/pill';
import { Button, ButtonLink } from '@/components/ui/button';
import { getDisplayMoney } from '@/lib/money-server';
import { Download, Megaphone, Eye, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { headers } from 'next/headers';
import { requireAgency } from '@/lib/auth/ctx';
import { WidgetSnippet } from '@/components/marketing/widget-snippet';

export const dynamic = 'force-dynamic';

export default async function MarketingPage() {
  const { fmt } = await getDisplayMoney();
  const actor = await requireAgency();
  const agency = actor.agency ? { slug: actor.agency.slug } : null; // from the request-cached actor
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const origin = `${proto}://${host}`;
  const templates = await db.itineraryTemplate.findMany({ where: { published: true }, orderBy: { createdAt: 'desc' }, select: TEMPLATE_CARD_SELECT });

  return (
    <div>
      <div className="shell py-8 lg:py-10 space-y-6">
        <PageHeader
          eyebrow="Marketing"
          title="Download branded flyers"
          description="Every Suggested itinerary is also a one-page PDF flyer in your brand colours, with your logo. Download and share via WhatsApp, email, or print for shop windows."
          actions={
            <ButtonLink href="/suggested" variant="ghost" className="gap-1.5 px-0 sm:px-4 hover:bg-transparent sm:hover:bg-navy-50"><Eye className="w-4 h-4" />Customer-facing templates</ButtonLink>
          }
        />

        {templates.length === 0 ? (
          <Card><CardContent>
            <EmptyState
              icon={<Megaphone className="w-7 h-7" />}
              title="No flyers available yet"
              body="Ask the platform team to publish itinerary templates — each becomes a branded PDF you can download for marketing."
            />
          </CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => {
              const cities = (() => { try { return (JSON.parse(t.destinations) as any[]).map((d) => d.cityName); } catch { return []; } })();
              return (
                <Card key={t.id} className="lift overflow-hidden">
                  <CardContent className="pt-5">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Pill variant="neutral">{t.region.replace('_', ' ')}</Pill>
                      <Pill variant="neutral">{t.category}</Pill>
                    </div>
                    <h2 className="text-[16px] font-bold text-ink tracking-[-0.01em]">{t.title}</h2>
                    <p className="text-xs text-[rgb(var(--text-secondary))] mt-1 line-clamp-2">{t.blurb}</p>
                    <p className="text-xs text-[rgb(var(--text-secondary))] mt-2">{cities.join(' → ') || '—'}</p>
                    <p className="text-xs text-[rgb(var(--text-secondary))] mt-2">
                      <span className="font-mono">{t.totalNights}N</span> · from <span className="money text-ink">{fmt(t.startingPricePaise)}</span>
                    </p>

                    <div className="mt-4 pt-3 border-t border-border-subtle grid grid-cols-2 gap-2">
                      <a
                        href={`/api/flyer/${t.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 h-11 sm:h-10 px-3 rounded-md bg-surface text-ink border border-border text-sm font-bold hover:border-border-strong hover:bg-surface-2 transition-colors"
                      >
                        <Download className="w-4 h-4" />Download PDF
                      </a>
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(`Have a look at this ${t.totalNights}-night ${t.title} trip we put together. Starting from ${fmt(t.startingPricePaise)}. Ask us for the PDF brochure!`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 h-11 sm:h-10 px-3 rounded-md bg-surface text-ink border border-border text-sm font-bold hover:border-border-strong hover:bg-surface-2 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4 text-[#25D366]" aria-hidden />Pitch
                      </a>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Card className="min-w-0 overflow-hidden">
          <CardContent className="pt-6 space-y-3 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-[18px] font-extrabold text-ink mb-1 tracking-[-0.01em]">Lead-capture widget</h2>
                <p className="text-sm text-[rgb(var(--text-secondary))]">An embeddable form for your own website. Drops captured enquiries straight into your <Link href="/leads" className="text-crimson-700 hover:underline font-medium">My Leads</Link> with the bell ringing in real-time.</p>
              </div>
              <Pill variant="live">Live</Pill>
            </div>
            {agency?.slug ? (
              <WidgetSnippet slug={agency.slug} origin={origin} />
            ) : (
              <p className="text-xs text-danger-500">Agency slug missing — set it in Settings to enable the widget.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
