import { db } from '@/lib/db/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { toggleTemplatePublishedAction, deleteTemplateAction } from '@/app/actions/admin';
import { formatINR, formatDateShort } from '@/lib/utils';
import { Sparkles, Plus, Edit, Eye } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminTemplatesPage() {
  const rows = await db.itineraryTemplate.findMany({ orderBy: { createdAt: 'desc' } });
  return (
    <div className="p-8 space-y-6 ambient">
      <PageHeader
        eyebrow="Platform"
        title="Itinerary templates"
        description="These appear under Suggested for every agency. Agents clone them into a draft proposal with one click."
        actions={
          <Link href="/admin/templates/new"><Button className="gap-1.5"><Plus className="w-4 h-4" />New template</Button></Link>
        }
      />

      <Card>
        <CardContent className="pt-2">
          {rows.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="w-7 h-7" />}
              title="No templates yet"
              body="Publish a curated itinerary so every onboarded agency sees it in Suggested."
              primary={{ label: 'Publish first template', href: '/admin/templates/new' }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-crimson-700 font-bold border-b-[1.5px] border-crimson-100">
                    <th className="py-3 pr-4 font-semibold">Code</th>
                    <th className="py-3 pr-4 font-semibold">Title</th>
                    <th className="py-3 pr-4 font-semibold">Region</th>
                    <th className="py-3 pr-4 font-semibold">Category</th>
                    <th className="py-3 pr-4 font-semibold text-right">Nights</th>
                    <th className="py-3 pr-4 font-semibold text-right">Price from</th>
                    <th className="py-3 pr-4 font-semibold">Created</th>
                    <th className="py-3 pr-4 font-semibold">Status</th>
                    <th className="py-3 pr-4 font-semibold"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((t) => (
                    <tr key={t.id} className="border-b border-border-subtle hover:bg-surface-2 transition-colors align-top group">
                      <td className="py-3 pr-4 font-mono text-xs"><Link href={`/admin/templates/${t.id}` as any} className="text-crimson-700 hover:underline">{t.code}</Link></td>
                      <td className="py-3 pr-4 font-medium max-w-xs">
                        <Link href={`/admin/templates/${t.id}` as any} className="hover:text-crimson-700 transition-colors">{t.title}</Link>
                        <p className="text-xs text-[rgb(var(--text-secondary))] mt-0.5 line-clamp-1">{t.blurb}</p>
                      </td>
                      <td className="py-3 pr-4 text-xs">{t.region.replace('_', ' ')}</td>
                      <td className="py-3 pr-4 text-xs">{t.category}</td>
                      <td className="py-3 pr-4 font-mono text-right">{t.totalNights}N</td>
                      <td className="py-3 pr-4 font-mono text-right">{formatINR(t.startingPricePaise)}</td>
                      <td className="py-3 pr-4 text-[rgb(var(--text-secondary))] text-xs">{formatDateShort(t.createdAt)}</td>
                      <td className="py-3 pr-4">
                        <form action={toggleTemplatePublishedAction.bind(null, t.id)} className="inline">
                          <button type="submit" className="cursor-pointer" title={t.published ? 'Unpublish' : 'Publish'}>
                            <Pill variant={t.published ? 'success' : 'neutral'}>{t.published ? 'PUBLISHED' : 'DRAFT'}</Pill>
                          </button>
                        </form>
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <div className="inline-flex items-center gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 transition-opacity">
                          <Link href={`/admin/templates/${t.id}` as any} className="text-xs text-crimson-700 hover:underline inline-flex items-center gap-1"><Edit className="w-3 h-3" />Edit</Link>
                          {t.published && (
                            <Link href={`/suggested?region=${t.region}` as any} target="_blank" className="text-xs text-[rgb(var(--text-secondary))] hover:text-navy-700 inline-flex items-center gap-1"><Eye className="w-3 h-3" />Preview</Link>
                          )}
                          <form action={deleteTemplateAction.bind(null, t.id)} className="inline">
                            <button className="text-xs text-danger-500 hover:underline">Delete</button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
