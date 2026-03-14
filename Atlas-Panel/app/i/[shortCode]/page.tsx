'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Gift, Loader2, XCircle } from 'lucide-react';
import Cookies from 'js-cookie';

export default function ReferralLandingPage() {
  const router = useRouter();
  const params = useParams();
  const shortCode = params?.shortCode as string;

  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!shortCode) {
      setStatus('invalid');
      setErrorMessage('Link inválido');
      return;
    }

    validateAndRedirect();
  }, [shortCode]);

  const validateAndRedirect = async () => {
    try {
      // Validate the referral code with the API
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:19997/api/v1'}/referral/link/${shortCode}`
      );

      const data = await response.json();

      if (data.valid) {
        // Store referral code in cookie (7 days)
        Cookies.set('referralCode', shortCode, { expires: 7, path: '/' });

        // Also store in localStorage as backup
        localStorage.setItem('referralCode', shortCode);

        setStatus('valid');

        // Redirect to register page after a brief delay
        setTimeout(() => {
          router.push('/register');
        }, 1500);
      } else {
        setStatus('invalid');
        setErrorMessage(data.reason || 'Link de indicação inválido');

        // Redirect to register anyway after 3 seconds
        setTimeout(() => {
          router.push('/register');
        }, 3000);
      }
    } catch (error) {
      console.error('Error validating referral:', error);
      setStatus('invalid');
      setErrorMessage('Erro ao validar link');

      // Redirect to register anyway after 3 seconds
      setTimeout(() => {
        router.push('/register');
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {status === 'loading' && (
          <div className="space-y-6">
            <div className="w-20 h-20 mx-auto bg-purple-600/20 rounded-full flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Validando seu convite...
              </h1>
              <p className="text-gray-400">
                Aguarde enquanto verificamos o link de indicação
              </p>
            </div>
          </div>
        )}

        {status === 'valid' && (
          <div className="space-y-6">
            <div className="w-20 h-20 mx-auto bg-green-600/20 rounded-full flex items-center justify-center">
              <Gift className="w-10 h-10 text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Voce foi convidado!
              </h1>
              <p className="text-gray-400 mb-4">
                Seu código de indicação foi aplicado automaticamente.
                Redirecionando para o cadastro...
              </p>
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse w-full" />
              </div>
            </div>
          </div>
        )}

        {status === 'invalid' && (
          <div className="space-y-6">
            <div className="w-20 h-20 mx-auto bg-red-600/20 rounded-full flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Link Inválido
              </h1>
              <p className="text-gray-400 mb-4">
                {errorMessage}
              </p>
              <p className="text-gray-500 text-sm">
                Redirecionando para o cadastro em alguns segundos...
              </p>
            </div>
            <button
              onClick={() => router.push('/register')}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Ir para Cadastro
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
