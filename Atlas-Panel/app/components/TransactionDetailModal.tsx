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
  Copy
} from 'lucide-react';
import toast from 'react-hot-toast';
import { translateStatus } from '@/app/lib/translations';
import { pixService } from '@/app/lib/services';

// Enhanced transaction styling helpers
const getStatusClass = (status: string) => {
  const statusMap: Record<string, string> = {
    'COMPLETED': 'transaction-status-professional transaction-status-completed',
    'PENDING': 'transaction-status-professional transaction-status-pending',
    'PROCESSING': 'transaction-status-professional transaction-status-processing',
    'FAILED': 'transaction-status-professional transaction-status-failed',
    'EXPIRED': 'transaction-status-professional transaction-status-expired',
    'CANCELLED': 'transaction-status-professional transaction-status-expired'
  };
  return statusMap[status] || 'transaction-status-professional transaction-status-expired';
};

const getAmountClass = (type: string) => {
  const typeMap: Record<string, string> = {
    'DEPOSIT': 'transaction-amount-display transaction-amount-deposit',
    'WITHDRAW': 'transaction-amount-display transaction-amount-withdraw',
    'TRANSFER': 'transaction-amount-display transaction-amount-transfer',
    'PAYMENT': 'transaction-amount-display transaction-amount-payment'
  };
  return typeMap[type] || 'transaction-amount-display transaction-amount-transfer';
};

const getIconContainerClass = (type: string) => {
  const typeMap: Record<string, string> = {
    'DEPOSIT': 'transaction-icon-container transaction-icon-deposit',
    'WITHDRAW': 'transaction-icon-container transaction-icon-withdraw',
    'TRANSFER': 'transaction-icon-container transaction-icon-transfer',
    'PAYMENT': 'transaction-icon-container transaction-icon-payment'
  };
  return typeMap[type] || 'transaction-icon-container transaction-icon-transfer';
};

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onTransactionUpdate?: (updatedTransaction: Transaction) => void;
}

