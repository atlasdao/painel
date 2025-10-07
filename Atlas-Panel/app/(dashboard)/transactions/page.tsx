'use client';

import { useState, useEffect } from 'react';
import { pixService } from '@/app/lib/services';
import { Transaction } from '@/app/types';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  RefreshCw, 
  Filter,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  X,
  Copy
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { translateStatus } from '@/app/lib/translations';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'PENDING' | 'COMPLETED' | 'FAILED'>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const data = await pixService.getTransactions({ limit: 100 });
      setTransactions(data);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Erro ao carregar transações');
    } finally {
      setLoading(false);
    }
  };

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

  const filteredTransactions = transactions.filter(tx => {
    if (filter !== 'all' && tx.type !== filter) return false;
    if (statusFilter !== 'all' && tx.status !== statusFilter) return false;
    return true;
  });

  const exportToCSV = () => {
    const headers = ['Data', 'Tipo', 'Status', 'Valor', 'Descrição'];
    const rows = filteredTransactions.map(tx => [
      formatDate(tx.createdAt),
      getTransactionLabel(tx.type),
      getStatusLabel(tx.status),
      formatCurrency(tx.amount),
      tx.description || '-'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transacoes_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Transações exportadas com sucesso!');
  };

  const handleViewDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTransaction(null);
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiado para a área de transferência!`);
    } catch (error) {
      toast.error('Erro ao copiar para a área de transferência');
    }
  };

  const checkTransactionStatus = async (transactionId: string) => {
    try {
      toast.loading('Verificando status da transação...', { id: transactionId });
      
      const updatedStatus = await pixService.checkDepositStatus(transactionId);
      
      // Atualizar a transação local
      setTransactions(prev => 
        prev.map(tx => 
          tx.id === transactionId 
            ? { ...tx, ...updatedStatus }
            : tx
        )
      );
      
      toast.success('Status da transação atualizado!', { id: transactionId });
    } catch (error) {
      console.error('Error checking transaction status:', error);
      toast.error('Erro ao verificar status da transação', { id: transactionId });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Toaster position="top-right" />
      
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Minhas Transações</h1>
        
        <div className="flex space-x-2">
          <button
            onClick={loadTransactions}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition duration-200 flex items-center"
          >
            <RefreshCw className="mr-2" size={16} />
            Atualizar
          </button>
          
          <button
            onClick={exportToCSV}
            disabled={filteredTransactions.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="mr-2" size={16} />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-4 mb-6">
        <div className="flex items-center space-x-4">
          <Filter className="text-gray-400" size={20} />
          
          <div>
            <label className="text-sm text-gray-300 mr-2">Tipo:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-1 bg-gray-700 border border-gray-600 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos</option>
              <option value="DEPOSIT">Depósitos</option>
              <option value="WITHDRAW">Saques</option>
              <option value="TRANSFER">Transferências</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-300 mr-2">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1 bg-gray-700 border border-gray-600 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos</option>
              <option value="PENDING">Pendente</option>
              <option value="COMPLETED">Concluído</option>
              <option value="FAILED">Falhou</option>
            </select>
          </div>

          <div className="ml-auto text-sm text-gray-400">
            {filteredTransactions.length} transações encontradas
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="animate-spin text-blue-600" size={32} />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <AlertCircle size={48} className="mx-auto mb-4" />
            <p>Nenhuma transação encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Data/Hora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getTransactionIcon(transaction.type)}
                        <span className="ml-2 text-sm font-medium text-white">
                          {getTransactionLabel(transaction.type)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {formatDate(transaction.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(transaction.status)}
                        <span className="ml-2 text-sm text-white">
                          {getStatusLabel(transaction.status)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-semibold ${
                        transaction.type === 'DEPOSIT' ? 'text-green-600' : 
                        transaction.type === 'WITHDRAW' ? 'text-red-600' : 
                        'text-white'
                      }`}>
                        {transaction.type === 'DEPOSIT' ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-white">
                      {transaction.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 font-mono">
                      {transaction.id.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewDetails(transaction)}
                          className="text-blue-400 hover:text-blue-300 transition-colors flex items-center"
                          title="Ver detalhes"
                        >
                          <Eye size={16} />
                          <span className="ml-1">Detalhes</span>
                        </button>
                        
                        {(transaction.status === 'PENDING' || transaction.status === 'PROCESSING') && (
                          <button
                            onClick={() => checkTransactionStatus(transaction.id)}
                            className="text-green-400 hover:text-green-300 transition-colors flex items-center ml-2"
                            title="Verificar status atual"
                          >
                            <RefreshCw size={16} />
                            <span className="ml-1">Verificar</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Details Modal */}
      {showModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white flex items-center">
                {getTransactionIcon(selectedTransaction.type)}
                <span className="ml-2">Detalhes da Transação</span>
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status and Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Tipo de Transação</h3>
                  <div className="flex items-center">
                    {getTransactionIcon(selectedTransaction.type)}
                    <span className="ml-2 text-lg font-medium text-white">
                      {getTransactionLabel(selectedTransaction.type)}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Status</h3>
                  <div className="flex items-center">
                    {getStatusIcon(selectedTransaction.status)}
                    <span className="ml-2 text-lg font-medium text-white">
                      {getStatusLabel(selectedTransaction.status)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Amount */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Valor</h3>
                <div className={`text-2xl font-bold ${
                  selectedTransaction.type === 'DEPOSIT' ? 'text-green-500' : 
                  selectedTransaction.type === 'WITHDRAW' ? 'text-red-500' : 
                  'text-white'
                }`}>
                  {selectedTransaction.type === 'DEPOSIT' ? '+' : '-'}
                  {formatCurrency(selectedTransaction.amount)}
                </div>
              </div>

              {/* Transaction ID */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">ID da Transação</h3>
                <div className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
                  <code className="text-sm font-mono text-white">{selectedTransaction.id}</code>
                  <button
                    onClick={() => copyToClipboard(selectedTransaction.id, 'ID da transação')}
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                    title="Copiar ID"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>

              {/* External ID */}
              {selectedTransaction.externalId && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">ID Externo</h3>
                  <div className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
                    <code className="text-sm font-mono text-white">{selectedTransaction.externalId}</code>
                    <button
                      onClick={() => copyToClipboard(selectedTransaction.externalId!, 'ID externo')}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                      title="Copiar ID externo"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* PIX Key */}
              {selectedTransaction.pixKey && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Chave PIX</h3>
                  <div className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
                    <code className="text-sm font-mono text-white">{selectedTransaction.pixKey}</code>
                    <button
                      onClick={() => copyToClipboard(selectedTransaction.pixKey!, 'Chave PIX')}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                      title="Copiar chave PIX"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Description */}
              {selectedTransaction.description && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Descrição</h3>
                  <p className="text-white bg-gray-700 p-3 rounded-lg">{selectedTransaction.description}</p>
                </div>
              )}

              {/* Error Message */}
              {selectedTransaction.errorMessage && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Mensagem de Erro</h3>
                  <p className="text-red-400 bg-red-900/20 border border-red-600 p-3 rounded-lg">
                    {selectedTransaction.errorMessage}
                  </p>
                </div>
              )}

              {/* Timestamps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Data de Criação</h3>
                  <p className="text-white">{formatDate(selectedTransaction.createdAt)}</p>
                </div>

                {selectedTransaction.processedAt && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Data de Processamento</h3>
                    <p className="text-white">{formatDate(selectedTransaction.processedAt)}</p>
                  </div>
                )}
              </div>

              {/* DePix Address and Metadata */}
              {(selectedTransaction.metadata || selectedTransaction.pixKey) && (() => {
                try {
                  const metadata = selectedTransaction.metadata ? JSON.parse(selectedTransaction.metadata) : {};
                  const eulenResponse = metadata.eulenResponse || metadata;
                  // DePix address can be in multiple places depending on transaction type
                  const depixAddress = metadata.depixAddress || 
                                      eulenResponse?.depixAddress || 
                                      selectedTransaction.pixKey || 
                                      eulenResponse?.response?.depixAddress;
                  
                  return (
                    <>
                      {/* DePix Destination Address */}
                      {depixAddress && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-400 mb-2">
                            {selectedTransaction.type === 'DEPOSIT' 
                              ? '🔹 Carteira DePix de Destino (Depósito)' 
                              : '🔸 Endereço DePix'}
                          </h3>
                          <div className="flex items-center justify-between bg-gradient-to-r from-green-900/30 to-green-800/20 border border-green-600 p-3 rounded-lg">
                            <code className="text-sm font-mono text-green-400 break-all">{depixAddress}</code>
                            <button
                              onClick={() => copyToClipboard(depixAddress, 'Endereço DePix')}
                              className="text-blue-400 hover:text-blue-300 transition-colors ml-2 flex-shrink-0"
                              title="Copiar endereço DePix"
                            >
                              <Copy size={16} />
                            </button>
                          </div>
                          {selectedTransaction.type === 'DEPOSIT' && (
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
                          <div className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
                            <code className="text-xs font-mono text-blue-400 break-all">
                              {(eulenResponse.qrCopyPaste || eulenResponse.response.qrCopyPaste).substring(0, 100)}...
                            </code>
                            <button
                              onClick={() => copyToClipboard(
                                eulenResponse.qrCopyPaste || eulenResponse.response.qrCopyPaste, 
                                'QR Code PIX'
                              )}
                              className="text-blue-400 hover:text-blue-300 transition-colors ml-2 flex-shrink-0"
                              title="Copiar QR Code"
                            >
                              <Copy size={16} />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Currency Information */}
                      {selectedTransaction.currency && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-400 mb-2">Moeda</h3>
                          <p className="text-white bg-gray-700 p-3 rounded-lg font-mono">
                            {selectedTransaction.currency}
                          </p>
                        </div>
                      )}

                      {/* PIX Key Type */}
                      {selectedTransaction.pixKeyType && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-400 mb-2">Tipo da Chave PIX</h3>
                          <p className="text-white bg-gray-700 p-3 rounded-lg">
                            {selectedTransaction.pixKeyType}
                          </p>
                        </div>
                      )}

                      {/* Eulen API Response Details */}
                      {eulenResponse && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-400 mb-2">Detalhes da API Eulen</h3>
                          <div className="bg-gray-700 p-4 rounded-lg space-y-3">
                            {/* Transaction ID from Eulen */}
                            {(eulenResponse.response?.id || eulenResponse.id) && (
                              <div>
                                <h4 className="text-xs font-medium text-gray-400 mb-1">ID Eulen</h4>
                                <div className="flex items-center justify-between">
                                  <code className="text-sm font-mono text-yellow-400">
                                    {eulenResponse.response?.id || eulenResponse.id}
                                  </code>
                                  <button
                                    onClick={() => copyToClipboard(
                                      eulenResponse.response?.id || eulenResponse.id, 
                                      'ID Eulen'
                                    )}
                                    className="text-blue-400 hover:text-blue-300 transition-colors"
                                    title="Copiar ID Eulen"
                                  >
                                    <Copy size={14} />
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Status from Eulen */}
                            {(eulenResponse.response?.status || eulenResponse.status) && (
                              <div>
                                <h4 className="text-xs font-medium text-gray-400 mb-1">Status Eulen</h4>
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
                                <div className="flex items-center justify-between">
                                  <code className="text-xs font-mono text-cyan-400 break-all">
                                    {(eulenResponse.response?.qrImageUrl || eulenResponse.qrImageUrl).substring(0, 50)}...
                                  </code>
                                  <button
                                    onClick={() => copyToClipboard(
                                      eulenResponse.response?.qrImageUrl || eulenResponse.qrImageUrl, 
                                      'URL da imagem QR'
                                    )}
                                    className="text-blue-400 hover:text-blue-300 transition-colors ml-2"
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

                      {/* Raw Metadata (collapsible) */}
                      <details className="group">
                        <summary className="text-sm font-medium text-gray-400 mb-2 cursor-pointer hover:text-gray-300 transition-colors">
                          📋 Metadados Brutos (clique para expandir)
                        </summary>
                        <pre className="text-xs text-gray-300 bg-gray-900 p-3 rounded-lg overflow-x-auto mt-2 border border-gray-600">
                          {JSON.stringify(metadata, null, 2)}
                        </pre>
                      </details>
                    </>
                  );
                } catch (error) {
                  return (
                    <div>
                      <h3 className="text-sm font-medium text-gray-400 mb-2">Metadados</h3>
                      <pre className="text-sm text-white bg-gray-700 p-3 rounded-lg overflow-x-auto">
                        {selectedTransaction.metadata}
                      </pre>
                    </div>
                  );
                }
              })()}
            </div>

            <div className="flex justify-between p-6 border-t border-gray-700">
              <div>
                {(selectedTransaction.status === 'PENDING' || selectedTransaction.status === 'PROCESSING') && (
                  <button
                    onClick={() => {
                      checkTransactionStatus(selectedTransaction.id);
                      // Update selected transaction when status is checked
                      setTimeout(() => {
                        const updatedTransaction = transactions.find(tx => tx.id === selectedTransaction.id);
                        if (updatedTransaction) {
                          setSelectedTransaction(updatedTransaction);
                        }
                      }, 1000);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-200 flex items-center"
                  >
                    <RefreshCw size={16} className="mr-2" />
                    Verificar Status
                  </button>
                )}
              </div>
              
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition duration-200"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}