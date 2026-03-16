import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('access_token');
  const userCookie = request.cookies.get('user');

  // Public routes
  const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/verify-2fa'];
  const isPublicRoute = publicRoutes.includes(pathname) ||
    pathname.startsWith('/pay/') ||
    pathname.startsWith('/payment-confirmation/') ||
    pathname.startsWith('/invite/');

  // Auth routes — redirect logged-in users
  const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];
  const isAuthRoute = authRoutes.includes(pathname);

  // Admin routes
  const isAdminRoute = pathname.startsWith('/dash/admin');

  // Not authenticated → login
  if (!accessToken && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Authenticated on auth route → dash
  if (accessToken && isAuthRoute) {
    let redirectUrl = '/dash';
    if (userCookie) {
      try {
        const user = JSON.parse(userCookie.value);
        if (user.commerceMode) {
          redirectUrl = '/dash/commerce';
        }
      } catch { /* ignore */ }
    }
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  // Admin access check
  if (isAdminRoute && userCookie) {
    try {
      const user = JSON.parse(userCookie.value);
      const isAdmin = user.roles?.includes('ADMIN') || user.role === 'ADMIN';
      if (!isAdmin) {
        return NextResponse.redirect(new URL('/dash', request.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|atlas-logo.jpg|robots.txt|manifest.json|sw.js|icon-192.svg|icon-512.svg).*)',
  ],
};
