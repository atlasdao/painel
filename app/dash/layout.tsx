'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/app/lib/auth';
import { User } from '@/app/types';
import { TopBar } from '@/components/layout/TopBar';
import { BottomTabBar } from '@/components/layout/BottomTabBar';
import { DesktopSidebar } from '@/components/layout/DesktopSidebar';
import { ScanModal } from '@/components/layout/ScanModal';
import { PwaInstallPrompt } from '@/components/layout/PwaInstallPrompt';
import { QueryProvider } from '@/app/providers/QueryProvider';

export default function DashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scanOpen, setScanOpen] = useState(false);
  const hasFetchedUser = useRef(false);

  const loadUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();

      if (!currentUser) {
        router.push('/login');
        return;
      }

      setUser({
        ...currentUser,
        profilePicture: currentUser.profilePicture || null,
      });
    } catch (error) {
      console.error('[DASH LAYOUT] Error loading user:', error);
      authService.logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      authService.logout();
      return;
    }

    if (hasFetchedUser.current) return;
    hasFetchedUser.current = true;

    loadUser();
  }, []);

  // Refresh user when window regains focus (5 min cooldown)
  useEffect(() => {
    const handleFocus = () => {
      if (!hasFetchedUser.current) return;

      const lastFocusTime = localStorage.getItem('lastWindowFocus');
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      if (!lastFocusTime || now - parseInt(lastFocusTime) > fiveMinutes) {
        localStorage.setItem('lastWindowFocus', now.toString());
        loadUser();
      }
    };

    const handleProfileUpdate = () => {
      loadUser();
    };

    localStorage.setItem('lastWindowFocus', Date.now().toString());

    window.addEventListener('focus', handleFocus);
    window.addEventListener('profileUpdated', handleProfileUpdate);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div
              className="animate-spin rounded-full h-10 w-10 border-2 mx-auto mb-4"
              style={{
                borderColor: 'var(--border-default)',
                borderTopColor: 'var(--accent)',
              }}
            />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Carregando...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <QueryProvider>
      <div
        className="min-h-screen flex flex-col md:flex-row"
        style={{ background: 'var(--bg-primary)' }}
      >
        {/* Desktop Sidebar (md+) */}
        <DesktopSidebar user={user} onScanOpen={() => setScanOpen(true)} />

        {/* Main content column */}
        <div className="flex-1 flex flex-col min-h-screen">
          {/* TopBar */}
          <TopBar user={user} />

          {/* Page content */}
          <main className="flex-1 px-4 py-5 sm:px-6 md:px-8 pb-24 md:pb-6">
            {children}
          </main>
        </div>

        {/* Mobile Bottom Tab Bar */}
        <BottomTabBar onScanOpen={() => setScanOpen(true)} />

        {/* Scan Modal */}
        <ScanModal open={scanOpen} onClose={() => setScanOpen(false)} />

        {/* PWA Install Prompt */}
        <PwaInstallPrompt />
      </div>
    </QueryProvider>
  );
}
