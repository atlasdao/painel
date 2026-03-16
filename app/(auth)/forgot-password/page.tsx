'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, ArrowLeft, Loader, CheckCircle } from 'lucide-react';
import api from '@/app/lib/api';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error('Por favor, insira seu email');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', { email });
      setEmailSent(true);
      toast.success('Código enviado com sucesso!');
    } catch (error: any) {
      console.error('Forgot password error:', error);
      toast.error(error.response?.data?.message || 'Erro ao enviar código. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <>

        <div className="atlas-card">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-500/10 border-2 border-[var(--color-success)] rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-[var(--color-success)]" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Email Enviado!</h2>
            <p className="text-[var(--text-secondary)]">
              Verificamos sua caixa de entrada em <strong>{email}</strong>
            </p>

            <div className="p-4 bg-[var(--accent-soft)] border border-[var(--accent)]/20 rounded-lg">
              <p className="text-sm text-[var(--accent)]">
                Um código de 6 dígitos foi enviado para seu email
              </p>
            </div>

            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-sm text-amber-500">
                O código expira em 10 minutos
              </p>
            </div>

            <div className="pt-4 space-y-3">
              <button
                onClick={() => router.push(`/reset-password?email=${encodeURIComponent(email)}`)}
                className="atlas-btn w-full"
              >
                Inserir Código
              </button>

              <button
                onClick={() => {
                  setEmailSent(false);
                  setEmail('');
                }}
                className="atlas-btn-secondary w-full py-2.5 px-4 rounded-lg transition-colors"
              >
                Tentar Outro Email
              </button>
            </div>

            <div className="pt-4 border-t border-[var(--border-default)]">
              <p className="text-xs text-[var(--text-muted)]">
                Não recebeu o email? Verifique sua pasta de spam ou aguarde alguns minutos
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>

      <div className="atlas-card">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Esqueci minha senha</h2>
          <p className="text-[var(--text-secondary)] mt-2">
            Digite seu email para receber um código de recuperação
          </p>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[var(--text-secondary)]">
              Email
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                <Mail className="h-5 w-5 text-[var(--text-muted)]" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="atlas-input pl-10"
                placeholder="Digite seu email"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="atlas-btn w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader className="animate-spin w-4 h-4" />
                  Enviando...
                </>
              ) : (
                'Enviar Código'
              )}
            </button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--border-default)]" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[var(--bg-card)] text-[var(--text-muted)]">ou</span>
            </div>
          </div>

          <div className="mt-6">
            <Link
              href="/login"
              className="w-full flex justify-center items-center py-2.5 px-4 border border-[var(--border-default)] rounded-lg text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Login
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
