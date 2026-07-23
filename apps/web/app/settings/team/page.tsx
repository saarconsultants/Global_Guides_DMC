import { db } from '@/lib/db/client';
import { Card, CardContent } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { requireAgency } from '@/lib/auth/ctx';
import { createInviteAction, revokeInviteAction, removeTeamMemberAction } from '@/app/actions/team';
import { formatDateShort } from '@/lib/utils';
import { Users as UsersIcon, MailPlus, Copy } from 'lucide-react';
import Link from 'next/link';
import { InviteLinkCopyButton } from '@/components/settings/invite-link-copy';
import { ActionForm } from '@/components/ui/action-form';

export const dynamic = 'force-dynamic';

export default async function TeamSettingsPage() {
  const actor = await requireAgency();
  const isOwner = actor.role === 'AGENCY_OWNER';
  const [users, invites] = await Promise.all([
    db.user.findMany({ where: { agencyId: actor.agencyId }, orderBy: { createdAt: 'asc' } }),
    db.invite.findMany({ where: { agencyId: actor.agencyId, acceptedAt: null }, orderBy: { createdAt: 'desc' } }),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/settings" className="text-[rgb(var(--text-secondary))] hover:text-navy-900">Settings</Link>
        <span className="text-[rgb(var(--text-tertiary))]">›</span>
        <span className="text-navy-900 font-medium">Team</span>
      </div>

      <PageHeader
        eyebrow="Settings"
        title="Team"
        description="Invite counsellors and ops members. They get a tokenised signup link &mdash; no email infrastructure required."
      />

      {!isOwner && (
        <Card><CardContent className="pt-5 text-sm text-[rgb(var(--text-secondary))]">Only the agency owner can manage the team. You can still see who's on the team.</CardContent></Card>
      )}

      {isOwner && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <h2 className="text-lg font-semibold text-navy-900 inline-flex items-center gap-2"><MailPlus className="w-4 h-4 text-crimson-700" />Invite a team member</h2>
            <ActionForm action={createInviteAction} success="Invite created" resetOnSuccess className="grid sm:grid-cols-[1fr_180px_120px] gap-2">
              <div><Label>Email</Label><Input name="email" type="email" required placeholder="counsellor@youragency.com" /></div>
              <div><Label>Role</Label>
                <select name="role" defaultValue="COUNSELLOR" className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm">
                  <option value="COUNSELLOR">Counsellor</option>
                  <option value="OPS">Ops</option>
                  <option value="AGENCY_OWNER">Co-owner</option>
                </select>
              </div>
              <div className="flex items-end"><Button type="submit" className="w-full">Create invite</Button></div>
            </ActionForm>
            <p className="text-xs text-[rgb(var(--text-secondary))]">An invite is good for 7 days. We'll add automatic email delivery once Resend is wired &mdash; for now, copy the link below and send it manually.</p>
          </CardContent>
        </Card>
      )}

      <section>
        <h2 className="text-lg font-semibold text-navy-900 mb-3">Pending invites ({invites.length})</h2>
        <Card><CardContent className="pt-2">
          {invites.length === 0 ? (
            <EmptyState dense icon={<MailPlus className="w-7 h-7" />} title="No pending invites" body="When you invite a teammate, the link appears here so you can copy and share it." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[11px] uppercase tracking-wider text-crimson-700 font-bold border-b-[1.5px] border-crimson-100"><th className="py-3 pr-4">Email</th><th>Role</th><th>Expires</th><th>Invite link</th><th></th></tr></thead>
                <tbody>
                  {invites.map((inv) => (
                    <tr key={inv.id} className="border-b border-border-subtle hover:bg-surface-2 transition-colors">
                      <td className="py-3 pr-4 font-medium">{inv.email}</td>
                      <td className="py-3 pr-4"><Pill variant="neutral">{inv.role}</Pill></td>
                      <td className="py-3 pr-4 text-[rgb(var(--text-secondary))] text-xs">{formatDateShort(inv.expiresAt)}</td>
                      <td className="py-3 pr-4">
                        <InviteLinkCopyButton path={`/invite/${inv.token}`} />
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {isOwner && (
                          <ActionForm action={revokeInviteAction.bind(null, inv.id)} confirm="Revoke this invite?" success="Invite revoked" className="inline">
                            <button className="text-danger-500 hover:underline text-xs font-medium">Revoke</button>
                          </ActionForm>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent></Card>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-navy-900 mb-3">Team ({users.length})</h2>
        <Card><CardContent className="pt-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[11px] uppercase tracking-wider text-crimson-700 font-bold border-b-[1.5px] border-crimson-100"><th className="py-3 pr-4">Email</th><th>Name</th><th>Role</th><th>Last login</th><th>Joined</th><th></th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border-subtle hover:bg-surface-2 transition-colors">
                    <td className="py-3 pr-4">{u.email}{u.id === actor.userId && <Pill variant="info" className="ml-2">you</Pill>}</td>
                    <td className="py-3 pr-4">{u.name ?? '—'}</td>
                    <td className="py-3 pr-4"><Pill variant="neutral">{u.role}</Pill></td>
                    <td className="py-3 pr-4 text-[rgb(var(--text-secondary))] text-xs">{u.lastLoginAt ? formatDateShort(u.lastLoginAt) : 'never'}</td>
                    <td className="py-3 pr-4 text-[rgb(var(--text-secondary))] text-xs">{formatDateShort(u.createdAt)}</td>
                    <td className="py-3 pr-4 text-right">
                      {isOwner && u.id !== actor.userId && (
                        <ActionForm action={removeTeamMemberAction.bind(null, u.id)} confirm="Remove this team member? They lose access immediately." success="Member removed" className="inline">
                          <button className="text-danger-500 hover:underline text-xs font-medium">Remove</button>
                        </ActionForm>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent></Card>
      </section>
    </div>
  );
}
