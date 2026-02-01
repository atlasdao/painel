'use client';

import { useState } from 'react';
import { Transaction } from '@/app/types';
import {
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  X,
  Copy,
  Search,
  Link2,
  QrCode
} from 'lucide-react';
import toast from 'react-hot-toast';
import { translateStatus } from '@/app/lib/translations';
import { pixService } from '@/app/lib/services';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onTransactionUpdate?: (updatedTransaction: Transaction) => void;
  isAdmin?: boolean;
}

export default function TransactionDetailModal({
  transaction,
  isOpen,
  onClose,
  onTransactionUpdate,
  isAdmin = false
}: TransactionDetailModalProps) {
  const [isChecking, setIsChecking] = useState(false);

  if (!isOpen || !transaction) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="text-blue-500" size={20} />; // Azul para Recebido
      case 'PENDING':
        return <Clock className="text-yellow-500" size={20} />;
      case 'PROCESSING':
        return <CheckCircle className="text-green-500" size={20} />; // Verde para Pago
      case 'IN_REVIEW':
        return <Search className="text-purple-500" size={20} />;
      case 'FAILED':
        return <XCircle className="text-red-500" size={20} />;
      case 'EXPIRED':
        return <Clock className="text-orange-500" size={20} />;
      case 'CANCELLED':
        return <XCircle className="text-gray-500" size={20} />;
      default:
        return <AlertCircle className="text-gray-400" size={20} />;
    }
  };

  const getStatusLabel = (status: string) => {
    return translateStatus(status);
  };

  const getStatusTooltip = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'Recebido em sua carteira';
      case 'PROCESSING':
        return 'Pago. Liberação na próxima remessa';
      case 'PENDING':
        return 'Aguardando pagamento';
      case 'IN_REVIEW':
        return 'Contate o suporte';
      case 'FAILED':
        return 'Pagamento cancelado ou não concluído';
      case 'EXPIRED':
        return 'Tempo limite excedido';
      case 'CANCELLED':
        return 'Transação cancelada';
      default:
        return '';
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'DEPOSIT':
        return <ArrowDownLeft className="text-green-600" size={20} />;
      case 'WITHDRAW':
        return <ArrowUpRight className="text-red-600" size={20} />;
      case 'TRANSFER':
        return <RefreshCw className="text-blue-600" size={20} />;
      default:
        return <AlertCircle className="text-gray-600" size={20} />;
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'DEPOSIT':
        return 'Depósito';
      case 'WITHDRAW':
        return 'Saque';
      case 'TRANSFER':
        return 'Transferência';
      default:
        return type;
    }
  };

  const getPaymentMethod = () => {
    if (!transaction.metadata) return null;

    try {
      const metadata = JSON.parse(transaction.metadata);

      // Se tem paymentLinkId e shortCode, foi via Link de Pagamento
      if (metadata.paymentLinkId && metadata.shortCode) {
        return {
          type: 'link',
          icon: <Link2 className="text-blue-400" size={18} />,
          label: 'Link de Pagamento',
          color: '#60a5fa'
        };
      }

      // Se tem isQrCodePayment mas não tem paymentLinkId, foi QR Code direto da API
      if (metadata.isQrCodePayment && !metadata.paymentLinkId) {
        return {
          type: 'qrcode',
          icon: <QrCode className="text-purple-400" size={18} />,
          label: 'QR Code (API)',
          color: '#c084fc'
        };
      }
    } catch (error) {
      console.error('Error parsing metadata:', error);
    }

    return null;
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiado!`);
    } catch (error) {
      toast.error('Erro ao copiar');
    }
  };

  const checkTransactionStatus = async () => {
    setIsChecking(true);
    try {
      toast.loading('Verificando status...', { id: transaction.id });
      const updatedStatus = await pixService.checkDepositStatus(transaction.id);
      const updatedTransaction = { ...transaction, ...updatedStatus };
      if (onTransactionUpdate) {
        onTransactionUpdate(updatedTransaction);
      }
      toast.success('Status atualizado!', { id: transaction.id });
    } catch (error) {
      console.error('Error checking transaction status:', error);
      toast.error('Erro ao verificar status', { id: transaction.id });
    } finally {
      setIsChecking(false);
    }
  };

  // Altura do header e footer
  const HEADER_HEIGHT = 70;
  const FOOTER_HEIGHT = 80;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        padding: '20px'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          backgroundColor: '#1f2937',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '900px',
          height: '90vh',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
          overflow: 'hidden'
        }}
      >
        {/* HEADER - Position Absolute */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: `${HEADER_HEIGHT}px`,
          padding: '20px 24px',
          borderBottom: '1px solid #374151',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#1f2937',
          zIndex: 10
        }}>
          <h2 style={{ color: 'white', fontSize: '22px', fontWeight: '600', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            Detalhes da Transação
          </h2>
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#374151',
              border: 'none',
              borderRadius: '8px',
              padding: '10px',
              cursor: 'pointer',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#4b5563'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#374151'}
          >
            <X size={20} />
          </button>
        </div>

        {/* CONTEÚDO SCROLLABLE - Com altura calculada */}
        <div style={{
          position: 'absolute',
          top: `${HEADER_HEIGHT}px`,
          left: 0,
          right: 0,
          bottom: `${FOOTER_HEIGHT}px`,
          overflowY: 'scroll',
          overflowX: 'hidden',
          padding: '24px',
          color: 'white',
          backgroundColor: '#1f2937'
        }}>
          <div style={{ paddingBottom: '20px' }}>
            {/* Tipo e Status */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
              <div>
                <div style={{ color: '#9ca3af', fontSize: '13px', fontWeight: '500', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tipo</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#374151', padding: '14px', borderRadius: '10px' }}>
                  {getTransactionIcon(transaction.type)}
                  <span style={{ fontSize: '16px', fontWeight: '500' }}>{getTransactionLabel(transaction.type)}</span>
                </div>
              </div>
              <div>
                <div style={{ color: '#9ca3af', fontSize: '13px', fontWeight: '500', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</div>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#374151', padding: '14px', borderRadius: '10px', cursor: 'help' }}
                  title={getStatusTooltip(transaction.status)}
                >
                  {getStatusIcon(transaction.status)}
                  <span style={{ fontSize: '16px', fontWeight: '500' }}>{getStatusLabel(transaction.status)}</span>
                </div>
              </div>
            </div>

            {/* Nome do Cliente e Método de Pagamento */}
            {(transaction.status === 'COMPLETED' && (transaction.buyerName || getPaymentMethod())) && (
              <div style={{ display: 'grid', gridTemplateColumns: getPaymentMethod() && transaction.buyerName ? '1fr 1fr' : '1fr', gap: '24px', marginBottom: '24px' }}>
                {transaction.buyerName && (
                  <div>
                    <div style={{ color: '#9ca3af', fontSize: '13px', fontWeight: '500', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cliente</div>
                    <div style={{
                      backgroundColor: '#374151',
                      padding: '14px',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <span style={{ fontSize: '16px', fontWeight: '500' }}>{transaction.buyerName}</span>
                    </div>
                  </div>
                )}
                {getPaymentMethod() && (
                  <div>
                    <div style={{ color: '#9ca3af', fontSize: '13px', fontWeight: '500', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Método de Pagamento</div>
                    <div style={{
                      backgroundColor: '#374151',
                      padding: '14px',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      border: `1px solid ${getPaymentMethod()!.color}40`
                    }}>
                      {getPaymentMethod()!.icon}
                      <span style={{ fontSize: '16px', fontWeight: '500', color: getPaymentMethod()!.color }}>{getPaymentMethod()!.label}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Valor */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ color: '#9ca3af', fontSize: '13px', fontWeight: '500', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Valor</div>
              <div style={{
                fontSize: '32px',
                fontWeight: '700',
                color: transaction.type === 'DEPOSIT' ? '#10b981' : '#ef4444',
                backgroundColor: transaction.type === 'DEPOSIT' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                padding: '16px',
                borderRadius: '10px',
                border: `2px solid ${transaction.type === 'DEPOSIT' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
              }}>
                {transaction.type === 'DEPOSIT' ? '+' : '-'}{formatCurrency(transaction.amount)}
              </div>
            </div>

            {/* ID da Transação */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ color: '#9ca3af', fontSize: '13px', fontWeight: '500', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ID da Transação</div>
              <div style={{
                backgroundColor: '#374151',
                padding: '14px',
                borderRadius: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <code style={{ fontSize: '14px', fontFamily: 'monospace', wordBreak: 'break-all', flex: 1 }}>{transaction.id}</code>
                <button
                  onClick={() => copyToClipboard(transaction.id, 'ID')}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#60a5fa',
                    cursor: 'pointer',
                    padding: '8px',
                    marginLeft: '8px'
                  }}
                >
                  <Copy size={18} />
                </button>
              </div>
            </div>

            {/* External ID */}
            {isAdmin && transaction.externalId && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ color: '#9ca3af', fontSize: '13px', fontWeight: '500', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ID Externo (DePix)</div>
                <div style={{
                  backgroundColor: '#374151',
                  padding: '14px',
                  borderRadius: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <code style={{ fontSize: '14px', fontFamily: 'monospace', wordBreak: 'break-all', flex: 1 }}>{transaction.externalId}</code>
                  <button
                    onClick={() => copyToClipboard(transaction.externalId!, 'ID Externo')}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#60a5fa',
                      cursor: 'pointer',
                      padding: '8px',
                      marginLeft: '8px'
                    }}
                  >
                    <Copy size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* PIX Key */}
            {transaction.pixKey && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ color: '#9ca3af', fontSize: '13px', fontWeight: '500', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Carteira</div>
                <div style={{
                  backgroundColor: '#374151',
                  padding: '14px',
                  borderRadius: '10px'
                }}>
                  <code style={{ fontSize: '14px', fontFamily: 'monospace', wordBreak: 'break-all' }}>{transaction.pixKey}</code>
                </div>
              </div>
            )}

            {/* Descrição */}
            {transaction.description && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ color: '#9ca3af', fontSize: '13px', fontWeight: '500', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Descrição</div>
                <div style={{
                  backgroundColor: '#374151',
                  padding: '14px',
                  borderRadius: '10px',
                  lineHeight: '1.6'
                }}>
                  {transaction.description}
                </div>
              </div>
            )}

            {/* Error Message */}
            {transaction.errorMessage && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ color: '#9ca3af', fontSize: '13px', fontWeight: '500', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mensagem de Erro</div>
                <div style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  padding: '14px',
                  borderRadius: '10px',
                  color: '#fca5a5',
                  lineHeight: '1.6'
                }}>
                  {transaction.errorMessage}
                </div>
              </div>
            )}

            {/* Data de Criação */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ color: '#9ca3af', fontSize: '13px', fontWeight: '500', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Data de Criação</div>
              <div style={{ fontSize: '16px', backgroundColor: '#374151', padding: '14px', borderRadius: '10px' }}>
                {formatDate(transaction.createdAt)}
              </div>
            </div>

            {/* Data de Processamento */}
            {transaction.processedAt && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ color: '#9ca3af', fontSize: '13px', fontWeight: '500', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Data de Processamento</div>
                <div style={{ fontSize: '16px', backgroundColor: '#374151', padding: '14px', borderRadius: '10px' }}>
                  {formatDate(transaction.processedAt)}
                </div>
              </div>
            )}

            {/* Pagamento Agendado (D+1) */}
            {(() => {
              if (!transaction.metadata) return null;
              try {
                const metadata = JSON.parse(transaction.metadata);
                if (!metadata.delayedPaymentEnabled || !metadata.scheduledPaymentAt) return null;

                const scheduledDate = new Date(metadata.scheduledPaymentAt);
                const now = new Date();
                const isPaid = transaction.status === 'COMPLETED';
                const isPending = scheduledDate > now && !isPaid;

                return (
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ color: '#9ca3af', fontSize: '13px', fontWeight: '500', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Pagamento Agendado (D+1)
                    </div>
                    <div style={{
                      backgroundColor: isPaid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                      border: `1px solid ${isPaid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`,
                      padding: '14px',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <Clock size={20} style={{ color: isPaid ? '#10b981' : '#fbbf24' }} />
                      <div>
                        <div style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: isPaid ? '#10b981' : '#fbbf24'
                        }}>
                          {formatDate(metadata.scheduledPaymentAt)}
                        </div>
                        <div style={{
                          fontSize: '13px',
                          color: isPaid ? '#6ee7b7' : '#fcd34d',
                          marginTop: '4px'
                        }}>
                          {isPaid ? '✓ Pagamento realizado' : isPending ? '⏳ Aguardando janela de pagamento' : '⏳ Processando...'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              } catch {
                return null;
              }
            })()}

            {/* Espaço extra para garantir scroll */}
            <div style={{ height: '100px' }}></div>
          </div>
        </div>

        {/* FOOTER - Position Absolute */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: `${FOOTER_HEIGHT}px`,
          padding: '20px 24px',
          borderTop: '1px solid #374151',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#1f2937',
          zIndex: 10
        }}>
          <div>
            {(transaction.status === 'PENDING' || transaction.status === 'PROCESSING' || transaction.status === 'IN_REVIEW') && (
              <button
                onClick={checkTransactionStatus}
                disabled={isChecking}
                style={{
                  background: isChecking ? '#6b7280' : 'linear-gradient(to right, #2563eb, #7c3aed)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  cursor: isChecking ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '15px'
                }}
              >
                <RefreshCw size={18} className={isChecking ? 'animate-spin' : ''} />
                {isChecking ? 'Verificando...' : 'Verificar Status'}
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#374151',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '15px'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#4b5563'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#374151'}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
