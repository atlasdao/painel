'use client';

import { useState } from 'react';

export default function Home() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 safe-top safe-bottom"
      style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

      <main className="flex flex-col items-center text-center max-w-md w-full animate-slide-up">
        {/* Logo */}
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3">
          Conta Atlas
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl mb-8" style={{ color: 'var(--text-secondary)' }}>
          Sua conta financeira digital
        </p>

        {/* Em Breve badge */}
        <span className="atlas-badge atlas-badge-neutral text-sm font-semibold px-4 py-1.5 mb-10">
          Em Breve
        </span>

        {/* Email form */}
        {!submitted ? (
          <form onSubmit={handleSubmit} className="w-full flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              className="atlas-input flex-1"
            />
            <button type="submit" className="atlas-btn whitespace-nowrap">
              Notifique-me
            </button>
          </form>
        ) : (
          <div className="w-full atlas-card text-center">
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
              Pronto! Vamos te avisar.
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              {email}
            </p>
          </div>
        )}

        {/* PWA install hint */}
        <p className="text-xs mt-8" style={{ color: 'var(--text-muted)' }}>
          Adicione ao seu celular: Menu &rarr; &ldquo;Adicionar à tela inicial&rdquo;
        </p>
      </main>

      {/* Footer */}
      <footer className="absolute bottom-6 text-xs" style={{ color: 'var(--text-muted)' }}>
        Atlas DAO
      </footer>
    </div>
  );
}
