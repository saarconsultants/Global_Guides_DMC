import { db } from '@/lib/db/client';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Pill } from '@/components/ui/pill';
import { Button } from '@/components/ui/button';
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
  const agency = await db.agency.findUnique({ where: { id: actor.agencyId }, select: { slug: true } });
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const origin = `${proto}://${host}`;
  const templates = await db.itineraryTemplate.findMany({ where: { published: true }, orderBy: { createdAt: 'desc' } });

  return (
    <div className="ambient">
      <div className="mx-auto max-w-7xl px-6 py-10 space-y-6">
        <PageHeader
          eyebrow="Marketing"
          title="Download branded flyers"
          description="Every Suggested itinerary is also a one-page PDF flyer in your brand colours, with your logo. Download and share via WhatsApp, email, or print for shop windows."
          actions={
            <Link href="/suggested"><Button variant="ghost" className="gap-1.5"><Eye className="w-4 h-4" />Customer-facing templates</Button></Link>
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 stagger">
            {templates.map((t) => {
              const cities = (() => { try { return (JSON.parse(t.destinations) as any[]).map((d) => d.cityName); } catch { return []; } })();
              return (
                <Card key={t.id} className="lift overflow-hidden">
                  <CardContent className="pt-5">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Pill variant="gold">{t.region.replace('_', ' ')}</Pill>
                      <Pill variant="info">{t.category}</Pill>
                    </div>
                    <h3 className="font-semibold text-navy-900">{t.title}</h3>
                    <p className="text-xs text-[rgb(var(--text-secondary))] mt-1 line-clamp-2">{t.blurb}</p>
                    <p className="text-xs text-[rgb(var(--text-secondary))] mt-2">{cities.join(' → ') || '—'}</p>
                    <p className="text-xs text-[rgb(var(--text-secondary))] mt-2">
                      <span className="font-mono">{t.totalNights}N</span> · from <span className="font-mono font-bold text-navy-900">{fmt(t.startingPricePaise)}</span>
                    </p>

                    <div className="mt-4 pt-3 border-t border-border-subtle grid grid-cols-2 gap-2">
                      <a
                        href={`/api/flyer/${t.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-md bg-crimson-900 text-white text-sm font-semibold hover:bg-crimson-700 transition-colors"
                      >
                        <Download className="w-4 h-4" />Download PDF
                      </a>
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(`Have a look at this ${t.totalNights}-night ${t.title} trip we put together. Starting from ₹ ${Math.round(Number(t.startingPricePaise) / 100).toLocaleString('en-IN')}. Ask us for the PDF brochure!`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-md bg-[#25D366] text-white text-sm font-semibold hover:bg-[#1ebe57] transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />Pitch
                      </a>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-navy-900 mb-1">Generate Leads widget</h2>
                <p className="text-sm text-[rgb(var(--text-secondary))]">An embeddable form for your own website. Drops captured enquiries straight into your <Link href="/leads" className="text-crimson-700 hover:underline font-medium">My Leads</Link> with the bell ringing in real-time.</p>
              </div>
              <Pill variant="success">Live</Pill>
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
