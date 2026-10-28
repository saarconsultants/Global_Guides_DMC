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
import { SettingsTabs, SETTINGS_CONTAINER } from '@/components/settings/settings-tabs';
import { roleLabel } from '@/lib/labels';
import { InviteLinkCopyButton } from '@/components/settings/invite-link-copy';
import { ActionForm } from '@/components/ui/action-form';
import { ResetPasswordButton } from '@/components/settings/reset-password-button';

export const dynamic = 'force-dynamic';

export default async function TeamSettingsPage() {
  const actor = await requireAgency();
  const isOwner = actor.role === 'AGENCY_OWNER';
  const [agency, users, invites] = await Promise.all([
    db.agency.findUnique({ where: { id: actor.agencyId }, select: { code: true } }),
    db.user.findMany({ where: { agencyId: actor.agencyId }, orderBy: { createdAt: 'asc' } }),
    db.invite.findMany({ where: { agencyId: actor.agencyId, acceptedAt: null }, orderBy: { createdAt: 'desc' } }),
  ]);

  return (
    <div className={SETTINGS_CONTAINER}>
      <PageHeader
        title="Settings"
        description="Agency profile, white-label branding, markup and team. These affect what your customers see on every share link."
        actions={<span className="text-xs text-[rgb(var(--text-secondary))]">Agency ID · <span className="font-mono">{agency?.code ?? "—"}</span></span>}
      />
      <SettingsTabs active="team" />
      <div>
        <h2 className="text-[18px] font-extrabold text-ink tracking-[-0.01em]">Team</h2>
        <p className="text-[14px] text-[rgb(var(--text-secondary))] mt-1 max-w-2xl">Invite counsellors and ops staff. Each invite is a private sign-up link you share with them.</p>
      </div>

      {!isOwner && (
        <Card><CardContent className="pt-5 text-sm text-[rgb(var(--text-secondary))]">Only the agency owner can manage the team. You can still see who's on the team.</CardContent></Card>
      )}

      {isOwner && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <h3 className="text-[16px] font-extrabold text-ink inline-flex items-center gap-2"><MailPlus className="w-4 h-4 text-crimson-700" />Invite a team member</h3>
            <ActionForm action={createInviteAction} success="Invite created" resetOnSuccess className="grid sm:grid-cols-[1fr_180px_120px] gap-2">
              <div><Label>Email</Label><Input name="email" type="email" required placeholder="counsellor@youragency.com" /></div>
              <div><Label>Role</Label>
                <select name="role" defaultValue="COUNSELLOR" className="control">
                  <option value="COUNSELLOR">Counsellor</option>
                  <option value="OPS">Ops</option>
                  <option value="AGENCY_OWNER">Co-owner</option>
                </select>
              </div>
              <div className="flex items-end"><Button type="submit" className="w-full">Create invite</Button></div>
            </ActionForm>
            <p className="text-xs text-[rgb(var(--text-secondary))]">Invites last 7 days. Copy the link from Pending invites and send it to your teammate on email or WhatsApp.</p>
          </CardContent>
        </Card>
      )}

      <section>
        <h3 className="text-[16px] font-extrabold text-ink mb-3">Pending invites ({invites.length})</h3>
        <Card><CardContent className="pt-2">
          {invites.length === 0 ? (
            <EmptyState dense icon={<MailPlus className="w-7 h-7" />} title="No pending invites" body="When you invite a teammate, the link appears here so you can copy and share it." />
          ) : (
            <>
            <ul className="md:hidden divide-y divide-border-subtle">
              {invites.map((inv) => (
                <li key={inv.id} className="py-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium text-ink break-all">{inv.email}</span>
                    <Pill variant="neutral">{roleLabel(inv.role)}</Pill>
                  </div>
                  <div className="text-[12.5px] text-[rgb(var(--text-secondary))]">Expires <span className="font-mono">{formatDateShort(inv.expiresAt)}</span></div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <InviteLinkCopyButton path={`/invite/${inv.token}`} />
                    {isOwner && (
                      <ActionForm action={revokeInviteAction.bind(null, inv.id)} confirm="Revoke this invite?" success="Invite revoked" className="inline">
                        <button className="inline-flex items-center min-h-6 text-danger-500 hover:underline text-xs font-medium">Revoke</button>
                      </ActionForm>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left label border-b border-border"><th className="py-3 pr-4">Email</th><th className="py-3 pr-4">Role</th><th className="py-3 pr-4">Expires</th><th className="py-3 pr-4">Invite link</th><th className="py-3"><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {invites.map((inv) => (
                    <tr key={inv.id} className="border-b border-border-subtle hover:bg-surface-2 transition-colors">
                      <td className="py-3 pr-4 font-medium">{inv.email}</td>
                      <td className="py-3 pr-4"><Pill variant="neutral">{roleLabel(inv.role)}</Pill></td>
                      <td className="py-3 pr-4 text-[rgb(var(--text-secondary))] text-xs font-mono whitespace-nowrap">{formatDateShort(inv.expiresAt)}</td>
                      <td className="py-3 pr-4">
                        <InviteLinkCopyButton path={`/invite/${inv.token}`} />
                      </td>
                      <td className="py-3 text-right">
                        {isOwner && (
                          <ActionForm action={revokeInviteAction.bind(null, inv.id)} confirm="Revoke this invite?" success="Invite revoked" className="inline">
                            <button className="inline-flex items-center min-h-6 text-danger-500 hover:underline text-xs font-medium">Revoke</button>
                          </ActionForm>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </CardContent></Card>
      </section>

      <section>
        <h3 className="text-[16px] font-extrabold text-ink mb-3">Members ({users.length})</h3>
        <Card><CardContent className="pt-2">
          {/* Phones: one card per member. */}
          <ul className="md:hidden divide-y divide-border-subtle">
            {users.map((u) => (
              <li key={u.id} className="py-3.5 space-y-1.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-ink break-words">{u.name ?? u.email}{u.id === actor.userId && <span className="ml-1.5 text-[12px] font-semibold text-[rgb(var(--text-secondary))]">(you)</span>}</div>
                    {u.name && <div className="text-[12.5px] text-[rgb(var(--text-secondary))] break-all">{u.email}</div>}
                  </div>
                  <Pill variant="neutral">{roleLabel(u.role)}</Pill>
                </div>
                <div className="text-[12.5px] text-[rgb(var(--text-secondary))]">Last login <span className="font-mono">{u.lastLoginAt ? formatDateShort(u.lastLoginAt) : 'never'}</span> · Joined <span className="font-mono">{formatDateShort(u.createdAt)}</span></div>
                <MemberActions u={u} isOwner={isOwner} selfId={actor.userId} />
              </li>
            ))}
          </ul>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left label border-b border-border"><th className="py-3 pr-4">Email</th><th className="py-3 pr-4">Name</th><th className="py-3 pr-4">Role</th><th className="py-3 pr-4">Last login</th><th className="py-3 pr-4">Joined</th><th className="py-3"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border-subtle hover:bg-surface-2 transition-colors">
                    <td className="py-3 pr-4">{u.email}{u.id === actor.userId && <span className="ml-1.5 text-[12px] font-semibold text-[rgb(var(--text-secondary))]">(you)</span>}</td>
                    <td className="py-3 pr-4">{u.name ?? '—'}</td>
                    <td className="py-3 pr-4"><Pill variant="neutral">{roleLabel(u.role)}</Pill></td>
                    <td className="py-3 pr-4 text-[rgb(var(--text-secondary))] text-xs font-mono whitespace-nowrap">{u.lastLoginAt ? formatDateShort(u.lastLoginAt) : 'never'}</td>
                    <td className="py-3 pr-4 text-[rgb(var(--text-secondary))] text-xs font-mono whitespace-nowrap">{formatDateShort(u.createdAt)}</td>
                    <td className="py-3 text-right"><MemberActions u={u} isOwner={isOwner} selfId={actor.userId} /></td>
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

function MemberActions({ u, isOwner, selfId }: { u: { id: string; email: string; role: string }; isOwner: boolean; selfId: string }) {
  if (!isOwner || u.id === selfId) return null;
  return (
    <div className="inline-flex flex-wrap items-center gap-x-4 gap-y-1">
      {u.role !== 'SUPER_ADMIN' && <ResetPasswordButton userId={u.id} email={u.email} />}
      <ActionForm action={removeTeamMemberAction.bind(null, u.id)} confirm="Remove this team member? They lose access immediately." success="Member removed" className="inline">
        <button className="inline-flex items-center min-h-6 text-danger-500 hover:underline text-xs font-medium">Remove</button>
      </ActionForm>
    </div>
  );
}
