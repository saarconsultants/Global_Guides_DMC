import { PageHeader } from '@/components/ui/page-header';
import { TemplateForm } from '@/components/admin/template-form';

export default function NewTemplatePage() {
  return (
    <div className="p-8 space-y-6">
      <PageHeader eyebrow="Platform" title="New itinerary template" description="Once published, every active agency will see this in their Suggested page." />
      <TemplateForm initial={{ published: true }} />
    </div>
  );
}
