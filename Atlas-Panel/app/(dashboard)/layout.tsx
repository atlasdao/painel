'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { authService } from '@/app/lib/auth';
import { profileService } from '@/app/lib/services';
import api from '@/app/lib/api';
import { User } from '@/app/types';
import { UserRole, isAdmin } from '@/app/types/user-role';
import ProfileDropdown from '@/components/ProfileDropdown';
import AccountSwitcher from '@/components/AccountSwitcher';
import DonationModal from '@/app/components/DonationModal';
import CommunityFooter from '@/components/CommunityFooter';
import SupportWidget from '@/app/components/SupportWidget';
import { TwoFactorProvider } from '@/app/providers/TwoFactorProvider';
import {
  Home,
  ArrowUpRight,
  History,
  Settings,
  Users,
  Activity,
  Shield,
  LogOut,
  X,
  FileText,
  Tag,
  ChevronDown,
  Camera,
  Store,
  Gift,
  Wallet,
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const hasFetchedUser = useRef(false);

  const loadUser = async () => {
    setIsLoading(true);

    try {
      const currentUser = await profileService.getProfile();

      if (!currentUser) {
        router.push('/login');
        return;
      }

      setUser({
        ...currentUser,
        profilePicture: currentUser.profilePicture || null
      });

      setIsLoading(false);

      const expectedPath = authService.getRedirectDestination(currentUser);
      const currentPath = pathname;

      const isMainDashboardPage = currentPath === '/dashboard' || currentPath === '/commerce';
      const needsRedirect = isMainDashboardPage && currentPath !== expectedPath;

      if (needsRedirect && hasFetchedUser.current === false) {
        if (currentPath === '/dashboard' && expectedPath === '/commerce') {
          router.push('/commerce');
        } else if (currentPath === '/commerce' && expectedPath === '/dashboard') {
          router.push('/dashboard');
        }
      }

      if (isAdmin(currentUser.role)) {
        setTimeout(() => loadPendingRequests(), 100);
      }
    } catch (error) {
      console.error('[LAYOUT] Error loading user:', error);
      authService.logout();
    }
  };

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      console.log('[LAYOUT] No valid token found, redirecting to login');
      authService.logout();
      return;
    }

    if (hasFetchedUser.current) return;
    hasFetchedUser.current = true;

    loadUser();
  }, []);

  useEffect(() => {
    const handleFocus = () => {
      if (!hasFetchedUser.current) return;

      const lastFocusTime = localStorage.getItem('lastWindowFocus');
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      if (!lastFocusTime || (now - parseInt(lastFocusTime)) > fiveMinutes) {
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

  useEffect(() => {
    if (!hasFetchedUser.current) return;

    const isLeavingSettings = pathname !== '/settings' && document.referrer?.includes('/settings');
    const isGoingToMainDashboard = pathname === '/dashboard' || pathname === '/commerce';

    if (isLeavingSettings && isGoingToMainDashboard) {
      loadUser();
    }
  }, [pathname]);

  useEffect(() => {
    if (!user || !isAdmin(user.role)) return;

    const interval = setInterval(loadPendingRequests, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const loadPendingRequests = async () => {
    try {
      const [withdrawalsRes, apiRequestsRes] = await Promise.all([
        api.get('/withdrawals/admin/pending'),
        api.get('/api-key-requests?status=PENDING'),
      ]);

      const totalPending = (withdrawalsRes.data?.length || 0) +
                          (apiRequestsRes.data?.length || 0);
      setPendingRequests(totalPending);
    } catch (error) {
      console.error('Error loading pending requests:', error);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Transações', href: '/transactions', icon: History },
    { name: 'Carteira', href: '/wallet', icon: Wallet },
    { name: 'Comércio', href: '/commerce', icon: Store },
    { name: 'Configurações', href: '/settings', icon: Settings },
  ];

  const adminNavigation = [
    { name: 'Usuarios', href: '/admin/users', icon: Users },
    { name: 'Transacoes', href: '/admin/transactions', icon: Activity },
    { name: 'Saques', href: '/withdrawals', icon: ArrowUpRight },
    { name: 'Solicitacoes', href: '/admin/requests', icon: FileText },
    { name: 'Marketing', href: '/admin/marketing', icon: Tag },
    { name: 'Sistema', href: '/admin/system', icon: Shield },
  ];

  const isActive = (href: string) => pathname === href;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)]">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-[var(--border-default)] border-t-[var(--accent)] mx-auto mb-4"></div>
            <p className="text-[var(--text-muted)] text-sm">Carregando...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <TwoFactorProvider>
    <div className="min-h-screen bg-[var(--bg-primary)]">

      {/* Desktop Sidebar (lg+) */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-56 bg-[var(--bg-secondary)] border-r border-[var(--border-default)]">
        {/* Logo */}
        <div className="flex items-center gap-3 h-14 px-5 border-b border-[var(--border-default)]">
          <Image
            src="/atlas-logo.jpg"
            alt="Atlas Logo"
            width={32}
            height={32}
            className="rounded-lg"
          />
          <span className="text-base font-bold text-[var(--text-primary)]">Atlas</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-0.5">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                <item.icon className="w-[18px] h-[18px]" />
                <span>{item.name}</span>
              </Link>
            ))}
          </div>

          {isAdmin(user.role) && (
            <>
              <div className="mt-6 mb-2 px-3">
                <h3 className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Admin
                </h3>
              </div>
              <div className="space-y-0.5">
                {adminNavigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.href) ||
                      (item.href === '/admin/requests' && (isActive('/admin/withdrawals') || isActive('/admin/api-requests'))) ||
                      (item.href === '/admin/marketing' && isActive('/admin/coupons')) ||
                      (item.href === '/admin/system' && isActive('/admin/audit'))
                        ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    <item.icon className="w-[18px] h-[18px]" />
                    <span>{item.name}</span>
                    {item.href === '/admin/requests' && pendingRequests > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {pendingRequests}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </>
          )}
        </nav>

        {/* User info */}
        <div className="p-3 border-t border-[var(--border-default)]">
          <div className="flex items-center justify-between">
            <Link
              href="/settings"
              className="flex items-center gap-2.5 hover:bg-[var(--bg-hover)] rounded-lg p-2 -m-1 transition-colors flex-1 min-w-0"
            >
              <div className="relative group cursor-pointer flex-shrink-0">
                {user.profilePicture ? (
                  <div className="w-8 h-8 rounded-full overflow-hidden">
                    <Image
                      src={user.profilePicture}
                      alt="Profile"
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-[var(--accent)] rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-semibold">
                      {user.username[0].toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                {user.username}
              </span>
            </Link>
            <button
              onClick={handleLogout}
              className="text-[var(--text-muted)] hover:text-red-500 transition-colors p-1.5 hover:bg-[var(--bg-hover)] rounded-lg flex-shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="lg:ml-56">
        {/* Top bar */}
        <header className="h-14 bg-[var(--bg-card)] border-b border-[var(--border-default)] flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
          {/* Mobile: Logo + title */}
          <div className="flex items-center gap-3 lg:hidden">
            <Image
              src="/atlas-logo.jpg"
              alt="Atlas"
              width={28}
              height={28}
              className="rounded-lg"
            />
            <span className="text-sm font-bold text-[var(--text-primary)]">Atlas</span>
          </div>

          {/* Desktop: Page title */}
          <h1 className="hidden lg:block text-base font-semibold text-[var(--text-primary)]">
            {isAdmin(user.role) ? 'Painel Administrativo' : 'Painel do Usuario'}
          </h1>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Referral */}
            <Link
              href="/referral"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/15 text-amber-500 font-medium rounded-lg transition-colors text-xs border border-amber-500/20"
              title="Programa de Indicacao"
            >
              <Gift className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ganhe ate R$ 150</span>
              <span className="sm:hidden">R$ 150</span>
            </Link>

            {/* Account Switcher */}
            <AccountSwitcher
              currentUser={{ id: user.id, username: user.username }}
              onAccountSwitch={loadUser}
            />

            {/* Desktop Profile Dropdown */}
            <div className="hidden lg:block relative">
              <button
                ref={profileButtonRef}
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
              >
                {(user as any).profilePicture ? (
                  <div className="w-7 h-7 rounded-full overflow-hidden">
                    <Image
                      src={(user as any).profilePicture}
                      alt="Profile"
                      width={28}
                      height={28}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-7 h-7 bg-[var(--accent)] rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-semibold">
                      {user.username[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="text-sm font-medium text-[var(--text-primary)]">{user.username}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <ProfileDropdown
                isOpen={profileDropdownOpen}
                onClose={() => setProfileDropdownOpen(false)}
                buttonRef={profileButtonRef as React.RefObject<HTMLButtonElement>}
                user={user}
                onLogout={handleLogout}
              />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="px-4 py-5 sm:px-6 lg:px-8 pb-24 lg:pb-6 min-h-[calc(100vh-3.5rem)]">
          {children}
        </main>

        {/* Community Footer - desktop only */}
        <div className="hidden lg:block">
          <CommunityFooter />
        </div>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-card)]/80 backdrop-blur-xl border-t border-[var(--border-default)]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-center justify-around h-14">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-0 min-h-[44px] px-1.5 transition-colors ${
                isActive(item.href)
                  ? 'text-[var(--accent)]'
                  : 'text-[var(--text-muted)]'
              }`}
            >
              <item.icon className="w-5 h-5" strokeWidth={isActive(item.href) ? 2.25 : 1.75} />
              <span className="text-[10px] font-medium leading-none">{item.name}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Donation Modal */}
      <DonationModal
        isOpen={showDonationModal}
        onClose={() => setShowDonationModal(false)}
      />

      {/* Support Widget */}
      <SupportWidget context="logged" />
    </div>
    </TwoFactorProvider>
  );
}
