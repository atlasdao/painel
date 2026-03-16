'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TransactionsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dash/vendas?tab=activity');
  }, [router]);

  return (
    <div className="min-h-[calc(100vh-6rem)] bg-[var(--bg-primary)] flex items-center justify-center -m-6">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--accent)] mx-auto mb-4"></div>
        <p className="text-[var(--text-muted)] text-sm">Redirecionando...</p>
      </div>
    </div>
  );
}
