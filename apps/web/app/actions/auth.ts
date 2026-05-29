'use server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db/client';
import { getSession, destroySession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 48) || `agency-${Date.now().toString(36)}`;
}

async function nextAgencyCode(): Promise<string> {
  const count = await db.agency.count();
  return `GGN${String(count + 1).padStart(6, '0')}`;
}

export async function loginAction(args: { email: string; password: string }): Promise<{ ok: true; redirectTo: string } | { ok: false; error: string }> {
  const email = args.email.trim().toLowerCase();
  const user = await db.user.findUnique({ where: { email }, include: { agency: true } });
  if (!user || !user.passwordHash) return { ok: false, error: 'No account with that email.' };
  const ok = await bcrypt.compare(args.password, user.passwordHash);
  if (!ok) return { ok: false, error: 'Wrong password.' };
  if (user.agency && user.agency.status === 'SUSPENDED') return { ok: false, error: 'Your agency is suspended. Contact the platform admin.' };

  const s = await getSession();
  s.userId = user.id;
  s.agencyId = user.agencyId ?? undefined;
  s.role = user.role as any;
  s.email = user.email;
  s.name = user.name ?? undefined;
  await s.save();

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  return { ok: true, redirectTo: user.role === 'SUPER_ADMIN' ? '/admin' : '/dashboard' };
}

export async function signupAgencyAction(args: { agencyName: string; contact?: string; name: string; email: string; password: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = args.email.trim().toLowerCase();
  if (!email.includes('@')) return { ok: false, error: 'Invalid email.' };
  if (args.password.length < 8) return { ok: false, error: 'Password must be at least 8 characters.' };
  const exists = await db.user.findUnique({ where: { email } });
  if (exists) return { ok: false, error: 'An account with that email already exists.' };

  const slug = slugify(args.agencyName);
  const slugTaken = await db.agency.findUnique({ where: { slug } });
  const finalSlug = slugTaken ? `${slug}-${Date.now().toString(36).slice(-4)}` : slug;

  const code = await nextAgencyCode();
  const agency = await db.agency.create({
    data: {
      code, slug: finalSlug, name: args.agencyName, contact: args.contact, email,
      status: 'ACTIVE', markupPct: 15, primaryColor: '#0369A1', accentColor: '#C9A24A',
    },
  });
  const passwordHash = await bcrypt.hash(args.password, 10);
  const user = await db.user.create({
    data: { email, name: args.name, passwordHash, role: 'AGENCY_OWNER', agencyId: agency.id },
  });

  const s = await getSession();
  s.userId = user.id; s.agencyId = agency.id; s.role = 'AGENCY_OWNER'; s.email = user.email; s.name = user.name ?? undefined;
  await s.save();

  return { ok: true };
}

export async function logoutAction() {
  await destroySession();
  redirect('/login');
}
