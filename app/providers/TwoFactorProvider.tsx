'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authService } from '@/app/lib/auth';
import Modal2FAPeriodicCheck from '@/app/components/Modal2FAPeriodicCheck';
import Cookies from 'js-cookie';

interface TwoFactorContextType {
  requiresVerification: boolean;
  lastVerified: string | null;
  checkVerification: () => Promise<void>;
}

const TwoFactorContext = createContext<TwoFactorContextType | undefined>(undefined);

export function useTwoFactor() {
  const context = useContext(TwoFactorContext);
  if (context === undefined) {
    throw new Error('useTwoFactor must be used within a TwoFactorProvider');
  }
  return context;
}

interface TwoFactorProviderProps {
  children: ReactNode;
}

export function TwoFactorProvider({ children }: TwoFactorProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [lastVerified, setLastVerified] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  // Public paths that don't require 2FA check
  const publicPaths = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/verify-2fa',
    '/verify-email',
    '/',
    '/termos',
    '/privacidade',
    '/status',
  ];

  const isPublicPath = publicPaths.some(path => pathname?.startsWith(path));

  const checkVerification = useCallback(async () => {
    // Don't check if already checking or on public paths
    if (isChecking || isPublicPath) return;

    // Don't check if not authenticated
    const token = Cookies.get('access_token');
    if (!token) return;

    setIsChecking(true);

    try {
      const response = await authService.checkPeriodicVerification();
      setRequiresVerification(response.requiresVerification);
      setLastVerified(response.lastVerified || null);
    } catch (error) {
      console.error('[2FA Provider] Error checking periodic verification:', error);
      // Don't show modal on error, just log it
    } finally {
      setIsChecking(false);
    }
  }, [isChecking, isPublicPath]);

  // Check on mount and when pathname changes (but not on public paths)
  useEffect(() => {
    if (!isPublicPath) {
      checkVerification();
    }
  }, [pathname, isPublicPath, checkVerification]);

  // Check every 5 minutes while the app is active
  useEffect(() => {
    if (isPublicPath) return;

    const interval = setInterval(() => {
      checkVerification();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [isPublicPath, checkVerification]);

  // Handle visibility change (when user comes back to tab)
  useEffect(() => {
    if (isPublicPath) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVerification();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isPublicPath, checkVerification]);

  const handleVerificationSuccess = () => {
    setRequiresVerification(false);
    setLastVerified(new Date().toISOString());
  };

  const handleLogout = () => {
    authService.logout();
    router.push('/login');
  };

  return (
    <TwoFactorContext.Provider value={{ requiresVerification, lastVerified, checkVerification }}>
      {children}

      {/* Modal de verificação periódica */}
      <Modal2FAPeriodicCheck
        isOpen={requiresVerification && !isPublicPath}
        onSuccess={handleVerificationSuccess}
        onLogout={handleLogout}
        lastVerified={lastVerified || undefined}
      />
    </TwoFactorContext.Provider>
  );
}
