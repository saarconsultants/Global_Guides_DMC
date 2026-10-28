import { NextResponse, type NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, type SessionPayload } from '@/lib/auth/session-options';

// Routes that DO NOT require auth (anyone can open them):
//   /login, /signup, /logout            sign-in pages
//   /p/<token>                          customer proposal links
//   /invite/<token>                     team invite links
//   /widget/<slug>                      agency website widget
//   /api/public/*                       public API used by the widget
//   /_next, /favicon, /manifest, /static, /brand/   framework + static assets
const PUBLIC_PREFIXES = ['/login', '/signup', '/logout', '/p/', '/invite/', '/api/public', '/widget/', '/_next', '/favicon', '/manifest', '/static', '/brand/'];

// Top-level sections of the signed-in app. Everything under these (and "/")
// requires a session. Keep in sync with the folders in app/ — when you add a
// new top-level section, add it here or it will show the 404 page to
// signed-out visitors instead of redirecting them to sign in.
const APP_SECTIONS = new Set([
  'dashboard', 'activities', 'admin', 'api', 'bookings', 'flights', 'holidays', 'hotels',
  'itinerary', 'leads', 'marketing', 'proposals', 'settings', 'statement', 'suggested', 'team',
]);

function isAppRoute(pathname: string): boolean {
  if (pathname === '/') return true;
  const first = pathname.split('/')[1] ?? '';
  return APP_SECTIONS.has(first);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const res = NextResponse.next();
  const session = await getIronSession<SessionPayload>(req as any, res as any, sessionOptions);
  if (!session.userId) {
    // Unknown URLs (not an app section) fall through to app/not-found.tsx
    // instead of bouncing a signed-out visitor to the sign-in page.
    if (!isAppRoute(pathname)) return res;
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
  // Public routes (login, the customer proposal page, invites, widget, public API)
  // are excluded here as well, so they skip the middleware invocation entirely.
  // PUBLIC_PREFIXES above stays as the in-function guard.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|login|signup|logout|p/|invite/|api/public|widget/|brand/|.*\\..*).*)'],
};