export default function TransactionDetailModal({
  transaction,
  isOpen,
  onClose,
  onTransactionUpdate
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
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'PENDING':
        return <Clock className="text-yellow-500" size={20} />;
      case 'PROCESSING':
        return <RefreshCw className="text-blue-500 animate-spin" size={20} />;
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

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiado para a área de transferência!`);
    } catch (error) {
      toast.error('Erro ao copiar para a área de transferência');
    }
  };

  const checkTransactionStatus = async () => {
    setIsChecking(true);
    try {
      toast.loading('Verificando status da transação...', { id: transaction.id });

      const updatedStatus = await pixService.checkDepositStatus(transaction.id);

      // Update the transaction and notify parent
      const updatedTransaction = { ...transaction, ...updatedStatus };
      if (onTransactionUpdate) {
        onTransactionUpdate(updatedTransaction);
      }

      toast.success('Status da transação atualizado!', { id: transaction.id });
    } catch (error) {
      console.error('Error checking transaction status:', error);
      toast.error('Erro ao verificar status da transação', { id: transaction.id });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="transaction-modal-premium w-full max-w-[95vw] lg:max-w-6xl max-h-[90vh] flex flex-col">
          {/* Enhanced Header */}
          <div className="flex items-center justify-between p-8 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div className={getIconContainerClass(transaction.type)}>
                {getTransactionIcon(transaction.type)}
              </div>
              <div>
                <h2 className="transaction-heading-primary text-xl mb-1">
                  Detalhes da Transação
                </h2>
                <p className="transaction-text-caption">
                  {getTransactionLabel(transaction.type)} • {formatDate(transaction.createdAt)}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="transaction-action-btn p-3"
              aria-label="Fechar modal"
            >
              <X size={20} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
            {/* Status and Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Tipo de Transação</h3>
                <div className="flex items-center">
                  {getTransactionIcon(transaction.type)}
                  <span className="ml-2 text-lg font-medium text-white">
                    {getTransactionLabel(transaction.type)}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Status</h3>
                <div className="flex items-center">
                  {getStatusIcon(transaction.status)}
                  <span className="ml-2 text-lg font-medium text-white">
                    {getStatusLabel(transaction.status)}
                  </span>
                </div>
              </div>
            </div>

            {/* Amount */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">Valor</h3>
              <div className={`text-2xl font-bold ${
                transaction.type === 'DEPOSIT' ? 'text-green-500' :
                transaction.type === 'WITHDRAW' ? 'text-red-500' :
                'text-white'
              }`}>
                {transaction.type === 'DEPOSIT' ? '+' : '-'}
                {formatCurrency(transaction.amount)}
              </div>
            </div>

            {/* Transaction ID */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">ID da Transação</h3>
              <div className="flex items-center gap-2 bg-gray-700/50 p-3 rounded-lg">
                <code className="text-sm font-mono text-white break-all flex-1 min-w-0">{transaction.id}</code>
                <button
                  onClick={() => copyToClipboard(transaction.id, 'ID da transação')}
                  className="text-blue-400 hover:text-blue-300 transition-colors flex-shrink-0"
                  title="Copiar ID"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>

            {/* External ID */}
            {transaction.externalId && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">ID Externo</h3>
                <div className="flex items-center gap-2 bg-gray-700/50 p-3 rounded-lg">
                  <code className="text-sm font-mono text-white break-all flex-1 min-w-0">{transaction.externalId}</code>
                  <button
                    onClick={() => copyToClipboard(transaction.externalId!, 'ID externo')}
                    className="text-blue-400 hover:text-blue-300 transition-colors flex-shrink-0"
                    title="Copiar ID externo"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* PIX Key */}
            {transaction.pixKey && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Chave PIX</h3>
                <div className="flex items-center gap-2 bg-gray-700/50 p-3 rounded-lg">
                  <code className="text-sm font-mono text-white break-all flex-1 min-w-0">{transaction.pixKey}</code>
                  <button
                    onClick={() => copyToClipboard(transaction.pixKey!, 'Chave PIX')}
                    className="text-blue-400 hover:text-blue-300 transition-colors flex-shrink-0"
                    title="Copiar chave PIX"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Description */}
            {transaction.description && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Descrição</h3>
                <p className="text-white bg-gray-700/50 p-3 rounded-lg">{transaction.description}</p>
              </div>
            )}

            {/* Error Message */}
            {transaction.errorMessage && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Mensagem de Erro</h3>
                <p className="text-red-400 bg-red-900/20 border border-red-600 p-3 rounded-lg">
                  {transaction.errorMessage}
                </p>
              </div>
            )}

            {/* Timestamps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Data de Criação</h3>
                <p className="text-white">{formatDate(transaction.createdAt)}</p>
              </div>

              {transaction.processedAt && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Data de Processamento</h3>
                  <p className="text-white">{formatDate(transaction.processedAt)}</p>
                </div>
              )}
            </div>

            {/* DePix Address and Metadata */}
            {(transaction.metadata || transaction.pixKey) && (() => {
              try {
                const metadata = transaction.metadata ? JSON.parse(transaction.metadata) : {};
                const eulenResponse = metadata.eulenResponse || metadata;
                // DePix address can be in multiple places depending on transaction type
                const depixAddress = metadata.depixAddress ||
                                    eulenResponse?.depixAddress ||
                                    transaction.pixKey ||
                                    eulenResponse?.response?.depixAddress;

                return (
                  <>
                    {/* DePix Destination Address */}
                    {depixAddress && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-400 mb-2">
                          {transaction.type === 'DEPOSIT'
                            ? '🔹 Carteira DePix de Destino (Depósito)'
                            : '🔸 Endereço DePix'}
                        </h3>
                        <div className="flex items-center gap-2 bg-gradient-to-r from-green-900/30 to-green-800/20 border border-green-600 p-3 rounded-lg">
                          <code className="text-sm font-mono text-green-400 break-all flex-1 min-w-0">{depixAddress}</code>
                          <button
                            onClick={() => copyToClipboard(depixAddress, 'Endereço DePix')}
                            className="text-blue-400 hover:text-blue-300 transition-colors flex-shrink-0"
                            title="Copiar endereço DePix"
                          >
                            <Copy size={16} />
                          </button>
                        </div>
                        {transaction.type === 'DEPOSIT' && (
                          <p className="text-xs text-gray-400 mt-2">
                            Este é o endereço Liquid Network para onde os DePix foram enviados após conversão do PIX
                          </p>
                        )}
                      </div>
                    )}

                  {/* QR Code Information */}
                  {(eulenResponse?.qrCopyPaste || eulenResponse?.response?.qrCopyPaste) && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-400 mb-2">QR Code PIX</h3>
                      <div className="flex items-center gap-2 bg-gray-700/50 p-3 rounded-lg">
                        <code className="text-xs font-mono text-blue-400 break-all flex-1 min-w-0">
                          {(eulenResponse.qrCopyPaste || eulenResponse.response.qrCopyPaste).substring(0, 100)}...
                        </code>
                        <button
                          onClick={() => copyToClipboard(
                            eulenResponse.qrCopyPaste || eulenResponse.response.qrCopyPaste,
                            'QR Code PIX'
                          )}
                          className="text-blue-400 hover:text-blue-300 transition-colors flex-shrink-0"
                          title="Copiar QR Code"
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Currency Information */}
                  {transaction.currency && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-400 mb-2">Moeda</h3>
                      <p className="text-white bg-gray-700 p-3 rounded-lg font-mono">
                        {transaction.currency}
                      </p>
                    </div>
                  )}

                  {/* PIX Key Type */}
                  {transaction.pixKeyType && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-400 mb-2">Tipo da Chave PIX</h3>
                      <p className="text-white bg-gray-700/50 p-3 rounded-lg">
                        {transaction.pixKeyType}
                      </p>
                    </div>
                  )}

                  {/* Depix API Response Details */}
                  {eulenResponse && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-400 mb-2">Detalhes</h3>
                      <div className="bg-gray-700 p-4 rounded-lg space-y-3">
                        {/* Transaction ID from Depix */}
                        {(eulenResponse.response?.id || eulenResponse.id) && (
                          <div>
                            <h4 className="text-xs font-medium text-gray-400 mb-1">ID Depix</h4>
                            <div className="flex items-center gap-2">
                              <code className="text-sm font-mono text-yellow-400 break-all flex-1 min-w-0">
                                {eulenResponse.response?.id || eulenResponse.id}
                              </code>
                              <button
                                onClick={() => copyToClipboard(
                                  eulenResponse.response?.id || eulenResponse.id,
                                  'ID Depix'
                                )}
                                className="text-blue-400 hover:text-blue-300 transition-colors flex-shrink-0"
                                title="Copiar ID Depix"
                              >
                                <Copy size={14} />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Status from Depix */}
                        {(eulenResponse.response?.status || eulenResponse.status) && (
                          <div>
                            <h4 className="text-xs font-medium text-gray-400 mb-1">Status Depix</h4>
                            <span className="text-sm text-orange-400 font-medium">
                              {eulenResponse.response?.status || eulenResponse.status}
                            </span>
                          </div>
                        )}

                        {/* Async flag */}
                        {eulenResponse.async !== undefined && (
                          <div>
                            <h4 className="text-xs font-medium text-gray-400 mb-1">Processamento</h4>
                            <span className="text-sm text-purple-400">
                              {eulenResponse.async ? 'Assíncrono' : 'Síncrono'}
                            </span>
                          </div>
                        )}

                        {/* QR Image URL */}
                        {(eulenResponse.response?.qrImageUrl || eulenResponse.qrImageUrl) && (
                          <div>
                            <h4 className="text-xs font-medium text-gray-400 mb-1">URL da Imagem QR</h4>
                            <div className="flex items-center gap-2">
                              <code className="text-xs font-mono text-cyan-400 break-all flex-1 min-w-0">
                                {(eulenResponse.response?.qrImageUrl || eulenResponse.qrImageUrl).substring(0, 50)}...
                              </code>
                              <button
                                onClick={() => copyToClipboard(
                                  eulenResponse.response?.qrImageUrl || eulenResponse.qrImageUrl,
                                  'URL da imagem QR'
                                )}
                                className="text-blue-400 hover:text-blue-300 transition-colors flex-shrink-0"
                                title="Copiar URL da imagem"
                              >
                                <Copy size={14} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  </>
                );
              } catch (error) {
                return (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Metadados</h3>
                    <pre className="text-sm text-white bg-gray-700 p-3 rounded-lg overflow-x-auto">
                      {transaction.metadata}
                    </pre>
                  </div>
                );
              }
            })()}
          </div>

          {/* Footer */}
          <div className="flex justify-between p-6 border-t border-gray-700">
            <div>
              {(transaction.status === 'PENDING' || transaction.status === 'PROCESSING') && (
                <button
                  onClick={checkTransactionStatus}
                  disabled={isChecking}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg transition-all duration-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw size={16} className={`mr-2 ${isChecking ? 'animate-spin' : ''}`} />
                  {isChecking ? 'Verificando...' : 'Verificar Status'}
                </button>
              )}
            </div>
          </div>

            <button
              onClick={onClose}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
    </div>
  );
}