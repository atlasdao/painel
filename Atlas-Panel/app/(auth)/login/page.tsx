'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/app/lib/auth';
import toast, { Toaster } from 'react-hot-toast';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors([]);

    try {
      const response = await authService.login(email, password);
      console.log('Login response:', response);
      toast.success('Login realizado com sucesso!');
      
      // Add a small delay to ensure cookies are set
      setTimeout(() => {
        router.push('/dashboard');
      }, 100);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Erro ao fazer login';
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

  return (
    <>
      <Toaster position="top-right" />
      <div className="card bg-gray-800 border-gray-700">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">Entrar</h2>
          <p className="text-gray-400 mt-2">Acesse sua conta para continuar</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">
              Email ou Nome de Usuário
            </label>
            <input
              id="email"
              name="email"
              type="text"
              autoComplete="username email"
              required
              className="input-field mt-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
              placeholder="seu@email.com ou username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
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
                className="input-field pr-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
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
          {errors.length > 0 && (
            <div className="bg-red-900/20 border border-red-500 rounded-lg p-3">
              <div className="flex items-start">
                <AlertCircle className="text-red-400 mr-2 flex-shrink-0 mt-0.5" size={16} />
                <div className="text-sm text-red-400">
                  {errors.length === 1 ? (
                    errors[0]
                  ) : (
                    <ul className="list-disc list-inside space-y-1">
                      {errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 bg-gray-700 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-400">
                Lembrar de mim
              </label>
            </div>

            <div className="text-sm">
              <Link href="/forgot-password" className="font-medium text-blue-400 hover:text-blue-300">
                Esqueceu a senha?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                Entrar
              </>
            )}
          </button>

          <div className="text-center">
            <span className="text-sm text-gray-400">
              Não tem uma conta?{' '}
              <Link href="/register" className="font-medium text-blue-400 hover:text-blue-300">
                Cadastre-se
              </Link>
            </span>
          </div>
        </form>

      </div>
    </>
  );
}