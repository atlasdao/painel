'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dash');
  }, [router]);
  return null;
}
