import { db } from '@/lib/db/client';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { TemplateForm } from '@/components/admin/template-form';

export const dynamic = 'force-dynamic';

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await db.itineraryTemplate.findUnique({ where: { id } });
  if (!t) notFound();
  return (
    <div className="p-8 space-y-6">
      <PageHeader eyebrow={`Template · ${t.code}`} title={t.title} description="Edit and re-publish. Changes apply to every agency's Suggested page immediately." />
      <TemplateForm initial={{
        id: t.id,
        code: t.code,
        title: t.title,
        hero: t.hero,
        region: t.region,
        category: t.category,
        totalNights: t.totalNights,
        startingPriceRupees: Math.round(Number(t.startingPricePaise) / 100),
        blurb: t.blurb,
        destinations: t.destinations,
        daysJson: t.daysJson,
        visaJson: t.visaJson,
        insuranceJson: t.insuranceJson,
        published: t.published,
      }} />
    </div>
  );
}
