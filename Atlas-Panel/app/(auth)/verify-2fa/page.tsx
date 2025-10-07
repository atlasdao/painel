'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/app/lib/auth';
import toast, { Toaster } from 'react-hot-toast';
import { Shield, ArrowLeft, RefreshCw, Smartphone, Lock, CheckCircle, AlertCircle } from 'lucide-react';

function Verify2FAContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Get temp token from sessionStorage or URL params
    const token = searchParams.get('token') || sessionStorage.getItem('2fa_temp_token');
    const userEmail = sessionStorage.getItem('2fa_email');
    const loginEmail = sessionStorage.getItem('login_email');

    console.log('2FA Page - Checking session data:', {
      token: !!token,
      userEmail: !!userEmail,
      loginEmail: !!loginEmail
    });

    if (!token && !userEmail && !loginEmail) {
      console.log('No session data found, showing warning but not redirecting immediately');
      toast.error('Sessão de verificação não encontrada. Por favor, faça login novamente.');
      // Don't redirect immediately, let user see the page
      setTimeout(() => {
        if (!sessionStorage.getItem('login_email')) {
          router.push('/login');
        }
      }, 3000);
      return;
    }

    if (token) {
      setTempToken(token);
      // Clear token from sessionStorage after reading
      sessionStorage.removeItem('2fa_temp_token');
    }

    // Don't clear email yet, we need it for verification
    // sessionStorage.removeItem('2fa_email');

    // Focus first input
    inputRefs.current[0]?.focus();
  }, [searchParams, router]);

  useEffect(() => {
    // Countdown timer for resend
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits are entered
    if (value && index === 5 && newCode.every(digit => digit)) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    // Handle arrow keys
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    const digits = pastedData.split('').filter(char => /\d/.test(char));

    const newCode = [...code];
    digits.forEach((digit, i) => {
      if (i < 6) {
        newCode[i] = digit;
      }
    });
    setCode(newCode);

    // Focus last filled input or last input
    const lastIndex = Math.min(digits.length, 5);
    inputRefs.current[lastIndex]?.focus();

    // Auto-submit if all digits were pasted
    if (digits.length === 6) {
      handleVerify(digits.join(''));
    }
  };

  const handleVerify = async (fullCode?: string) => {
    const verificationCode = fullCode || code.join('');

    if (verificationCode.length !== 6) {
      toast.error('Digite todos os 6 dígitos');
      return;
    }

    setLoading(true);

    try {
      // Get stored email and password from sessionStorage
      const userEmail = sessionStorage.getItem('login_email') || '';
      const userPassword = sessionStorage.getItem('login_password') || '';

      if (!userEmail || !userPassword) {
        toast.error('Sessão expirada. Por favor, faça login novamente.');
        router.push('/login');
        return;
      }

      // Try to login with 2FA code
      const response = await authService.loginWith2FA(userEmail, userPassword, verificationCode);

      if (response && !('requiresTwoFactor' in response)) {
        // Success
        toast.success('Verificação concluída!');

        // Clear stored credentials
        sessionStorage.removeItem('login_email');
        sessionStorage.removeItem('login_password');

        // Small delay for visual feedback
        setTimeout(() => {
          router.push('/dashboard');
        }, 500);
      } else {
        toast.error('Código inválido');
        // Clear code on error
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Erro ao verificar código';
      toast.error(message);

      // Clear code on error
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;

    setResendTimer(30); // 30 seconds cooldown
    toast.success('Novo código enviado');
    // In a real implementation, this would trigger a new code to be sent
  };

  return (
    <>
      <Toaster position="top-right" />
      <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 opacity-90" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-900/10 rounded-full filter blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-900/10 rounded-full filter blur-3xl animate-pulse" />
        </div>

        <div className="relative z-10 max-w-md w-full">
          {/* Card */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-8">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-20 h-20 bg-blue-600/10 rounded-full flex items-center justify-center">
                  <Shield className="w-10 h-10 text-blue-500" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Lock className="w-3 h-3 text-white" />
                </div>
              </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-white text-center mb-2">
              Verificação em 2 Etapas
            </h2>
            <p className="text-gray-400 text-center mb-8">
              Digite o código de 6 dígitos do seu aplicativo autenticador
            </p>

            {/* Code Input */}
            <div className="flex justify-center gap-2 mb-8">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={el => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  disabled={loading}
                  className={`
                    w-12 h-14 text-center text-xl font-semibold
                    bg-gray-700 border-2 text-white
                    rounded-lg transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${digit ? 'border-blue-500 bg-gray-700/50' : 'border-gray-600'}
                    ${loading ? 'animate-pulse' : ''}
                  `}
                  placeholder="•"
                />
              ))}
            </div>

            {/* Verify Button */}
            <button
              onClick={() => handleVerify()}
              disabled={loading || code.some(d => !d)}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Verificar Código
                </>
              )}
            </button>

            {/* Help Section */}
            <div className="mt-6 pt-6 border-t border-gray-700">
              <div className="flex items-center justify-between text-sm">
                <button
                  onClick={() => router.push('/login')}
                  className="text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar ao login
                </button>

                <button
                  onClick={handleResend}
                  disabled={resendTimer > 0}
                  className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 disabled:text-gray-500 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 ${resendTimer > 0 ? 'animate-spin' : ''}`} />
                  {resendTimer > 0 ? `Reenviar (${resendTimer}s)` : 'Reenviar código'}
                </button>
              </div>

              {/* Info */}
              <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <Smartphone className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-300">
                    Abra seu aplicativo autenticador (Google Authenticator, Authy, etc.) e digite o código de 6 dígitos mostrado.
                  </p>
                </div>
              </div>

              {/* Recovery Option */}
              <div className="mt-3 text-center">
                <button className="text-xs text-gray-400 hover:text-gray-300 underline">
                  Usar código de recuperação
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Verify2FAPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-white">Carregando...</div>
      </div>
    }>
      <Verify2FAContent />
    </Suspense>
  );
}