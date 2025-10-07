import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('access_token');
  const userCookie = request.cookies.get('user');

  console.log('Middleware - pathname:', pathname);
  console.log('Middleware - accessToken:', accessToken ? 'EXISTS' : 'NOT FOUND');
  console.log('Middleware - userCookie:', userCookie ? 'EXISTS' : 'NOT FOUND');

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/verify-2fa'];
  const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith('/pay/');
  
  // Auth routes that should redirect logged-in users
  const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];
  const isAuthRoute = authRoutes.includes(pathname);

  // Admin-only routes
  const adminRoutes = pathname.startsWith('/admin');

  console.log('Middleware - isPublicRoute:', isPublicRoute);
  console.log('Middleware - isAuthRoute:', isAuthRoute);
  console.log('Middleware - adminRoutes:', adminRoutes);

  // Check if user is authenticated
  if (!accessToken && !isPublicRoute) {
    console.log('Middleware - Redirecting to login (no token)');
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Only redirect authenticated users away from auth routes (login, register, etc)
  // But allow them to access home page (/) and payment pages (/pay/*)
  if (accessToken && isAuthRoute) {
    // Check user's commerce mode to determine redirect destination
    let redirectUrl = '/dashboard'; // default

    if (userCookie) {
      try {
        const user = JSON.parse(userCookie.value);
        console.log('Middleware - User commerce mode:', user.commerceMode);
        if (user.commerceMode) {
          redirectUrl = '/commerce';
          console.log('Middleware - Redirecting commerce user to /commerce');
        }
      } catch (error) {
        console.log('Middleware - Error parsing user cookie:', error);
      }
    }

    return NextResponse.redirect(new URL(redirectUrl, request.url));
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