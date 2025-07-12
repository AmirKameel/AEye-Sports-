import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // All routes are protected except for home, auth pages, and static assets
  const publicRoutes = ['/', '/auth/signin', '/auth/signup'];
  const isStaticAsset = req.nextUrl.pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|css|js)$/);
  const isApiRoute = req.nextUrl.pathname.startsWith('/api/');
  const isPublicRoute = publicRoutes.includes(req.nextUrl.pathname) || isStaticAsset || isApiRoute;

  if (!isPublicRoute && !session) {
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  }

  // If user is signed in and trying to access auth pages, redirect to home
  if (session && req.nextUrl.pathname.startsWith('/auth/')) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};