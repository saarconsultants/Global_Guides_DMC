import { db } from '@/lib/db/client';
import { notFound } from 'next/navigation';
import { InviteAcceptForm } from './invite-accept-form';
import { Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function InviteAcceptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await db.invite.findUnique({ where: { token }, include: { agency: { select: { name: true, primaryColor: true, accentColor: true, logoUrl: true } } } });
  if (!invite) notFound();

  const expired  = invite.expiresAt < new Date();
  const accepted = !!invite.acceptedAt;

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-canvas">
      <aside className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-crimson-500 via-crimson-700 to-crimson-900 text-white items-center justify-center p-12">
        <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-amber-500/25 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-amber-300/15 blur-3xl" />
        <div className="relative max-w-md">
          <img src="/brand/ggdmc-logo-white.svg" alt="Global Guides DMC" className="h-12 w-auto mb-6" />
          <p className="text-xs uppercase tracking-widest text-amber-300 font-bold inline-flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> You're invited</p>
          <h1 className="mt-3 text-4xl font-bold leading-tight">Join <span className="font-display italic text-amber-300">{invite.agency.name}</span></h1>
          <p className="mt-4 text-white/80 leading-relaxed">As a <strong className="text-white">{invite.role.toLowerCase()}</strong>, you'll help build and send trip proposals to customers.</p>
        </div>
      </aside>

      <main className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md rounded-lg bg-surface border border-border-subtle shadow-sm p-8">
          {expired ? (
            <>
              <h2 className="text-2xl font-bold text-navy-900">Invite expired</h2>
              <p className="text-sm text-[rgb(var(--text-secondary))] mt-1">This invite link is more than 7 days old. Ask {invite.agency.name} to send you a fresh one.</p>
            </>
          ) : accepted ? (
            <>
              <h2 className="text-2xl font-bold text-navy-900">Invite already accepted</h2>
              <p className="text-sm text-[rgb(var(--text-secondary))] mt-1">This invite has been used. <a href="/login" className="text-crimson-700 hover:underline font-medium">Sign in</a> with your email and password instead.</p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-navy-900">Welcome to the team</h2>
              <p className="text-sm text-[rgb(var(--text-secondary))] mt-1">Set a password to finish creating your account. We've pre-filled your email.</p>
              <InviteAcceptForm token={token} email={invite.email} agencyName={invite.agency.name} role={invite.role} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
