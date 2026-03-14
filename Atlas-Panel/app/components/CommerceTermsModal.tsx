'use client';

import { useState, useEffect } from 'react';
import { Check, AlertTriangle, Clock, Shield, FileText } from 'lucide-react';

interface CommerceTermsModalProps {
  isOpen: boolean;
  onAccept: () => Promise<void>;
}

export default function CommerceTermsModal({ isOpen, onAccept }: CommerceTermsModalProps) {
  const [accepted, setAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Cleanup on close - same pattern as AccountValidationModal
  useEffect(() => {
    if (!isOpen) {
      // Reset state after modal close animation
      const timer = setTimeout(() => {
        setAccepted(false);
        setIsLoading(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleAccept = async () => {
    if (!accepted || isLoading) return;

    setIsLoading(true);
    try {
      await onAccept();
    } catch (error) {
      console.error('Error accepting terms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--border-default)] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--accent-soft)] rounded-lg flex-shrink-0">
              <FileText className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">Termos do Modo Comércio</h2>
              <p className="text-xs sm:text-sm text-[var(--text-muted)]">Leia com atenção antes de continuar</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Termo 1 - Transparência */}
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-200 dark:bg-blue-500/20 flex items-center justify-center text-blue-700 dark:text-blue-400 text-xs font-bold">
              1
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">Transparência com o Cliente</h3>
              <p className="text-xs sm:text-sm text-[var(--text-muted)]">
                Ao vender em Depix, informe sempre ao cliente que a compra está sendo feita através de Depix, mesmo para serviços como clínicas ou consultorias.
              </p>
            </div>
          </div>

          {/* Termo 2 - Limites */}
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-200 dark:bg-blue-500/20 flex items-center justify-center text-blue-700 dark:text-blue-400 text-xs font-bold">
              2
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">Limites de Transação</h3>
              <p className="text-xs sm:text-sm text-[var(--text-muted)]">
                <strong className="text-[var(--text-primary)]">Primeiro dia:</strong> R$ 500 por CPF/CNPJ<br />
                <strong className="text-[var(--text-primary)]">Após 24h:</strong> R$ 5.000 por transação, R$ 6.000 diário por CPF/CNPJ<br />
                <span className="text-yellow-700 dark:text-yellow-400">Se precisar de limites maiores, solicite com depósito de colateral.</span>
              </p>
            </div>
          </div>

          {/* Termo 3 - Saques D+1 */}
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-200 dark:bg-blue-500/20 flex items-center justify-center text-blue-700 dark:text-blue-400 text-xs font-bold">
              3
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1 flex items-center gap-2">
                Saques D+1
                <Clock className="w-3 h-3 text-[var(--text-muted)]" />
              </h3>
              <p className="text-xs sm:text-sm text-[var(--text-muted)]">
                Os saques são processados em D+1 em duas remessas diárias: <strong className="text-[var(--text-primary)]">6h</strong> e <strong className="text-[var(--text-primary)]">18h</strong> (a mais próxima após 24h da venda).
                <br />
                <span className="text-[var(--accent)]">Para D+0, contate: contato@atlasdao.info</span>
              </p>
            </div>
          </div>

          {/* Termo 4 - Uso Lícito */}
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-200 dark:bg-blue-500/20 flex items-center justify-center text-blue-700 dark:text-blue-400 text-xs font-bold">
              4
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">Uso Lícito</h3>
              <p className="text-xs sm:text-sm text-[var(--text-muted)]">
                Você declara que utilizará a plataforma apenas para atividades legais e em conformidade com a legislação brasileira.
              </p>
            </div>
          </div>

          {/* Termo 5 - Reembolsos */}
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-200 dark:bg-blue-500/20 flex items-center justify-center text-blue-700 dark:text-blue-400 text-xs font-bold">
              5
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">Política de Reembolso</h3>
              <p className="text-xs sm:text-sm text-[var(--text-muted)]">
                Em caso de pedido de reembolso (até 8 dias), você envia o valor em Depix para nós e fazemos o Pix ao cliente com comprovante.
              </p>
            </div>
          </div>

          {/* Termo 6 - Documentação */}
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-200 dark:bg-blue-500/20 flex items-center justify-center text-blue-700 dark:text-blue-400 text-xs font-bold">
              6
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">Guarde Comprovantes</h3>
              <p className="text-xs sm:text-sm text-[var(--text-muted)]">
                Mantenha provas de transações por <strong className="text-[var(--text-primary)]">90 dias</strong> para apresentar em caso de MED. Isso protege a infraestrutura do Depix.
              </p>
            </div>
          </div>

          {/* Isenção de Responsabilidade */}
          <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-500/30 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <h3 className="text-sm font-medium text-yellow-700 dark:text-yellow-400 mb-1">Isenção de Responsabilidade</h3>
                <p className="text-xs text-[var(--text-muted)]">
                  A Atlas não se responsabiliza por: perdas financeiras, fraudes entre comerciante e cliente, chargebacks, disputas, ou interrupções do serviço. O serviço é fornecido "como está". A Atlas pode suspender contas a qualquer momento em caso de irregularidades e reter valores por até 90 dias para investigação. O comerciante concorda em ressarcir a Atlas por eventuais prejuízos decorrentes do uso indevido da plataforma.
                </p>
              </div>
            </div>
          </div>

          {/* Plataforma em Desenvolvimento */}
          <div className="p-3 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg">
            <p className="text-xs text-[var(--text-muted)]">
              <Shield className="w-3 h-3 inline mr-1 text-[var(--text-muted)]" />
              A plataforma está em desenvolvimento contínuo. Seu feedback é importante para melhorias.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[var(--border-default)] flex-shrink-0 space-y-3">
          {/* Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex-shrink-0 mt-0.5">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${
                accepted
                  ? 'bg-[var(--accent)] border-[var(--accent)]'
                  : 'border-[var(--border-hover)] group-hover:border-[var(--text-muted)]'
              }`}>
                {accepted && <Check className="w-3 h-3 text-white" />}
              </div>
            </div>
            <span className="text-xs sm:text-sm text-[var(--text-secondary)]">
              Li, compreendi e aceito os termos acima
            </span>
          </label>

          {/* Button */}
          <button
            onClick={handleAccept}
            disabled={!accepted || isLoading}
            className={`w-full py-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
              accepted && !isLoading
                ? 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--text-primary)]'
                : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Aceitar e Continuar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
