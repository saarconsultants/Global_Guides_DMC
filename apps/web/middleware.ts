import { NextResponse, type NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, type SessionPayload } from '@/lib/auth/session';

// Routes that DO NOT require auth.
const PUBLIC_PREFIXES = ['/login', '/signup', '/logout', '/p/', '/invite/', '/api/public', '/widget/', '/_next', '/favicon', '/manifest', '/static', '/brand/'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const res = NextResponse.next();
  const session = await getIronSession<SessionPayload>(req as any, res as any, sessionOptions);
  if (!session.userId) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  // Admin guard
  if (pathname.startsWith('/admin') && session.role !== 'SUPER_ADMIN') {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }
  // Root → dashboard (or /admin for super-admin)
  if (pathname === '/') {
    const url = req.nextUrl.clone();
    url.pathname = session.role === 'SUPER_ADMIN' ? '/admin' : '/dashboard';
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = {
  // Run on everything except internal Next routes & static assets
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
