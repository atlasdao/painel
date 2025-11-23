'use client';

import { useState, useEffect } from 'react';
import { Lock, ShieldCheck, AlertCircle, ChevronRight, Store, CheckCircle, Coins, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { accountValidationService } from '@/app/lib/services';
import CommerceApplicationForm from './CommerceApplicationForm';
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
  const [showApplicationForm, setShowApplicationForm] = useState(false);
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

  const validationRequirements = [
    {
      icon: FileText,
      title: 'Responder o formulário de aprovação',
      description: 'Forneça informações sobre seu negócio'
    },
    {
      icon: Coins,
      title: 'Depositar garantia de 100.000 satoshis',
      description: 'Devolvida após 3 meses + 200 transações sem problemas'
    }
  ];

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
      <div className="glass-card p-8 filter blur-sm opacity-50 pointer-events-none">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-800/50 rounded-lg p-6">
              <div className="h-8 bg-gray-700/50 rounded w-3/4 mb-4"></div>
              <div className="h-12 bg-gray-700/50 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-700/50 rounded w-1/2"></div>
            </div>
          ))}
        </div>
        <div className="h-64 bg-gray-800/50 rounded-lg"></div>
      </div>

      {/* Lock Screen Overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="glass-card max-w-2xl w-full p-8 backdrop-blur-xl bg-gray-900/95 border-2 border-purple-500/20 shadow-2xl animate-bounce-in">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full mb-4">
              <Lock className="w-10 h-10 text-purple-400" />
            </div>

            <h2 className="text-3xl font-bold text-white mb-4">
              {!isAccountValidated ? 'Validação de Conta Necessária' : 'Ativação do Modo Comércio'}
            </h2>

            <p className="text-gray-300 text-lg mb-2">
              {!isAccountValidated
                ? 'Você precisa validar sua conta antes de ativar o Modo Comércio'
                : 'Complete os requisitos abaixo para ativar o Modo Comércio'
              }
            </p>

            <p className="text-gray-400 text-sm">
              Desbloqueie recursos avançados para aceitar pagamentos e gerenciar seu negócio
            </p>
          </div>

          {/* Requirements Section - Only show for validated accounts */}
          {isAccountValidated && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                Requisitos para Ativação
              </h3>
              <div className="space-y-4">
                {validationRequirements.map((req, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                    <div className="mt-1">
                      <req.icon className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-200 font-medium">{req.title}</p>
                      <p className="text-gray-400 text-sm mt-1">{req.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Account Validation Prompt - For non-validated users */}
          {!isAccountValidated && (
            <div className="mb-8 p-6 bg-yellow-900/10 border border-yellow-500/30 rounded-lg">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <ShieldCheck className="text-yellow-400 flex-shrink-0" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-yellow-400 font-semibold text-lg mb-2">Validação de Conta Necessária</h3>
                  <p className="text-gray-300 mb-3 leading-relaxed">
                    Para acessar o Modo Comércio, você precisa primeiro validar sua conta com um pagamento único de <strong className="text-white">R$ {validationAmount.toFixed(2).replace('.', ',')}</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Benefits Section */}
          <div className="mb-8 p-6 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg border border-purple-500/20">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Store className="w-5 h-5 text-purple-400" />
              Benefícios do Modo Comércio
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <p className="text-gray-300 text-sm">{benefit}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4">
            {!isAccountValidated && (
              <button
                onClick={() => setShowValidationModal(true)}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105"
              >
                <ShieldCheck className="w-5 h-5" />
                Validar Conta
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            {isAccountValidated && !commerceMode && (
              <button
                onClick={() => setShowApplicationForm(true)}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105"
              >
                <FileText className="w-5 h-5" />
                Responder Formulário de Aplicação
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
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

      {/* Application Form Modal */}
      {showApplicationForm && (
        <CommerceApplicationForm
          isOpen={showApplicationForm}
          onClose={() => setShowApplicationForm(false)}
          onSuccess={() => {
            setShowApplicationForm(false);
            toast.success('Formulário enviado com sucesso! Aguarde a aprovação.');
            // Optionally refresh the page or update state
          }}
        />
      )}
    </div>
  );
}