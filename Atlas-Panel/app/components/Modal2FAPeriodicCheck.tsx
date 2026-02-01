'use client';

import { useState, useRef, useEffect } from 'react';
import { Shield, Clock, AlertTriangle, Loader, X, Key } from 'lucide-react';
import { authService } from '@/app/lib/auth';
import toast from 'react-hot-toast';

interface Modal2FAPeriodicCheckProps {
  isOpen: boolean;
  onSuccess: () => void;
  onLogout: () => void;
  lastVerified?: string;
}

export default function Modal2FAPeriodicCheck({
  isOpen,
  onSuccess,
  onLogout,
  lastVerified
}: Modal2FAPeriodicCheckProps) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOpen && !useBackupCode) {
      // Focus first input when modal opens
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [isOpen, useBackupCode]);

  if (!isOpen) return null;

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');

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
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);

    if (pastedData.length === 6) {
      const newCode = pastedData.split('');
      setCode(newCode);
      inputRefs.current[5]?.focus();
      handleVerify(pastedData);
    }
  };

  const handleVerify = async (fullCode?: string) => {
    const verificationCode = fullCode || code.join('');

    if (verificationCode.length !== 6) {
      setError('Digite o código de 6 dígitos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authService.verifyPeriodicCheck(verificationCode);
      toast.success('Verificação concluída!');
      onSuccess();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Código inválido';
      setError(message);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleBackupCodeVerify = async () => {
    if (backupCode.length < 6) {
      setError('Digite o código de backup completo');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // For backup code, we need to use a different approach
      // Since this is periodic check, we need email from current user
      const userCookie = document.cookie.split('; ').find(row => row.startsWith('user='));
      if (!userCookie) {
        throw new Error('Sessão expirada');
      }
      const user = JSON.parse(decodeURIComponent(userCookie.split('=')[1]));

      await authService.verify2FAWithBackupCode(user.email, backupCode);
      toast.success('Verificação com código de backup concluída!');
      onSuccess();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Código de backup inválido';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const formatLastVerified = (dateStr?: string) => {
    if (!dateStr) return 'Nunca';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return 'Há menos de 1 hora';
    if (diffHours === 1) return 'Há 1 hora';
    if (diffHours < 24) return `Há ${diffHours} horas`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Há 1 dia';
    return `Há ${diffDays} dias`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
      {/* Backdrop - não permite fechar clicando fora */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-gray-700/50 overflow-hidden animate-slideUp">
        {/* Gradient accent border */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-blue-600/20 pointer-events-none" />

        <div className="relative p-6">
          {/* Header */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center">
                <Shield className="w-10 h-10 text-blue-400" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                <Clock className="w-3 h-3 text-gray-900" />
              </div>
            </div>
          </div>

          <h2 className="text-xl font-bold text-white text-center mb-2">
            Verificação de Segurança
          </h2>
          <p className="text-gray-400 text-center text-sm mb-4">
            Sua verificação 2FA de 12 horas expirou. Por favor, confirme sua identidade para continuar.
          </p>

          {lastVerified && (
            <div className="mb-4 p-3 bg-gray-800/50 rounded-lg flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">
                Última verificação: {formatLastVerified(lastVerified)}
              </span>
            </div>
          )}

          {!useBackupCode ? (
            <>
              {/* OTP Input */}
              <div className="flex justify-center gap-2 mb-4">
                {code.map((digit, index) => (
                  <input
                    key={index}
                    ref={el => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
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

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-400 text-center">{error}</p>
                </div>
              )}

              {/* Verify Button */}
              <button
                onClick={() => handleVerify()}
                disabled={loading || code.some(d => !d)}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 mb-4"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    Verificar
                  </>
                )}
              </button>

              {/* Backup code option */}
              <button
                onClick={() => setUseBackupCode(true)}
                className="w-full text-sm text-gray-400 hover:text-gray-300 transition-colors flex items-center justify-center gap-2"
              >
                <Key className="w-4 h-4" />
                Usar código de backup
              </button>
            </>
          ) : (
            <>
              {/* Backup code input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Código de Backup
                </label>
                <input
                  type="text"
                  value={backupCode}
                  onChange={(e) => {
                    setBackupCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                    setError('');
                  }}
                  placeholder="XXXXXXXX"
                  maxLength={8}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white text-center text-xl tracking-widest placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all uppercase"
                  disabled={loading}
                />
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-400 text-center">{error}</p>
                </div>
              )}

              {/* Verify Backup Button */}
              <button
                onClick={handleBackupCodeVerify}
                disabled={loading || backupCode.length < 6}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 mb-4"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <Key className="w-5 h-5" />
                    Verificar Código de Backup
                  </>
                )}
              </button>

              {/* Back to OTP */}
              <button
                onClick={() => {
                  setUseBackupCode(false);
                  setBackupCode('');
                  setError('');
                }}
                className="w-full text-sm text-gray-400 hover:text-gray-300 transition-colors"
              >
                Voltar para código do app
              </button>
            </>
          )}

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-gray-800 text-sm text-gray-500">ou</span>
            </div>
          </div>

          {/* Logout option */}
          <button
            onClick={onLogout}
            disabled={loading}
            className="w-full py-3 px-4 bg-red-900/20 hover:bg-red-900/30 border border-red-500/30 text-red-400 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <AlertTriangle className="w-5 h-5" />
            Sair da conta
          </button>

          {/* Info */}
          <p className="mt-4 text-xs text-gray-500 text-center">
            A verificação periódica de 12 horas foi ativada nas configurações da sua conta para maior segurança.
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animate-slideUp { animation: slideUp 0.3s ease-out; }
      `}</style>
    </div>
  );
}
