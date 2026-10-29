import { db } from '@/lib/db/client';
import { requireSuperAdmin } from '@/lib/auth/ctx';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { EmptyState } from '@/components/ui/empty-state';
import { Bug, AlertOctagon, AlertTriangle, Info, Flame } from 'lucide-react';
import { resolveBugReportGroupAction } from '@/app/actions/bug-reports';
import { statusLabel } from '@/lib/labels';
import { AdminPage, Disclosure, FilterChip, FilterRow, PrintedDate } from '@/components/admin/admin-ui';

export const dynamic = 'force-dynamic';

interface Props { searchParams: Promise<{ status?: string; severity?: string }> }

const SEV_META: Record<string, { variant: 'neutral' | 'info' | 'warning' | 'danger'; icon: any }> = {
  LOW:     { variant: 'neutral', icon: Info },
  MEDIUM:  { variant: 'info',    icon: AlertTriangle },
  HIGH:    { variant: 'warning', icon: Flame },
  BLOCKER: { variant: 'danger',  icon: AlertOctagon },
};
const STATUSES = ['OPEN', 'TRIAGED', 'IN_PROGRESS', 'FIXED', 'WONTFIX', 'DUPLICATE'];
const SEVS     = ['BLOCKER', 'HIGH', 'MEDIUM', 'LOW'];
const OPEN_STATUSES = ['OPEN', 'TRIAGED', 'IN_PROGRESS'];

