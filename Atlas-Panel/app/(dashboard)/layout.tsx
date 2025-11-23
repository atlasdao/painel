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
import DonationModal from '@/app/components/DonationModal';
import {
  Home,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  Settings,
  Users,
  Activity,
  Shield,
  LogOut,
  Menu,
  X,
  Key,
  FileText,
  Tag,
  ChevronDown,
  UserCircle,
  Camera,
  Store,
  Heart,
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

  // Function to reload user data
  const loadUser = async () => {
    setIsLoading(true);

    try {
      // Use profileService for consistent data source with settings page
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

      // Check if user should be redirected based on commerce mode
      // ONLY redirect on initial load, not on every user data refresh
      const expectedPath = authService.getRedirectDestination(currentUser);
      const currentPath = pathname;


      // Only redirect if we're on the wrong main dashboard page AND this is the initial load
      const isMainDashboardPage = currentPath === '/dashboard' || currentPath === '/commerce';
      const needsRedirect = isMainDashboardPage && currentPath !== expectedPath;

      if (needsRedirect && hasFetchedUser.current === false) {
        if (currentPath === '/dashboard' && expectedPath === '/commerce') {
          router.push('/commerce');
        } else if (currentPath === '/commerce' && expectedPath === '/dashboard') {
          router.push('/dashboard');
        }
      } else if (needsRedirect) {
      }

      // Load pending requests for admins in background (after UI loads)
      if (isAdmin(currentUser.role)) {
        setTimeout(() => loadPendingRequests(), 100);
      }
    } catch (error) {
      console.error('[LAYOUT] Error loading user:', error);
      // Don't set loading to false immediately to prevent white screen
      // Keep showing loading spinner while redirecting
      authService.logout();
    }
  };

  // Load user on mount
  useEffect(() => {
    // Check if user is authenticated before making API calls
    if (!authService.isAuthenticated()) {
      console.log('[LAYOUT] No valid token found, redirecting to login');
      authService.logout();
      return;
    }

    // Prevent double fetching
    if (hasFetchedUser.current) return;
    hasFetchedUser.current = true;

    // Load immediately without delay
    loadUser();
  }, []); // Empty deps, run once

  // Listen for profile updates when navigating from settings
  useEffect(() => {
    const handleFocus = () => {
      // Only reload if window was focused for more than 5 minutes to avoid constant reloads
      if (!hasFetchedUser.current) return;

      const lastFocusTime = localStorage.getItem('lastWindowFocus');
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      if (!lastFocusTime || (now - parseInt(lastFocusTime)) > fiveMinutes) {
        localStorage.setItem('lastWindowFocus', now.toString());
        loadUser();
      } else {
      }
    };

    // Listen for custom event when profile is updated
    const handleProfileUpdate = () => {
      loadUser();
    };

    // Set initial focus time
    localStorage.setItem('lastWindowFocus', Date.now().toString());

    window.addEventListener('focus', handleFocus);
    window.addEventListener('profileUpdated', handleProfileUpdate);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, []);

  // Refresh user data when navigating away from settings page
  useEffect(() => {
    if (!hasFetchedUser.current) return;

    // Only refresh when navigating away from settings to a main dashboard page
    // Avoid refreshing on every navigation
    const isLeavingSettings = pathname !== '/settings' && document.referrer?.includes('/settings');
    const isGoingToMainDashboard = pathname === '/dashboard' || pathname === '/commerce';

    if (isLeavingSettings && isGoingToMainDashboard) {
      loadUser();
    }
  }, [pathname]);

  // Reload pending requests periodically for admins
  useEffect(() => {
    if (!user || !isAdmin(user.role)) return;

    const interval = setInterval(loadPendingRequests, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const loadPendingRequests = async () => {
    try {
      const [withdrawalsRes, apiRequestsRes, commerceRequestsRes, donationsRes] = await Promise.all([
        api.get('/withdrawals/admin/pending'),
        api.get('/api-key-requests?status=PENDING'),
        api.get('/admin/requests'), // Get all commerce applications
        api.get('/donations/admin/pending-count') // Get pending donations count
      ]);

      // Count commerce applications that need attention (only PENDING, as shown in the requests page)
      const pendingCommerceRequests = commerceRequestsRes.data?.data?.filter(
        (app: any) => app.status === 'PENDING'
      ).length || 0;

      const pendingDonations = donationsRes.data?.data?.pendingDonations || 0;

      const totalPending = (withdrawalsRes.data?.length || 0) +
                          (apiRequestsRes.data?.length || 0) +
                          pendingCommerceRequests +
                          pendingDonations;
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
    { name: 'Adquirir DePix', href: '/deposit', icon: ArrowDownLeft },
    { name: 'Transações', href: '/transactions', icon: History },
    { name: 'Modo Comércio', href: '/commerce', icon: Store },
    { name: 'Configurações', href: '/settings', icon: Settings },
  ];

  const adminNavigation = [
    { name: 'Usuários', href: '/admin/users', icon: Users },
    { name: 'Transações', href: '/admin/transactions', icon: Activity },
    { name: 'Saques', href: '/withdrawals', icon: ArrowUpRight },
    { name: 'Solicitações', href: '/admin/requests', icon: FileText },
    { name: 'Marketing', href: '/admin/marketing', icon: Tag },
    { name: 'Sistema', href: '/admin/system', icon: Shield },
  ];

  const isActive = (href: string) => pathname === href;

  // Show loading skeleton while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Carregando...</p>
          </div>
        </div>
      </div>
    );
  }

  // If no user after loading, show nothing (redirect will happen)
  if (!user) {
    return null;
  }

  // Render the full dashboard layout
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(to bottom right, rgb(17 24 39), rgb(31 41 55), rgb(17 24 39))' }}>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/10 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 backdrop-blur-xl bg-gray-800/50 shadow-2xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 border-r border-gray-700/50 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-700/50 bg-gray-900/30">
          <div className="flex items-center gap-3">
            <Image
              src="/atlas-logo.jpg"
              alt="Atlas Logo"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <span className="text-xl font-bold text-white">Painel Atlas</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 pb-20">
          <div className="mt-8 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                  isActive(item.href)
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            ))}
          </div>

          {isAdmin(user.role) && (
            <>
              <div className="mt-8 mb-2 px-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Administração
                </h3>
              </div>
              <div className="space-y-1">
                {adminNavigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                      isActive(item.href) ||
                      (item.href === '/admin/requests' && (isActive('/admin/withdrawals') || isActive('/admin/api-requests'))) ||
                      (item.href === '/admin/marketing' && isActive('/admin/coupons')) ||
                      (item.href === '/admin/system' && isActive('/admin/audit'))
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                        : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                    {item.href === '/admin/requests' && pendingRequests > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                        {pendingRequests}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </>
          )}
        </nav>

        {/* User info and logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700/50 bg-gray-900/30">
          <div className="flex items-center justify-between">
            <Link
              href="/settings"
              className="flex items-center gap-3 hover:bg-gray-700/30 rounded-lg p-2 -m-2 transition-colors flex-1"
            >
              <div className="relative group cursor-pointer">
                {user.profilePicture ? (
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                    <Image
                      src={user.profilePicture}
                      alt="Profile"
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white font-semibold">
                      {user.username[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">
                  {user.username}
                </p>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-gray-700/30 rounded-lg"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top bar */}
        <div className="h-16 backdrop-blur-xl bg-gray-800/50 shadow-lg flex items-center justify-between px-6 border-b border-gray-700/50">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden"
            >
              <Menu className="w-6 h-6 text-gray-300" />
            </button>
            <h1 className="ml-4 lg:ml-0 text-xl font-semibold text-white">
              {isAdmin(user.role) ? 'Painel Administrativo' : 'Painel do Usuário'}
            </h1>
          </div>

          {/* Mobile Donation Button */}
          <div className="lg:hidden flex items-center gap-2">
            <button
              onClick={() => setShowDonationModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-medium rounded-lg transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
              title="Fazer Doação"
            >
              <Heart className="w-4 h-4" />
              <span className="text-sm">Doar</span>
            </button>
          </div>

          {/* Profile Dropdown for Desktop */}
          <div className="hidden lg:flex items-center gap-3 relative">
            {/* Donation Button */}
            <button
              onClick={() => setShowDonationModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-medium rounded-lg transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
              title="Fazer Doação"
            >
              <Heart className="w-4 h-4" />
              <span className="text-sm">Doar</span>
            </button>
            <button
              ref={profileButtonRef}
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-700/50 transition-colors"
            >
              {(user as any).profilePicture ? (
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                  <Image
                    src={(user as any).profilePicture}
                    alt="Profile"
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">
                    {user.username[0].toUpperCase()}
                  </span>
                </div>
              )}
              <span className="text-white font-medium">{user.username}</span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
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

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>

      {/* Donation Modal */}
      <DonationModal
        isOpen={showDonationModal}
        onClose={() => setShowDonationModal(false)}
      />
    </div>
  );
}