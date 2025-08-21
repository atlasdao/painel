import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('access_token');
  const userCookie = request.cookies.get('user');

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/reset-password'];
  const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith('/pay/');
  
  // Auth routes that should redirect logged-in users
  const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];
  const isAuthRoute = authRoutes.includes(pathname);

  // Admin-only routes
  const adminRoutes = pathname.startsWith('/admin');

  // Check if user is authenticated
  if (!accessToken && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Only redirect authenticated users away from auth routes (login, register, etc)
  // But allow them to access home page (/) and payment pages (/pay/*)
  if (accessToken && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Check admin access
  if (adminRoutes && userCookie) {
    try {
      const user = JSON.parse(userCookie.value);
      const isAdmin = user.roles?.includes('ADMIN') || user.role === 'ADMIN';
      if (!isAdmin) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|atlas-logo.jpg).*)',
  ],
};