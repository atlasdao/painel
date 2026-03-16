'use client';

import { TopBar } from './TopBar';
import { User } from '@/app/types';

interface AppShellProps {
  user: User | null;
  children: React.ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  return (
    <div className="flex flex-col min-h-screen" style={{ minHeight: '100dvh' }}>
      <TopBar user={user} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
