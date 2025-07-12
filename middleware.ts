import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  // Create Supabase client with the provided credentials
  const supabaseUrl = 'https://qfxlsyjfvdwckbmhuzzb.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmeGxzeWpmdmR3Y2tibWh1enpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3ODI3NDgsImV4cCI6MjA2NzM1ODc0OH0.LkHO75K9nIcEyz1MSkuK3MMeeYdL-PwLbHK7RJPgCa4';
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get the auth cookie
  const authCookie = req.cookies.get('sb-auth-token')?.value;
  
  // Check if user is authenticated
  let isAuthenticated = false;
  if (authCookie) {
    try {
      const { data, error } = await supabase.auth.getUser(authCookie);
      isAuthenticated = !error && !!data.user;
    } catch (error) {
      console.error('Auth error:', error);
    }
  }

  // Public paths that don't require authentication
  const publicPaths = ['/', '/auth/signin', '/auth/signup'];
  const isPublicPath = publicPaths.includes(req.nextUrl.pathname);

  // If user is not signed in and the current path is a protected route, redirect to sign in
  const protectedRoutes = ['/football', '/tennis', '/profile', '/dashboard'];
  const isProtectedRoute = protectedRoutes.some(route => 
    req.nextUrl.pathname.startsWith(route)
  );

  if (isProtectedRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  }

  // If user is signed in and trying to access auth pages, redirect to home
  if (isAuthenticated && req.nextUrl.pathname.startsWith('/auth/')) {
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