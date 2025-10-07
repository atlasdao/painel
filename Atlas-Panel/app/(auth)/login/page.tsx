'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/app/lib/auth';
import toast, { Toaster } from 'react-hot-toast';
import { Eye, EyeOff, LogIn, AlertCircle, Shield, ArrowLeft, CheckCircle } from 'lucide-react';

type AuthState = 'CREDENTIALS' | 'VERIFYING' | 'TWO_FACTOR' | 'SUCCESS';

export default function LoginPage() {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>('CREDENTIALS');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // 2FA specific state
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [sessionToken, setSessionToken] = useState('');
  const [userEmail, setUserEmail] = useState(''); // Store actual email for 2FA
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Handle initial login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors([]);
    setAuthState('VERIFYING');

    try {
      const response = await authService.login(email, password);
      console.log('Login response:', response);

      // Check if 2FA is required
      if ('requiresTwoFactor' in response && response.requiresTwoFactor) {
        // Store session token and user email for 2FA verification
        setSessionToken(response.sessionToken || '');
        // Use the actual email from the response (not the input value which might be username)
        const actualEmail = response.user?.email || email;
        console.log('2FA Required - Input value:', email);
        console.log('2FA Required - Response user email:', response.user?.email);
        console.log('2FA Required - Using email for verification:', actualEmail);
        setUserEmail(actualEmail);
        setAuthState('TWO_FACTOR');
        toast.success('Digite o código de verificação');
        // Focus first OTP input
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      } else {
        setAuthState('SUCCESS');
        toast.success('Login realizado com sucesso!');
        // Add a small delay to show success state
        setTimeout(() => {
          // Use redirect logic based on user's commerce mode
          if (response.user && 'id' in response.user) {
            const redirectDestination = authService.getRedirectDestination(response.user);
            router.push(redirectDestination);
          } else {
            router.push('/dashboard'); // fallback
          }
        }, 500);
      }
    } catch (error: any) {
      setAuthState('CREDENTIALS');
      const message = error.response?.data?.message || error.message || 'Erro ao fazer login';

      const apiErrors = error.response?.data?.errors;
      if (apiErrors && Array.isArray(apiErrors)) {
        setErrors(apiErrors.map((err: any) => err.message || err));
        apiErrors.forEach((err: any) => {
          toast.error(err.message || err);
        });
      } else {
        setErrors([message]);
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP input change
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits

    const newOtp = [...otpCode];
    newOtp[index] = value;
    setOtpCode(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits are entered
    if (index === 5 && value && newOtp.every(digit => digit)) {
      handleVerify2FA(newOtp.join(''));
    }
  };

  // Handle OTP paste
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);

    if (pastedData.length === 6) {
      const newOtp = pastedData.split('');
      setOtpCode(newOtp);
      otpRefs.current[5]?.focus();

      // Auto-submit
      handleVerify2FA(pastedData);
    }
  };

  // Handle backspace in OTP
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Handle 2FA verification
  const handleVerify2FA = async (code?: string) => {
    const fullCode = code || otpCode.join('');

    if (fullCode.length !== 6) {
      setErrors(['Digite o código de 6 dígitos']);
      return;
    }

    setLoading(true);
    setErrors([]);

    try {
      const emailToUse = userEmail || email;
      console.log('2FA Verification - userEmail state:', userEmail);
      console.log('2FA Verification - email state:', email);
      console.log('2FA Verification - Using email:', emailToUse);
      const response = await authService.verify2FA(emailToUse, fullCode);

      setAuthState('SUCCESS');
      toast.success('Verificação concluída! Redirecionando...');

      // Small delay to show success state
      setTimeout(() => {
        // Use redirect logic based on user's commerce mode
        if (response.user && 'id' in response.user) {
          const redirectDestination = authService.getRedirectDestination(response.user);
          router.push(redirectDestination);
        } else {
          router.push('/dashboard'); // fallback
        }
      }, 500);
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Código inválido';
      setErrors([message]);
      toast.error(message);

      // Clear OTP inputs on error
      setOtpCode(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // Handle back from 2FA
  const handleBack = () => {
    setAuthState('CREDENTIALS');
    setOtpCode(['', '', '', '', '', '']);
    setSessionToken('');
    setUserEmail('');
    setErrors([]);
  };

  return (
    <>
      <Toaster position="top-right" />
      <div className="card bg-gray-800 border-gray-700 transition-all duration-300">
        {/* Header */}
        <div className="mb-6">
          {authState === 'TWO_FACTOR' && (
            <button
              onClick={handleBack}
              className="mb-4 flex items-center text-gray-400 hover:text-white transition-colors"
              disabled={loading}
            >
              <ArrowLeft size={20} className="mr-2" />
              Voltar
            </button>
          )}

          <div className="flex items-center mb-2">
            {authState === 'TWO_FACTOR' && (
              <Shield className="text-blue-400 mr-3" size={28} />
            )}
            {authState === 'SUCCESS' && (
              <CheckCircle className="text-green-400 mr-3" size={28} />
            )}

            <h2 className="text-2xl font-bold text-white">
              {authState === 'CREDENTIALS' && 'Entrar'}
              {authState === 'VERIFYING' && 'Verificando...'}
              {authState === 'TWO_FACTOR' && 'Verificação 2FA'}
              {authState === 'SUCCESS' && 'Sucesso!'}
            </h2>
          </div>

          <p className="text-gray-400">
            {authState === 'CREDENTIALS' && 'Acesse sua conta para continuar'}
            {authState === 'VERIFYING' && 'Verificando suas credenciais...'}
            {authState === 'TWO_FACTOR' && 'Digite o código do seu aplicativo autenticador'}
            {authState === 'SUCCESS' && 'Redirecionando para o painel...'}
          </p>
        </div>

        {/* Credentials Form */}
        {(authState === 'CREDENTIALS' || authState === 'VERIFYING') && (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className={authState === 'VERIFYING' ? 'opacity-50' : ''}>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email ou Nome de Usuário
              </label>
              <input
                id="email"
                name="email"
                type="text"
                autoComplete="username email"
                required
                disabled={authState === 'VERIFYING'}
                className="input-field mt-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                placeholder="seu@email.com ou username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className={authState === 'VERIFYING' ? 'opacity-50' : ''}>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Senha
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  disabled={authState === 'VERIFYING'}
                  className="input-field pr-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={authState === 'VERIFYING'}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Display */}
            {errors.length > 0 && authState === 'CREDENTIALS' && (
              <div className="bg-red-900/20 border border-red-500 rounded-lg p-3">
                <div className="flex items-start">
                  <AlertCircle className="text-red-400 mr-2 flex-shrink-0 mt-0.5" size={16} />
                  <div>
                    {errors.map((error, index) => (
                      <p key={index} className="text-red-400 text-sm">
                        {error}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Links */}
            <div className="flex items-center justify-between text-sm">
              <Link href="/forgot-password" className="text-blue-400 hover:text-blue-300 transition-colors">
                Esqueceu a senha?
              </Link>
              <Link href="/register" className="text-blue-400 hover:text-blue-300 transition-colors">
                Criar conta
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || authState === 'VERIFYING'}
              className="btn btn-primary w-full flex items-center justify-center"
            >
              {loading ? (
                <>
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-gray-300 mr-2"></span>
                  {authState === 'VERIFYING' ? 'Verificando...' : 'Entrando...'}
                </>
              ) : (
                <>
                  <LogIn className="mr-2" size={20} />
                  Entrar
                </>
              )}
            </button>
          </form>
        )}

        {/* 2FA Form */}
        {authState === 'TWO_FACTOR' && (
          <div className="space-y-6">
            {/* OTP Input Fields */}
            <div className="flex justify-center space-x-2">
              {otpCode.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    otpRefs.current[index] = el;
                  }}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  onPaste={index === 0 ? handleOtpPaste : undefined}
                  className="w-12 h-12 text-center text-xl font-bold bg-gray-700 border-2 border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="•"
                  autoFocus={index === 0}
                  disabled={loading}
                />
              ))}
            </div>

            {/* Error Display for 2FA */}
            {errors.length > 0 && (
              <div className="bg-red-900/20 border border-red-500 rounded-lg p-3">
                <div className="flex items-start">
                  <AlertCircle className="text-red-400 mr-2 flex-shrink-0 mt-0.5" size={16} />
                  <div>
                    {errors.map((error, index) => (
                      <p key={index} className="text-red-400 text-sm">
                        {error}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Verify Button */}
            <button
              onClick={() => handleVerify2FA()}
              disabled={loading || otpCode.some(v => !v)}
              className="btn btn-primary w-full flex items-center justify-center"
            >
              {loading ? (
                <>
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-gray-300 mr-2"></span>
                  Verificando...
                </>
              ) : (
                <>
                  <Shield className="mr-2" size={20} />
                  Verificar Código
                </>
              )}
            </button>

            {/* Help Text */}
            <div className="text-center text-sm text-gray-400">
              <p>Digite o código de 6 dígitos do seu aplicativo autenticador</p>
              <p className="mt-2">
                Não tem acesso ao aplicativo?{' '}
                <button className="text-blue-400 hover:text-blue-300 transition-colors">
                  Usar código de backup
                </button>
              </p>
            </div>
          </div>
        )}

        {/* Success State */}
        {authState === 'SUCCESS' && (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-900/30 border-2 border-green-500 rounded-full mb-4">
              <CheckCircle className="text-green-400" size={32} />
            </div>
            <p className="text-gray-300">Login realizado com sucesso!</p>
            <p className="text-sm text-gray-500 mt-2">Redirecionando...</p>
          </div>
        )}
      </div>
    </>
  );
}