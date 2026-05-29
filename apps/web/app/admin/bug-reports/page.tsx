import { db } from '@/lib/db/client';
import { requireSuperAdmin } from '@/lib/auth/ctx';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDateShort } from '@/lib/utils';
import { Bug, AlertOctagon, AlertTriangle, Info, Flame } from 'lucide-react';
import { resolveBugReportAction } from '@/app/actions/bug-reports';

export const dynamic = 'force-dynamic';

interface Props { searchParams: Promise<{ status?: string; severity?: string }> }

const SEV_META: Record<string, { variant: any; icon: any; color: string }> = {
  LOW:     { variant: 'neutral', icon: Info,          color: 'text-[rgb(var(--text-secondary))]' },
  MEDIUM:  { variant: 'info',    icon: AlertTriangle, color: 'text-info-500' },
  HIGH:    { variant: 'warning', icon: Flame,         color: 'text-amber-700' },
  BLOCKER: { variant: 'danger',  icon: AlertOctagon,  color: 'text-danger-500' },
};
const STATUSES = ['OPEN', 'TRIAGED', 'IN_PROGRESS', 'FIXED', 'WONTFIX', 'DUPLICATE'];
const SEVS     = ['BLOCKER', 'HIGH', 'MEDIUM', 'LOW'];

export default async function AdminBugReportsPage({ searchParams }: Props) {
  await requireSuperAdmin();
  const sp = await searchParams;
  const where: any = {};
  if (sp.status)   where.status = sp.status;
  if (sp.severity) where.severity = sp.severity;

  const [rows, counts] = await Promise.all([
    db.bugReport.findMany({ where, orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], take: 300 }),
    db.bugReport.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);

  const countByStatus: Record<string, number> = {};
  for (const c of counts) countByStatus[c.status] = c._count._all;
  const openCount = (countByStatus.OPEN ?? 0) + (countByStatus.TRIAGED ?? 0) + (countByStatus.IN_PROGRESS ?? 0);

  return (
    <div className="p-8 space-y-6 ambient">
      <PageHeader
        eyebrow="Platform · QA"
        title="Bug reports"
        description="Every issue your testers submitted via the Report button. Triage from here; resolved items stay in the log for audit."
        actions={<Pill variant={openCount === 0 ? 'success' : 'warning'}>{openCount} open</Pill>}
      />

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-[rgb(var(--text-secondary))] mr-1">Status:</span>
        <FilterChip href="/admin/bug-reports" label="All" active={!sp.status} />
        {STATUSES.map((s) => <FilterChip key={s} href={`/admin/bug-reports?status=${s}${sp.severity ? `&severity=${sp.severity}` : ''}`} label={`${s} · ${countByStatus[s] ?? 0}`} active={sp.status === s} />)}
        <span className="text-[rgb(var(--text-secondary))] ml-3 mr-1">Severity:</span>
        <FilterChip href={`/admin/bug-reports${sp.status ? `?status=${sp.status}` : ''}`} label="All" active={!sp.severity} />
        {SEVS.map((s) => <FilterChip key={s} href={`/admin/bug-reports?severity=${s}${sp.status ? `&status=${sp.status}` : ''}`} label={s} active={sp.severity === s} />)}
      </div>

      {rows.length === 0 ? (
        <Card><CardContent className="py-10"><EmptyState dense icon={<Bug className="w-7 h-7" />} title="Nothing reported" body="Either the platform is perfect, or no one has clicked Report yet. The button lives bottom-right on every page." /></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const sev = SEV_META[r.severity] ?? SEV_META.MEDIUM;
            const open = r.status === 'OPEN' || r.status === 'TRIAGED' || r.status === 'IN_PROGRESS';
            return (
              <Card key={r.id} className={open ? '' : 'opacity-60'}>
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <Pill variant={sev.variant}><sev.icon className="w-3 h-3 inline mr-0.5" />{r.severity}</Pill>
                        <Pill variant="neutral">{r.category}</Pill>
                        <Pill variant={open ? 'info' : 'success'}>{r.status}</Pill>
                        <span className="text-[10px] text-[rgb(var(--text-secondary))] font-mono">{formatDateShort(r.createdAt)} · {new Date(r.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <h3 className="text-base font-semibold text-navy-900">{r.title}</h3>
                      <p className="text-sm text-[rgb(var(--text-primary))] mt-1 whitespace-pre-wrap">{r.body}</p>
                      <div className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-1 text-[11px] text-[rgb(var(--text-secondary))]">
                        <div><span className="font-semibold">Reporter:</span> {r.userName ?? r.userEmail ?? <span className="italic">anonymous (customer page)</span>}</div>
                        <div><span className="font-semibold">Viewport:</span> {r.viewport ?? '—'}</div>
                        <div className="truncate"><span className="font-semibold">URL:</span> <a href={r.pageUrl ?? '#'} className="text-crimson-700 hover:underline">{r.pageUrl ?? '—'}</a></div>
                        <div className="truncate"><span className="font-semibold">UA:</span> {r.userAgent ?? '—'}</div>
                      </div>
                      {r.resolution && (
                        <div className="mt-3 rounded-md bg-success-100 text-success-500 text-xs px-3 py-2">
                          <span className="font-semibold">Resolution:</span> {r.resolution}
                        </div>
                      )}
                    </div>

                    <form action={resolveBugReportAction.bind(null, r.id)} className="flex flex-col gap-2 flex-shrink-0 w-44">
                      <select name="status" defaultValue={r.status} className="h-8 rounded-sm border border-border bg-surface px-2 text-xs">
                        {STATUSES.map((s) => <option key={s}>{s}</option>)}
                      </select>
                      <input name="resolution" placeholder="Resolution note (optional)" defaultValue={r.resolution ?? ''} className="h-8 rounded-sm border border-border bg-surface px-2 text-xs" />
                      <button className="h-8 rounded-sm bg-navy-900 text-white text-xs font-semibold hover:bg-crimson-900 transition-colors">Update</button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return <a href={href} className={`px-3 h-7 inline-flex items-center rounded-full font-medium border transition-colors ${active ? 'bg-crimson-900 text-white border-crimson-900' : 'bg-surface text-navy-700 border-border hover:bg-navy-50'}`}>{label}</a>;
}
