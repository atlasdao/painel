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
  const [sessionToken, setSessionToken] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Get session data from URL params or sessionStorage
    const token = searchParams.get('token') || sessionStorage.getItem('2fa_session_token');
    const email = searchParams.get('email') || sessionStorage.getItem('2fa_email');

    if (!token && !email) {
      toast.error('Sessão de verificação não encontrada. Por favor, faça login novamente.');
      setTimeout(() => router.push('/login'), 2000);
      return;
    }

    if (token) {
      setSessionToken(token);
      sessionStorage.removeItem('2fa_session_token');
    }

    if (email) {
      setUserEmail(email);
    }

    // Focus first input
    inputRefs.current[0]?.focus();
  }, [searchParams, router]);

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
      if (!userEmail) {
        toast.error('Sessão expirada. Por favor, faça login novamente.');
        router.push('/login');
        return;
      }

      // Verify 2FA code using the dedicated endpoint
      const response = await authService.verify2FA(userEmail, verificationCode);

      if (response && response.access_token) {
        toast.success('Verificação concluída!');
        sessionStorage.removeItem('2fa_email');

        setTimeout(() => {
          if (response.user) {
            const redirectDestination = authService.getRedirectDestination(response.user);
            window.location.href = redirectDestination;
          } else {
            window.location.href = '/dashboard';
          }
        }, 500);
      } else {
        toast.error('Código inválido');
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Erro ao verificar código';
      toast.error(message);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleBackupCodeVerify = async () => {
    if (backupCode.length < 6) {
      toast.error('Digite o código de backup completo');
      return;
    }

    setLoading(true);

    try {
      if (!userEmail) {
        toast.error('Sessão expirada. Por favor, faça login novamente.');
        router.push('/login');
        return;
      }

      const response = await authService.verify2FAWithBackupCode(userEmail, backupCode);

      if (response && response.access_token) {
        toast.success('Verificação concluída!');
        sessionStorage.removeItem('2fa_email');

        setTimeout(() => {
          if (response.user) {
            const redirectDestination = authService.getRedirectDestination(response.user);
            window.location.href = redirectDestination;
          } else {
            window.location.href = '/dashboard';
          }
        }, 500);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Código de backup inválido';
      toast.error(message);
    } finally {
      setLoading(false);
    }
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
              {useBackupCode ? 'Código de Backup' : 'Verificação em 2 Etapas'}
            </h2>
            <p className="text-gray-400 text-center mb-8">
              {useBackupCode
                ? 'Digite um dos seus códigos de backup'
                : 'Digite o código de 6 dígitos do seu aplicativo autenticador'}
            </p>

            {!useBackupCode ? (
              <>
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
              </>
            ) : (
              <>
                {/* Backup Code Input */}
                <div className="mb-8">
                  <input
                    type="text"
                    value={backupCode}
                    onChange={(e) => setBackupCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    placeholder="XXXXXXXX"
                    maxLength={8}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-center text-xl tracking-widest placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all uppercase"
                    disabled={loading}
                    autoFocus
                  />
                  <p className="mt-2 text-xs text-gray-500 text-center">
                    Cada código de backup só pode ser usado uma vez
                  </p>
                </div>

                {/* Verify Backup Button */}
                <button
                  onClick={handleBackupCodeVerify}
                  disabled={loading || backupCode.length < 6}
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
                      Verificar Código de Backup
                    </>
                  )}
                </button>
              </>
            )}

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
                  onClick={() => {
                    setUseBackupCode(!useBackupCode);
                    setBackupCode('');
                    setCode(['', '', '', '', '', '']);
                  }}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {useBackupCode ? 'Usar código do app' : 'Usar código de backup'}
                </button>
              </div>

              {/* Info */}
              <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <Smartphone className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-300">
                    {useBackupCode
                      ? 'Os códigos de backup foram gerados quando você ativou o 2FA. Se você não salvou seus códigos, entre em contato com o suporte.'
                      : 'Abra seu aplicativo autenticador (Google Authenticator, Authy, etc.) e digite o código de 6 dígitos mostrado.'}
                  </p>
                </div>
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