'use client';

import { useState, useEffect } from 'react';
import { Lock, ShieldCheck, ChevronRight, Store, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { accountValidationService } from '@/app/lib/services';
import AccountValidationModal from './AccountValidationModal';

interface CommerceLockScreenProps {
  isAccountValidated?: boolean;
  commerceMode?: boolean;
  defaultWalletAddress?: string | null;
}

export default function CommerceLockScreen({
  isAccountValidated = false,
  commerceMode = false,
  defaultWalletAddress = null
}: CommerceLockScreenProps) {
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationAmount, setValidationAmount] = useState<number>(2.0);

  // Fetch dynamic validation amount on component mount
  useEffect(() => {
    const fetchValidationAmount = async () => {
      try {
        console.log('[CommerceLockScreen] Fetching validation amount...');
        const amount = await accountValidationService.getCurrentValidationAmount();
        console.log('[CommerceLockScreen] Fetched validation amount:', amount);
        setValidationAmount(amount);
      } catch (error) {
        console.warn('[CommerceLockScreen] Failed to fetch validation amount, using default:', error);
        // Keep default value of 2.0
      }
    };

    fetchValidationAmount();
  }, []);

  const benefits = [
    'Criar links de pagamento personalizados',
    'Receber pagamentos de qualquer CPF/CNPJ',
    'Acessar estatísticas avançadas',
    'Limites expandidos para transações',
    'Suporte prioritário',
    'API para integração'
  ];

  return (
    <div className="relative">
      {/* Blurred Background Content */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-8 filter blur-sm opacity-50 pointer-events-none">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[var(--bg-card)] rounded-lg p-6">
              <div className="h-8 bg-[var(--bg-elevated)] rounded w-3/4 mb-4"></div>
              <div className="h-12 bg-[var(--bg-elevated)] rounded w-full mb-2"></div>
              <div className="h-4 bg-[var(--bg-elevated)] rounded w-1/2"></div>
            </div>
          ))}
        </div>
        <div className="h-64 bg-[var(--bg-card)] rounded-lg"></div>
      </div>

      {/* Lock Screen Overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl max-w-2xl w-full p-8 backdrop-blur-xl border-2 border-[var(--accent)]/20 shadow-2xl animate-bounce-in">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-[var(--accent-soft)] rounded-full mb-4">
              <Lock className="w-10 h-10 text-[var(--accent)]" />
            </div>

            <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
              Validação de Conta Necessária
            </h2>

            <p className="text-[var(--text-secondary)] text-lg mb-2">
              Você precisa validar sua conta para ativar o Modo Comércio
            </p>

            <p className="text-[var(--text-muted)] text-sm">
              Desbloqueie recursos avançados para aceitar pagamentos e gerenciar seu negócio
            </p>
          </div>

          {/* Account Validation Prompt */}
          {!isAccountValidated && (
            <div className="mb-8 p-6 bg-yellow-100 dark:bg-yellow-900/10 border border-yellow-300 dark:border-yellow-500/30 rounded-lg">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-yellow-200 dark:bg-yellow-500/20 rounded-lg">
                  <ShieldCheck className="text-yellow-600 dark:text-yellow-400 flex-shrink-0" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-yellow-700 dark:text-yellow-400 font-semibold text-lg mb-2">Validação de Conta Necessária</h3>
                  <p className="text-[var(--text-secondary)] mb-3 leading-relaxed">
                    Para acessar o Modo Comércio, você precisa primeiro validar sua conta com um pagamento único de <strong className="text-[var(--text-primary)]">R$ {validationAmount.toFixed(2).replace('.', ',')}</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Benefits Section */}
          <div className="mb-8 p-6 bg-[var(--accent-soft)] rounded-lg border border-[var(--accent)]/20">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <Store className="w-5 h-5 text-[var(--accent)]" />
              Benefícios do Modo Comércio
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <p className="text-[var(--text-secondary)] text-sm">{benefit}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <div className="flex flex-col gap-4">
            <button
              onClick={() => setShowValidationModal(true)}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[var(--accent)] text-[var(--text-primary)] rounded-lg font-medium hover:bg-[var(--accent-hover)] transition-all transform hover:scale-105"
            >
              <ShieldCheck className="w-5 h-5" />
              Validar Conta
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

        </div>
      </div>

      {/* Validation Modal */}
      {showValidationModal && (
        <AccountValidationModal
          isOpen={showValidationModal}
          onClose={() => setShowValidationModal(false)}
          onSuccess={() => {
            setShowValidationModal(false);
            toast.success('Conta validada com sucesso!');
          }}
          defaultWallet={defaultWalletAddress}
        />
      )}
    </div>
  );
}
