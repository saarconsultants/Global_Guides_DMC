import { PageHeader } from '@/components/ui/page-header';
import { TemplateForm } from '@/components/admin/template-form';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewTemplatePage() {
  return (
    <div className="p-8 space-y-6">
      <Link href="/admin/templates" className="inline-flex items-center gap-1.5 text-sm text-[rgb(var(--text-secondary))] hover:text-crimson-700"><ArrowLeft className="w-4 h-4" /> Back to templates</Link>
      <PageHeader eyebrow="Platform" title="New itinerary template" description="Once published, every active agency will see this in their Suggested page." />
      <TemplateForm initial={{ published: true }} />
    </div>
  );
}
