'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { authService } from '@/app/lib/auth';
import { User } from '@/app/types';
import { UserRole, isAdmin } from '@/app/types/user-role';
import {
  Home,
  ArrowDownLeft,
  History,
  Settings,
  Users,
  Activity,
  Shield,
  LogOut,
  Menu,
  X,
  Key,
  Link as LinkIcon,
  FileText,
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        router.push('/login');
      } else {
        setUser(currentUser);
      }
    };
    loadUser();
  }, [router]);

  const handleLogout = async () => {
    await authService.logout();
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Depósitos', href: '/deposit', icon: ArrowDownLeft },
    { name: 'Transações', href: '/transactions', icon: History },
    { name: 'API', href: '/api', icon: Key },
    { name: 'Links de Pagamento', href: '/payment-links', icon: LinkIcon },
    { name: 'Configurações', href: '/settings', icon: Settings },
  ];

  const adminNavigation = [
    { name: 'Usuários', href: '/admin/users', icon: Users },
    { name: 'Solicitações API', href: '/admin/api-requests', icon: Key },
    { name: 'Todas Transações', href: '/admin/transactions', icon: Activity },
    { name: 'Auditoria', href: '/admin/audit', icon: FileText },
    { name: 'Sistema', href: '/admin/system', icon: Shield },
  ];

  const isActive = (href: string) => pathname === href;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-800 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Image
              src="/atlas-logo.jpg"
              alt="Atlas Logo"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <span className="text-xl font-bold text-white">Atlas Panel</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <nav className="mt-8 px-4">
          <div className="space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive(item.href)
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
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
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive(item.href)
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </nav>

        {/* User info and logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">
                  {user.username[0].toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  {user.username}
                </p>
                <p className="text-xs text-gray-400">{user.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top bar */}
        <div className="h-16 bg-gray-800 shadow-lg flex items-center px-6 border-b border-gray-700">
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

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}