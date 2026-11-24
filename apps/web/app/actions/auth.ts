'use server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db/client';
import { getSession, destroySession } from '@/lib/auth/session';
import { requireActor } from '@/lib/auth/ctx';
import { redirect } from 'next/navigation';
import { randomInt } from 'node:crypto';
import { emailIsLive, sendEmail } from '@/lib/email/resend';

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
  // One message for both cases, so the form can't be used to find out which emails have accounts.
  const WRONG = 'That email and password don\u2019t match. Check both and try again.';
  if (!user || !user.passwordHash) return { ok: false, error: WRONG };
  const ok = await bcrypt.compare(args.password, user.passwordHash);
  if (!ok) return { ok: false, error: WRONG };
  if (user.agency && user.agency.status === 'SUSPENDED') return { ok: false, error: SUSPENDED };
  return startSession(user);
}

const SUSPENDED = 'Your agency is suspended. Contact the platform admin.';

async function startSession(user: { id: string; agencyId: string | null; role: string; email: string; name: string | null }): Promise<{ ok: true; redirectTo: string }> {
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

// ── Sign-in with a 6-digit code sent by email ──
const CODE_TTL_MS = 10 * 60_000;
const CODE_MAX_TRIES = 5;
// shortcut: limits are per email address, not per IP; add an IP limit if codes are ever sprayed across many emails.
const RESEND_GAP_MS = 60_000;
const CODES_PER_HOUR = 5;

/** Emails a sign-in code. Answers the same whether or not the email has an account. */
export async function requestLoginCodeAction(args: { email: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = args.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Enter a valid email address.' };
  const live = emailIsLive();
  if (!live && process.env.NODE_ENV === 'production') return { ok: false, error: 'Sign-in by email code isn\u2019t switched on yet. Use your password.' };

  await db.loginCode.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 86_400_000) } } });   // housekeeping
  const recent = await db.loginCode.findMany({ where: { email, createdAt: { gt: new Date(Date.now() - 3600_000) } }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } });
  if (recent[0] && Date.now() - recent[0].createdAt.getTime() < RESEND_GAP_MS) return { ok: false, error: 'A code was just sent. Wait a minute before asking for another.' };
  if (recent.length >= CODES_PER_HOUR) return { ok: false, error: 'Too many codes asked for this email. Try again in an hour, or use your password.' };

  // A row even for unknown emails, so the limits above answer the same for every address.
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  await db.loginCode.create({ data: { email, codeHash: await bcrypt.hash(code, 8), expiresAt: new Date(Date.now() + CODE_TTL_MS) } });
  const user = await db.user.findUnique({ where: { email }, include: { agency: true } });
  if (!user || user.agency?.status === 'SUSPENDED') return { ok: true };   // no account: send nothing, say nothing
  if (!live) { console.log(`[login-code] DEV ONLY, no RESEND_API_KEY: code for ${email} is ${code}`); return { ok: true }; }
  try {
    await sendEmail({
      to: email,
      subject: `${code} is your Global Guides sign-in code`,
      text: `Your Global Guides DMC sign-in code is ${code}.\n\nIt works for 10 minutes. If you didn't ask for it, ignore this email: nobody can sign in without the code.`,
      html: `<div style="font-family:Arial,sans-serif;color:#111"><p>Your Global Guides DMC sign-in code is</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px;margin:12px 0">${code}</p><p>It works for 10 minutes. If you didn't ask for it, ignore this email: nobody can sign in without the code.</p></div>`,
    });
  } catch {
    return { ok: false, error: 'The email could not be sent. Try again in a minute, or use your password.' };
  }
  return { ok: true };
}

export async function verifyLoginCodeAction(args: { email: string; code: string }): Promise<{ ok: true; redirectTo: string } | { ok: false; error: string }> {
  const email = args.email.trim().toLowerCase();
  const code = args.code.replace(/\D/g, '');
  const WRONG = 'That code is wrong or has expired. Check it, or ask for a new one.';
  const row = await db.loginCode.findFirst({ where: { email, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } });
  if (!row || code.length !== 6) return { ok: false, error: WRONG };
  // Count the try before checking, so parallel guesses can't skip the limit.
  const { attempts } = await db.loginCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } }, select: { attempts: true } });
  if (attempts > CODE_MAX_TRIES) return { ok: false, error: 'Too many wrong tries. Ask for a new code.' };
  if (!(await bcrypt.compare(code, row.codeHash))) return { ok: false, error: WRONG };

  await db.loginCode.deleteMany({ where: { email } });
  const user = await db.user.findUnique({ where: { email }, include: { agency: true } });
  if (!user) return { ok: false, error: WRONG };
  if (user.agency && user.agency.status === 'SUSPENDED') return { ok: false, error: SUSPENDED };
  return startSession(user);
}

/** Any signed-in user changes their own password; the current one must be right. */
// Returns a result instead of throwing: thrown messages are hidden from the browser in production.
export async function changeOwnPasswordAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const actor = await requireActor();
  const current = String(formData.get('current') ?? '');
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');
  if (password.length < 8) return { ok: false, error: 'The new password must be at least 8 characters.' };
  if (password !== confirm) return { ok: false, error: "The two new passwords don't match." };
  if (password === current) return { ok: false, error: 'The new password must be different from the current one.' };
  const user = await db.user.findUnique({ where: { id: actor.userId }, select: { passwordHash: true } });
  if (!user?.passwordHash || !(await bcrypt.compare(current, user.passwordHash))) {
    return { ok: false, error: 'Your current password is not right.' };
  }
  await db.user.update({ where: { id: actor.userId }, data: { passwordHash: await bcrypt.hash(password, 10) } });
  return { ok: true };
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
