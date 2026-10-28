import { db } from '@/lib/db/client';
import { Card, CardContent } from '@/components/ui/card';
import { ButtonLink } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { toggleTemplatePublishedAction, deleteTemplateAction } from '@/app/actions/admin';
import { formatINR } from '@/lib/utils';
import { statusLabel } from '@/lib/labels';
import { AdminPage, CodeLink, PrintedDate, RowFact } from '@/components/admin/admin-ui';
import { Sparkles, Plus, Edit, Eye } from 'lucide-react';
import Link from 'next/link';
import { ActionForm } from '@/components/ui/action-form';

export const dynamic = 'force-dynamic';

export default async function AdminTemplatesPage() {
  const rows = await db.itineraryTemplate.findMany({ orderBy: { createdAt: 'desc' } });
  return (
    <AdminPage>
      <PageHeader
        title="Itinerary templates"
        description="Shown under Suggested for every agency. Agents turn one into a draft proposal in one click."
        actions={
          <ButtonLink href="/admin/templates/new" className="gap-1.5"><Plus className="w-4 h-4" />New template</ButtonLink>
        }
      />

      <Card>
        <CardContent className="pt-2">
          {rows.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="w-7 h-7" />}
              title="No templates yet"
              body="Publish a curated itinerary so every agency sees it in Suggested."
              primary={{ label: 'Publish first template', href: '/admin/templates/new' }}
            />
          ) : (
            <>
              {/* Mobile + tablet: stacked rows */}
              <ul className="lg:hidden divide-y divide-border-subtle">
                {rows.map((t) => (
                  <li key={t.id} className="py-3.5 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <CodeLink href={`/admin/templates/${t.id}`} code={t.code} />
                      <PublishToggle id={t.id} published={t.published} />
                    </div>
                    <div className="min-w-0">
                      <Link href={`/admin/templates/${t.id}` as any} className="font-semibold text-ink hover:text-crimson-700">{t.title}</Link>
                      <p className="text-[13px] text-[rgb(var(--text-secondary))] mt-0.5 line-clamp-2">{t.blurb}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <RowFact label="Region">{regionLabel(t.region)}</RowFact>
                      <RowFact label="Nights"><span className="tnum">{t.totalNights}</span></RowFact>
                      <RowFact label="From"><span className="money">{formatINR(t.startingPricePaise)}</span></RowFact>
                    </div>
                    <RowActions t={t} />
                  </li>
                ))}
              </ul>

              {/* Desktop: table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left label border-b border-border">
                      <th className="py-3 pr-4 font-semibold">Code</th>
                      <th className="py-3 pr-4 font-semibold w-full">Title</th>
                      <th className="py-3 pr-4 font-semibold">Region</th>
                      <th className="py-3 pr-4 font-semibold">Category</th>
                      <th className="py-3 pr-4 font-semibold text-right">Nights</th>
                      <th className="py-3 pr-4 font-semibold text-right whitespace-nowrap">Price from</th>
                      <th className="py-3 pr-4 font-semibold">Created</th>
                      <th className="py-3 pr-4 font-semibold">Status</th>
                      <th className="py-3 font-semibold"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((t) => (
                      <tr key={t.id} className="border-b border-border-subtle hover:bg-surface-2 transition-colors align-top group">
                        <td className="py-3 pr-4"><CodeLink href={`/admin/templates/${t.id}`} code={t.code} /></td>
                        <td className="py-3 pr-4 font-medium">
                          <Link href={`/admin/templates/${t.id}` as any} className="hover:text-crimson-700 transition-colors">{t.title}</Link>
                          <p className="text-xs text-[rgb(var(--text-secondary))] mt-0.5 line-clamp-1">{t.blurb}</p>
                        </td>
                        <td className="py-3 pr-4 text-[13px] whitespace-nowrap">{regionLabel(t.region)}</td>
                        <td className="py-3 pr-4 text-[13px] whitespace-nowrap">{statusLabel(t.category)}</td>
                        <td className="py-3 pr-4 tnum text-right whitespace-nowrap">{t.totalNights}</td>
                        <td className="py-3 pr-4 money text-right whitespace-nowrap">{formatINR(t.startingPricePaise)}</td>
                        <td className="py-3 pr-4 text-[rgb(var(--text-secondary))]"><PrintedDate d={t.createdAt} /></td>
                        <td className="py-3 pr-4"><PublishToggle id={t.id} published={t.published} /></td>
                        <td className="py-3 text-right">
                          <div className="opacity-100 [@media(hover:hover)_and_(pointer:fine)]:lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 transition-opacity">
                            <RowActions t={t} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </AdminPage>
  );
}

function regionLabel(r: string) {
  return statusLabel(r).replace(/^Se asia$/, 'South-East Asia').replace(/^Indian sub$/, 'Indian subcontinent');
}

function PublishToggle({ id, published }: { id: string; published: boolean }) {
  return (
    <form action={toggleTemplatePublishedAction.bind(null, id)} className="inline">
      <button type="submit" className="cursor-pointer min-h-6" title={published ? 'Click to unpublish' : 'Click to publish'}>
        <Pill variant={published ? 'success' : 'neutral'}>{statusLabel(published ? 'PUBLISHED' : 'DRAFT')}</Pill>
      </button>
    </form>
  );
}

function RowActions({ t }: { t: { id: string; code: string; region: string; published: boolean } }) {
  return (
    <div className="inline-flex items-center gap-3 whitespace-nowrap">
      <Link href={`/admin/templates/${t.id}` as any} className="text-xs font-semibold text-crimson-700 hover:underline inline-flex items-center gap-1 min-h-8"><Edit className="w-3 h-3" />Edit</Link>
      {t.published && (
        <Link href={`/suggested?region=${t.region}` as any} target="_blank" className="text-xs font-semibold text-[rgb(var(--text-secondary))] hover:text-ink inline-flex items-center gap-1 min-h-8"><Eye className="w-3 h-3" />Preview</Link>
      )}
      <ActionForm action={deleteTemplateAction.bind(null, t.id)} confirm={`Delete template ${t.code}? Agencies will no longer see it in Suggested. This can't be undone.`} success="Template deleted" className="inline">
        <button type="submit" className="inline-flex items-center min-h-8 text-xs font-semibold text-danger-500 hover:underline">Delete</button>
      </ActionForm>
    </div>
  );
}