function href(status?: string, severity?: string) {
  const p = new URLSearchParams();
  if (status) p.set('status', status);
  if (severity) p.set('severity', severity);
  const q = p.toString();
  return `/admin/bug-reports${q ? `?${q}` : ''}`;
}

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
  const openCount = OPEN_STATUSES.reduce((s, k) => s + (countByStatus[k] ?? 0), 0);

  // Group identical reports (same title + status) for display only. Rows are
  // newest-first within a status, so the first row of a group is the latest.
  type Row = (typeof rows)[number];
  const groups: { key: string; latest: Row; all: Row[] }[] = [];
  const byKey = new Map<string, { key: string; latest: Row; all: Row[] }>();
  for (const r of rows) {
    const key = `${r.status}::${r.title.trim().toLowerCase()}`;
    const g = byKey.get(key);
    if (g) g.all.push(r);
    else { const ng = { key, latest: r, all: [r] }; byKey.set(key, ng); groups.push(ng); }
  }

  return (
    <AdminPage>
      <PageHeader
        title="Bug reports"
        description="Issues sent with the Report button. Identical reports are grouped; resolved ones stay here for the record."
        actions={<Pill variant={openCount === 0 ? 'success' : 'neutral'}>{openCount} open</Pill>}
      />

      <div className="space-y-3">
        <FilterRow label="Status">
          <FilterChip href={href(undefined, sp.severity)} label="All" active={!sp.status} />
          {STATUSES.map((s) => <FilterChip key={s} href={href(s, sp.severity)} label={statusLabel(s)} count={countByStatus[s] ?? 0} active={sp.status === s} />)}
        </FilterRow>
        <FilterRow label="Severity">
          <FilterChip href={href(sp.status, undefined)} label="All" active={!sp.severity} />
          {SEVS.map((s) => <FilterChip key={s} href={href(sp.status, s)} label={statusLabel(s)} active={sp.severity === s} />)}
        </FilterRow>
      </div>

      {groups.length === 0 ? (
        <Card><CardContent className="pt-2"><EmptyState dense icon={<Bug className="w-7 h-7" />} title="Nothing reported" body="No reports match. The Report button sits bottom-right on every page." /></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {groups.map(({ key, latest: r, all }) => {
            const sev = SEV_META[r.severity] ?? SEV_META.MEDIUM;
            const open = OPEN_STATUSES.includes(r.status);
            const firstLine = (r.body ?? '').split('\n').map((l) => l.trim()).find(Boolean) ?? '';
            return (
              <Card key={key} className={open ? '' : 'opacity-70'}>
                <CardContent className="pt-5">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Pill variant={sev.variant}><sev.icon className="w-3 h-3" aria-hidden />{statusLabel(r.severity)}</Pill>
                        <Pill variant={open ? 'neutral' : 'success'}>{statusLabel(r.status)}</Pill>
                        <span className="text-[rgb(var(--text-secondary))]"><PrintedDate d={r.createdAt} className="text-[11.5px]" /></span>
                      </div>
                      <h2 className="text-[16px] font-bold text-ink leading-snug break-words">
                        {r.title}
                        {all.length > 1 && <span className="ml-2 align-middle inline-flex items-center rounded-[5px] bg-navy-100 text-navy-700 px-1.5 py-[2px] text-[12px] font-bold tnum" title={`${all.length} identical reports`}>×{all.length}</span>}
                      </h2>
                      {firstLine && firstLine !== r.title && (
                        <p className="text-[13px] text-[rgb(var(--text-secondary))] mt-1 line-clamp-1 break-all">{firstLine.slice(0, 160)}</p>
                      )}
                      {r.pageUrl && (
                        <a href={r.pageUrl} target="_blank" rel="noreferrer" title={r.pageUrl} className="mt-1.5 flex items-center min-h-6 hit-area min-w-0 text-[13px] text-crimson-700 hover:underline">
                          <span className="truncate">{r.pageUrl}</span>
                        </a>
                      )}
                      {r.resolution && (
                        <p className="mt-2 rounded-md bg-success-100 text-success-600 text-xs px-3 py-2"><span className="font-semibold">Resolution:</span> {r.resolution}</p>
                      )}

                      <Disclosure summary="Show details" className="mt-2">
                        <div className="space-y-3">
                          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-[12px] text-[rgb(var(--text-secondary))]">
                            <div><span className="font-semibold text-ink-soft">Reporter:</span> {r.userName ?? r.userEmail ?? 'Anonymous (customer page)'}</div>
                            <div><span className="font-semibold text-ink-soft">Type:</span> {statusLabel(r.category)}</div>
                            <div><span className="font-semibold text-ink-soft">Screen size:</span> {r.viewport ?? '—'}</div>
                            <div className="truncate" title={r.userAgent ?? undefined}><span className="font-semibold text-ink-soft">Browser:</span> {r.userAgent ?? '—'}</div>
                          </div>
                          {r.body && (
                            <pre className="max-h-72 overflow-auto rounded-md bg-surface-2 border border-border-subtle p-3 text-[11.5px] leading-relaxed font-mono whitespace-pre-wrap break-words text-ink-soft">{r.body}</pre>
                          )}
                          {all.length > 1 && (
                            <p className="text-[12px] text-[rgb(var(--text-secondary))]">
                              Reported {all.length} times, most recently <PrintedDate d={all[0].createdAt} />, first <PrintedDate d={all[all.length - 1].createdAt} />.
                            </p>
                          )}
                        </div>
                      </Disclosure>
                    </div>

                    <form action={resolveBugReportGroupAction.bind(null, all.map((x) => x.id))} className="flex flex-col gap-2 flex-shrink-0 w-full lg:w-52">
                      <select name="status" aria-label={`Status for report: ${r.title}`} defaultValue={r.status} className="h-9 rounded-md border border-border bg-surface px-2 text-[13px] font-medium text-ink">
                        {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
                      </select>
                      <input name="resolution" aria-label={`Resolution note for report: ${r.title}`} placeholder="Resolution note (optional)" defaultValue={r.resolution ?? ''} className="h-9 rounded-md border border-border bg-surface px-2 text-[13px]" />
                      <button className="h-9 rounded-md border border-border bg-surface text-ink text-[13px] font-bold hover:border-border-strong transition-colors">
                        {all.length > 1 ? `Update all ${all.length}` : 'Update'}
                      </button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AdminPage>
  );
}
