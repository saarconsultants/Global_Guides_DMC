import { PageHeader } from '@/components/ui/page-header';
import { TemplateForm } from '@/components/admin/template-form';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { AdminPage } from '@/components/admin/admin-ui';

export default function NewTemplatePage() {
  return (
    <AdminPage>
      <Link href="/admin/templates" className="inline-flex items-center gap-1.5 min-h-8 text-sm text-[rgb(var(--text-secondary))] hover:text-crimson-700"><ArrowLeft className="w-4 h-4" /> Back to templates</Link>
      <PageHeader title="New itinerary template" description="Once published, every active agency will see this in their Suggested page." />
      <TemplateForm initial={{ published: true }} />
    </AdminPage>
  );
}
