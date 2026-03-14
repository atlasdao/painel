'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { referralService, ReferralStatus } from '@/app/lib/services';
import {
  Gift,
  Copy,
  Check,
  CheckCircle,
  Clock,
  XCircle,
  Wallet,
  TrendingUp,
  Edit3,
  FileText,
  X,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function ReferralPage() {
  const router = useRouter();
  const [status, setStatus] = useState<ReferralStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [liquidAddress, setLiquidAddress] = useState('');
  const [customShortCode, setCustomShortCode] = useState('');
  const [shortCodeAvailable, setShortCodeAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    loadReferralStatus();
  }, []);

  const loadReferralStatus = async () => {
    try {
      setLoading(true);
      const data = await referralService.getStatus();
      setStatus(data);
    } catch (error: any) {
      console.error('Error loading referral status:', error);
      if (error.response?.status === 401) {
        router.push('/login');
      } else {
        toast.error('Erro ao carregar dados');
      }
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  const handleCreateLink = async () => {
    if (!status?.hasAcceptedTerms) {
      try {
        await referralService.acceptTerms();
      } catch {
        toast.error('Erro ao aceitar termos');
        return;
      }
    }

    try {
      setCreatingLink(true);
      await referralService.createLink();
      toast.success('Link criado!');
      loadReferralStatus();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao criar link');
    } finally {
      setCreatingLink(false);
    }
  };

  const handleWithdraw = async () => {
    if (!liquidAddress.trim()) {
      toast.error('Informe o endereço Liquid');
      return;
    }

    try {
      setWithdrawing(true);
      const result = await referralService.requestWithdraw(liquidAddress);
      toast.success(`Saque de R$ ${result.totalRequested.toFixed(2)} solicitado!`);
      setShowWithdrawModal(false);
      setLiquidAddress('');
      loadReferralStatus();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao solicitar saque');
    } finally {
      setWithdrawing(false);
    }
  };

  const checkShortCodeAvailability = async (code: string) => {
    if (code.length < 5) {
      setShortCodeAvailable(null);
      return;
    }
    try {
      const result = await referralService.checkShortCodeAvailability(code);
      setShortCodeAvailable(result.available);
    } catch {
      setShortCodeAvailable(null);
    }
  };

  const handleCustomize = async () => {
    if (!customShortCode || customShortCode.length < 5) {
      toast.error('Código deve ter pelo menos 5 caracteres');
      return;
    }

    try {
      setCustomizing(true);
      await referralService.customizeShortCode(customShortCode);
      toast.success('Link personalizado!');
      setShowCustomizeModal(false);
      setCustomShortCode('');
      loadReferralStatus();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao personalizar');
    } finally {
      setCustomizing(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="mb-8 text-center">
        <Gift className="w-10 h-10 text-yellow-600 dark:text-yellow-400 mx-auto mb-3" />
        <h1 className="text-xl font-bold text-[var(--text-primary)]">
          Indique comerciantes e ganhe até R$ 150 por cada um
        </h1>
        <p className="text-[var(--text-muted)] text-sm mt-2">
          Campanha válida até 05/03/2026 •{' '}
          <button
            onClick={() => setShowTermsModal(true)}
            className="text-[var(--accent)] hover:opacity-80 underline"
          >
            Ver termos
          </button>
        </p>
      </div>

      {/* Not Eligible */}
      {!status?.isEligible && (
        <div className="bg-[var(--bg-card)] rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <span className="text-[var(--text-primary)] font-medium">Ainda não elegível</span>
          </div>
          <p className="text-[var(--text-muted)] text-sm mb-4">
            Você precisa ter {formatCurrency(status?.requiredSales || 10000)} em vendas para participar.
          </p>
          <div className="h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-500 rounded-full"
              style={{
                width: `${Math.min(((status?.commerceSalesTotal || 0) / (status?.requiredSales || 10000)) * 100, 100)}%`,
              }}
            />
          </div>
          <p className="text-[var(--text-muted)] text-xs mt-2">
            {formatCurrency(status?.commerceSalesTotal || 0)} / {formatCurrency(status?.requiredSales || 10000)}
          </p>
        </div>
      )}

      {/* Eligible */}
      {status?.isEligible && (
        <>
          {/* Link Section */}
          {status?.referralLink ? (
            <div className="bg-[var(--bg-card)] rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[var(--text-muted)] text-sm">Seu link de indicação:</p>
                <button
                  onClick={() => setShowCustomizeModal(true)}
                  className="text-[var(--accent)] hover:opacity-80 text-sm flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" />
                  Personalizar
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={status.referralLink.fullUrl}
                  readOnly
                  className="flex-1 bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm p-3 rounded-lg outline-none"
                />
                <button
                  onClick={() => copyToClipboard(status.referralLink!.fullUrl)}
                  className="p-3 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors"
                >
                  {copied ? <Check className="w-5 h-5 text-white" /> : <Copy className="w-5 h-5 text-white" />}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-[var(--bg-card)] rounded-xl p-6 mb-6 text-center">
              <p className="text-[var(--text-muted)] mb-4">Você está pronto para começar!</p>
              <button
                onClick={handleCreateLink}
                disabled={creatingLink}
                className="px-6 py-3 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium transition-colors disabled:opacity-50"
              >
                {creatingLink ? 'Criando...' : 'Criar Link de Indicação'}
              </button>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-[var(--bg-card)] rounded-xl p-4">
              <p className="text-[var(--text-muted)] text-sm">Total Ganho</p>
              <p className="text-xl font-bold text-[var(--text-primary)] mt-1">
                {formatCurrency(status?.referralLink?.totalCommissions || 0)}
              </p>
            </div>
            <div className="bg-[var(--bg-card)] rounded-xl p-4">
              <p className="text-[var(--text-muted)] text-sm">Disponível para Saque</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">
                {formatCurrency(status?.availableBalance || 0)}
              </p>
            </div>
          </div>

          {/* Withdraw Button - Always show */}
          <button
            onClick={() => setShowWithdrawModal(true)}
            disabled={(status?.availableBalance || 0) < (status?.minWithdrawal || 100)}
            className="w-full py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors mb-6 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Wallet className="w-5 h-5" />
            {(status?.availableBalance || 0) >= (status?.minWithdrawal || 100)
              ? `Sacar ${formatCurrency(status?.availableBalance || 0)}`
              : `Saque mínimo: ${formatCurrency(status?.minWithdrawal || 100)}`
            }
          </button>

          {/* Referrals List */}
          {status?.referrals && status.referrals.length > 0 && (
            <div className="bg-[var(--bg-card)] rounded-xl overflow-hidden mb-6">
              <div className="p-4 border-b border-[var(--border-default)]">
                <p className="text-[var(--text-primary)] font-medium">Suas indicações ({status.referrals.length})</p>
              </div>
              <div className="divide-y divide-[var(--border-default)]">
                {status.referrals.map((referral) => (
                  <div key={referral.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[var(--text-primary)] text-sm font-mono">{referral.email}</p>
                      <p className="text-[var(--text-muted)] text-xs mt-1">
                        {formatDate(referral.signupDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {referral.status === 'VALID' && (
                        <>
                          <span className="text-green-600 dark:text-green-400 font-medium text-sm">
                            {formatCurrency(referral.commissionAmount || 0)}
                          </span>
                          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </>
                      )}
                      {referral.status === 'PENDING' && (
                        <>
                          <span className="text-yellow-600 dark:text-yellow-400 text-xs">Aguardando 10k</span>
                          <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                        </>
                      )}
                      {referral.status === 'EXPIRED' && (
                        <>
                          <span className="text-red-600 dark:text-red-400 text-xs">Expirado</span>
                          <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="p-4 bg-[var(--bg-elevated)] rounded-xl text-center">
            <p className="text-[var(--text-muted)] text-xs">
              Indicação válida = indicado faz R$ 10.000 em vendas em até 3 meses
            </p>
          </div>
        </>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-[var(--bg-card)] rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Solicitar Saque</h3>
              <button onClick={() => setShowWithdrawModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[var(--text-muted)] text-sm mb-4">
              Valor: <span className="text-green-600 dark:text-green-400 font-bold">{formatCurrency(status?.availableBalance || 0)}</span>
            </p>
            <input
              type="text"
              placeholder="Endereço Liquid (lq1...)"
              value={liquidAddress}
              onChange={(e) => setLiquidAddress(e.target.value)}
              className="w-full bg-[var(--bg-primary)] text-[var(--text-primary)] p-3 rounded-lg outline-none focus:ring-2 focus:ring-[var(--accent)] mb-4"
            />
            <p className="text-[var(--text-muted)] text-xs mb-4">
              O pagamento será processado em até 48 horas.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1 py-2 rounded-lg bg-[var(--bg-elevated)] hover:opacity-80 text-[var(--text-primary)] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleWithdraw}
                disabled={withdrawing || !liquidAddress}
                className="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50"
              >
                {withdrawing ? 'Processando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customize Modal */}
      {showCustomizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-[var(--bg-card)] rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Personalizar Link</h3>
              <button onClick={() => setShowCustomizeModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[var(--text-muted)] text-sm mb-4">
              Escolha um código único (5-15 caracteres, letras e números).
            </p>
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="meucodigo"
                value={customShortCode}
                onChange={(e) => {
                  const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 15);
                  setCustomShortCode(value);
                  checkShortCodeAvailability(value);
                }}
                className="w-full bg-[var(--bg-primary)] text-[var(--text-primary)] p-3 rounded-lg outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
              {shortCodeAvailable !== null && customShortCode.length >= 5 && (
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${shortCodeAvailable ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {shortCodeAvailable ? 'Disponível' : 'Indisponível'}
                </span>
              )}
            </div>
            <p className="text-[var(--text-muted)] text-xs mb-4">
              Seu link ficará: painel.atlasdao.info/i/{customShortCode || 'seucodigo'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCustomizeModal(false)}
                className="flex-1 py-2 rounded-lg bg-[var(--bg-elevated)] hover:opacity-80 text-[var(--text-primary)] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCustomize}
                disabled={customizing || !shortCodeAvailable || customShortCode.length < 5}
                className="flex-1 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors disabled:opacity-50"
              >
                {customizing ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terms Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-[var(--bg-card)] rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[var(--accent)]" />
                Termos do Programa
              </h3>
              <button onClick={() => setShowTermsModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4 text-sm text-[var(--text-secondary)]">
              <p>
                <strong className="text-[var(--text-primary)]">1.</strong> Esta campanha é válida até{' '}
                <strong className="text-[var(--accent)]">05 de março de 2026</strong>, podendo ser encerrada a qualquer momento sem aviso prévio.
              </p>
              <p>
                <strong className="text-[var(--text-primary)]">2.</strong> Para participar, você precisa ter realizado pelo menos{' '}
                <strong className="text-[var(--text-primary)]">R$ 10.000</strong> em vendas na Atlas.
              </p>
              <p>
                <strong className="text-[var(--text-primary)]">3.</strong> Cada pessoa só pode ser indicada uma vez. Auto-indicação é proibida.
              </p>
              <p>
                <strong className="text-[var(--text-primary)]">4.</strong> Uma indicação é considerada válida quando o indicado realiza{' '}
                <strong className="text-[var(--text-primary)]">R$ 10.000</strong> em vendas dentro de <strong className="text-[var(--text-primary)]">3 meses</strong> após o cadastro.
              </p>
              <p>
                <strong className="text-[var(--text-primary)]">5.</strong> A comissão por indicação válida é um valor aleatório entre{' '}
                <strong className="text-green-600 dark:text-green-400">R$ 20</strong> e <strong className="text-green-600 dark:text-green-400">R$ 150</strong>, com chances iguais para todos os valores.
              </p>
              <p>
                <strong className="text-[var(--text-primary)]">6.</strong> O saque mínimo é de{' '}
                <strong className="text-[var(--text-primary)]">R$ 100</strong>, pago via DEPIX para carteira Liquid.
              </p>
              <p>
                <strong className="text-[var(--text-primary)]">7.</strong> O prazo para pagamento é de até <strong className="text-[var(--text-primary)]">48 horas</strong> após a solicitação.
              </p>
              <p>
                <strong className="text-[var(--text-primary)]">8.</strong> Qualquer tentativa de abuso do sistema resultará em{' '}
                <strong className="text-red-600 dark:text-red-400">bloqueio permanente</strong> da conta.
              </p>
            </div>
            <button
              onClick={() => setShowTermsModal(false)}
              className="w-full mt-6 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
