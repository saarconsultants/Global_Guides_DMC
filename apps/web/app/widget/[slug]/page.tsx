import { db } from '@/lib/db/client';
import { notFound } from 'next/navigation';
import { WidgetForm } from './widget-form';

export const dynamic = 'force-dynamic';

export default async function WidgetPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const agency = await db.agency.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, logoUrl: true, primaryColor: true, accentColor: true, tagline: true, status: true },
  });
  if (!agency || agency.status !== 'ACTIVE') notFound();

  const primary = agency.primaryColor ?? '#630909';
  const accent  = agency.accentColor  ?? '#FFBA06';

  return (
    <main className="min-h-screen flex items-center justify-center p-4" style={{ background: `linear-gradient(135deg, ${primary} 0%, #000 100%)` }}>
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="px-6 py-5 text-white" style={{ background: primary }}>
          <div className="flex items-center gap-3">
            {agency.logoUrl && <img src={agency.logoUrl} alt={agency.name} className="h-10 w-10 rounded bg-white/10 p-1 object-contain" />}
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: accent }}>Plan your trip</p>
              <h1 className="text-lg font-bold">{agency.name}</h1>
            </div>
          </div>
          {agency.tagline && <p className="text-xs text-white/80 mt-2">{agency.tagline}</p>}
        </div>
        <WidgetForm slug={agency.slug} accent={accent} primary={primary} />
      </div>
    </main>
  );
}
