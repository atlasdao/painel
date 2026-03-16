'use client';

import { useRouter } from 'next/navigation';
import { User, Shield, Users, Gift, Code, Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { TrustScoreCard } from '@/components/menu/TrustScoreCard';

const menuItems = [
  { icon: User, label: 'Perfil', href: '/dash/menu/perfil' },
  { icon: Shield, label: 'Segurança', href: '/dash/menu/seguranca' },
  { icon: Users, label: 'Equipe', href: '/dash/collaborators' },
  { icon: Gift, label: 'Indicações', href: '/dash/referral' },
  { icon: Code, label: 'Desenvolvedor', href: '/dash/api-keys' },
];

export default function MenuPage() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('atlas-theme', next ? 'dark' : 'light');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Menu</h1>

      <TrustScoreCard />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {menuItems.map((item) => (
          <button
            key={item.label}
            onClick={() => router.push(item.href)}
            className="atlas-card flex flex-col items-center justify-center gap-2 py-6 cursor-pointer"
            style={{ minHeight: 100 }}
          >
            <item.icon size={24} style={{ color: 'var(--text-secondary)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {item.label}
            </span>
          </button>
        ))}

        <button
          onClick={toggleTheme}
          className="atlas-card flex flex-col items-center justify-center gap-2 py-6 cursor-pointer"
          style={{ minHeight: 100 }}
        >
          {isDark ? <Sun size={24} style={{ color: 'var(--text-secondary)' }} /> : <Moon size={24} style={{ color: 'var(--text-secondary)' }} />}
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {isDark ? 'Tema Claro' : 'Tema Escuro'}
          </span>
        </button>
      </div>
    </div>
  );
}
