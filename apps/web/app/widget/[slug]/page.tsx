import { db } from '@/lib/db/client';
import { notFound } from 'next/navigation';
import { WidgetForm } from './widget-form';
import { ImageWithFallback } from '@/components/common/image-with-fallback';

export const dynamic = 'force-dynamic';

export default async function WidgetPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const agency = await db.agency.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, logoUrl: true, primaryColor: true, accentColor: true, tagline: true, status: true },
  });
  if (!agency || agency.status !== 'ACTIVE') notFound();

  const initials = (agency.name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');
  const initialsPlate = <span className="h-11 w-11 rounded-md bg-ink text-white flex items-center justify-center text-sm font-extrabold">{initials}</span>;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-canvas">
      <div className="w-full max-w-md bg-surface rounded-lg border border-border-subtle shadow-sm overflow-hidden">
        <div className="px-6 pt-6 pb-5 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            {/* Logo on a white plate; initials when there is no logo or it fails to load. */}
            <div className="shrink-0">
              {agency.logoUrl ? (
                <div className="h-11 min-w-11 rounded-md bg-white border border-border-subtle px-1.5 flex items-center justify-center">
                  <ImageWithFallback src={agency.logoUrl} alt={agency.name} className="h-8 w-auto max-w-[110px] object-contain" fallback={<span className="text-sm font-extrabold text-ink px-1">{initials}</span>} />
                </div>
              ) : initialsPlate}
            </div>
            <div className="min-w-0">
              <h1 className="text-[18px] font-extrabold text-ink leading-tight break-words">{agency.name}</h1>
              <p className="text-[13px] text-[rgb(var(--text-secondary))] leading-snug mt-0.5">{agency.tagline || 'Tell us about your trip and we’ll send a proposal.'}</p>
            </div>
          </div>
        </div>
        <WidgetForm slug={agency.slug} />
      </div>
    </div>
  );
}
