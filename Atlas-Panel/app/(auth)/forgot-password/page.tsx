'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, ArrowLeft, Loader, CheckCircle } from 'lucide-react';
import api from '@/app/lib/api';
import toast, { Toaster } from 'react-hot-toast';

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
        <Toaster position="top-right" />
        
        <div className="card bg-gray-800 border-gray-700">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Email Enviado!</h2>
            <p className="text-gray-300">
              Verificamos sua caixa de entrada em <strong>{email}</strong>
            </p>

            <div className="p-4 bg-blue-900/20 border border-blue-600 rounded-lg">
              <p className="text-sm text-blue-300">
                📧 Um código de 6 dígitos foi enviado para seu email
              </p>
            </div>
            
            <div className="p-4 bg-yellow-900/20 border border-yellow-600 rounded-lg">
              <p className="text-sm text-yellow-300">
                ⏰ O código expira em 15 minutos
              </p>
            </div>

            <div className="pt-4 space-y-3">
              <button
                onClick={() => router.push(`/reset-password?email=${encodeURIComponent(email)}`)}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200 font-medium"
              >
                Inserir Código
              </button>
              
              <button
                onClick={() => {
                  setEmailSent(false);
                  setEmail('');
                }}
                className="w-full bg-gray-700 text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-600 transition duration-200"
              >
                Tentar Outro Email
              </button>
            </div>

            <div className="pt-4 border-t border-gray-700">
              <p className="text-xs text-gray-400">
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
      <Toaster position="top-right" />
      
      <div className="card bg-gray-800 border-gray-700">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">Esqueci minha senha</h2>
          <p className="text-gray-400 mt-2">
            Digite seu email para receber um código de recuperação
          </p>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">
              Email
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                placeholder="Digite seu email"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors"
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
              <div className="w-full border-t border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-800 text-gray-400">ou</span>
            </div>
          </div>

          <div className="mt-6">
            <Link
              href="/login"
              className="w-full flex justify-center items-center py-2 px-4 border border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition duration-200"
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