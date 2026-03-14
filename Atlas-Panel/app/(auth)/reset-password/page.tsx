'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Loader, CheckCircle, Circle } from 'lucide-react';
import api from '@/app/lib/api';
import toast, { Toaster } from 'react-hot-toast';

function ResetPasswordContent() {
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'code' | 'password' | 'success'>('code');
  const [codeVerified, setCodeVerified] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  // Password strength criteria
  const passwordCriteria = {
    minLength: newPassword.length >= 8,
    hasLowercase: /[a-z]/.test(newPassword),
    hasUppercase: /[A-Z]/.test(newPassword),
    hasNumber: /\d/.test(newPassword),
    hasSpecial: /[@$!%*?&]/.test(newPassword),
    passwordsMatch: newPassword === confirmPassword && confirmPassword.length > 0,
  };

  const allCriteriaMet = Object.values(passwordCriteria).every(Boolean);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !resetCode) {
      toast.error('Por favor, preencha todos os campos');
      return;
    }

    if (resetCode.length !== 6) {
      toast.error('O código deve ter 6 dígitos');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/verify-reset-code', {
        email,
        resetCode,
      });

      if (response.data.valid) {
        setCodeVerified(true);
        setStep('password');
        toast.success('Código verificado com sucesso!');
      } else {
        toast.error(response.data.message || 'Código inválido');
      }
    } catch (error: any) {
      console.error('Verify code error:', error);
      toast.error(error.response?.data?.message || 'Erro ao verificar código');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast.error('Por favor, preencha todos os campos');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('A senha deve ter pelo menos 8 caracteres');
      return;
    }

    // Password strength validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!passwordRegex.test(newPassword)) {
      toast.error('A senha deve conter ao menos: 1 letra minúscula, 1 maiúscula, 1 número e 1 caractere especial');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email,
        resetCode,
        newPassword,
      });

      setStep('success');
      toast.success('Senha redefinida com sucesso!');
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast.error(error.response?.data?.message || 'Erro ao redefinir senha');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <>
        <Toaster position="top-right" />
        <div className="atlas-card">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-500/10 border-2 border-[var(--color-success)] rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-[var(--color-success)]" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Senha Redefinida!</h2>
            <p className="text-[var(--text-secondary)]">
              Sua senha foi alterada com sucesso
            </p>

            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-sm text-[var(--color-success)]">
                Agora você pode fazer login com sua nova senha
              </p>
            </div>

            <button
              onClick={() => router.push('/login')}
              className="atlas-btn w-full"
            >
              Ir para o Login
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" />

      <div className="atlas-card">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            {step === 'code' ? 'Verificar Código' : 'Nova Senha'}
          </h2>
          <p className="text-[var(--text-secondary)] mt-2">
            {step === 'code'
              ? 'Digite o código de 6 dígitos enviado por email'
              : 'Digite sua nova senha'
            }
          </p>
        </div>

        {step === 'code' ? (
          <form className="space-y-6" onSubmit={handleVerifyCode}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--text-secondary)]">
                Email
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
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
              <label htmlFor="resetCode" className="block text-sm font-medium text-[var(--text-secondary)]">
                Código de Verificação
              </label>
              <div className="mt-1">
                <input
                  id="resetCode"
                  name="resetCode"
                  type="text"
                  maxLength={6}
                  required
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                  className="atlas-input text-center text-2xl font-mono tracking-widest"
                  placeholder="123456"
                />
              </div>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Digite os 6 dígitos enviados por email
              </p>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || resetCode.length !== 6}
                className="atlas-btn w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Verificando...
                  </>
                ) : (
                  'Verificar Código'
                )}
              </button>
            </div>
          </form>
        ) : (
          <form className="space-y-6" onSubmit={handleResetPassword}>
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-[var(--text-secondary)]">
                Nova Senha
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-[var(--text-muted)]" />
                </div>
                <input
                  id="newPassword"
                  name="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="atlas-input pl-10 pr-10"
                  placeholder="Digite sua nova senha"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-[var(--text-muted)] hover:text-[var(--text-primary)]" />
                  ) : (
                    <Eye className="h-5 w-5 text-[var(--text-muted)] hover:text-[var(--text-primary)]" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--text-secondary)]">
                Confirmar Nova Senha
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-[var(--text-muted)]" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="atlas-input pl-10 pr-10"
                  placeholder="Confirme sua nova senha"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-[var(--text-muted)] hover:text-[var(--text-primary)]" />
                  ) : (
                    <Eye className="h-5 w-5 text-[var(--text-muted)] hover:text-[var(--text-primary)]" />
                  )}
                </button>
              </div>
            </div>

            {/* Password Strength Criteria */}
            <div className="p-4 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg space-y-2">
              <p className="text-sm font-medium text-[var(--text-secondary)] mb-3">Critérios de segurança:</p>

              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center gap-2">
                  {passwordCriteria.minLength ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Circle className="w-4 h-4 text-[var(--text-muted)]" />
                  )}
                  <span className={`text-sm ${passwordCriteria.minLength ? 'text-green-500' : 'text-[var(--text-muted)]'}`}>
                    Mínimo 8 caracteres
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {passwordCriteria.hasLowercase ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Circle className="w-4 h-4 text-[var(--text-muted)]" />
                  )}
                  <span className={`text-sm ${passwordCriteria.hasLowercase ? 'text-green-500' : 'text-[var(--text-muted)]'}`}>
                    1 letra minúscula
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {passwordCriteria.hasUppercase ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Circle className="w-4 h-4 text-[var(--text-muted)]" />
                  )}
                  <span className={`text-sm ${passwordCriteria.hasUppercase ? 'text-green-500' : 'text-[var(--text-muted)]'}`}>
                    1 letra maiúscula
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {passwordCriteria.hasNumber ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Circle className="w-4 h-4 text-[var(--text-muted)]" />
                  )}
                  <span className={`text-sm ${passwordCriteria.hasNumber ? 'text-green-500' : 'text-[var(--text-muted)]'}`}>
                    1 número
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {passwordCriteria.hasSpecial ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Circle className="w-4 h-4 text-[var(--text-muted)]" />
                  )}
                  <span className={`text-sm ${passwordCriteria.hasSpecial ? 'text-green-500' : 'text-[var(--text-muted)]'}`}>
                    1 caractere especial (@$!%*?&)
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-[var(--border-default)] mt-1">
                  {passwordCriteria.passwordsMatch ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Circle className="w-4 h-4 text-[var(--text-muted)]" />
                  )}
                  <span className={`text-sm ${passwordCriteria.passwordsMatch ? 'text-green-500' : 'text-[var(--text-muted)]'}`}>
                    Senhas coincidem
                  </span>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || !allCriteriaMet}
                className="atlas-btn w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Redefinindo...
                  </>
                ) : (
                  'Redefinir Senha'
                )}
              </button>
            </div>
          </form>
        )}

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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="atlas-card">
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)]"></div>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
