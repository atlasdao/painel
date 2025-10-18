'use client';

import { useState, useEffect, useRef } from 'react';
import { adminService } from '@/app/lib/services';
import { Transaction } from '@/app/types';
import {
  Search,
  Filter,
  Download,
  Calendar,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  X,
  Copy,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { translateStatus } from '@/app/lib/translations';

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const transactionsPerPage = 50;
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    userId: '',
    startDate: '',
    endDate: '',
    search: '',
  });
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    failed: 0,
    totalVolume: 0,
  });

  // Use ref to track if this is initial load to avoid infinite loops
  const initialLoadRef = useRef(true);

  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      loadTransactions();
    } else {
      // Reset to page 1 when filters change
      setCurrentPage(1);
    }
  }, [filters.status, filters.type, filters.userId, filters.search]);

  useEffect(() => {
    if (!initialLoadRef.current) {
      loadTransactions();
    }
  }, [currentPage]);

  const loadTransactions = async () => {
    const page = currentPage;
    setLoading(true);
    try {
      // For filtered searches, load all data to get accurate stats
      // For paginated view, load only the current page
      const hasFilters = filters.status || filters.type || filters.userId || filters.search;

      if (hasFilters) {
        // Load all filtered data for stats
        const allData = await adminService.getAllTransactions({
          status: filters.status || undefined,
          type: filters.type || undefined,
          userId: filters.userId || undefined,
        });

        // Filter by search term if provided
        let filteredData = allData;
        if (filters.search) {
          const searchTerm = filters.search.toLowerCase();
          filteredData = allData.filter(t =>
            t.id.toLowerCase().includes(searchTerm) ||
            t.userId.toLowerCase().includes(searchTerm)
          );
        }

        setTotalTransactions(filteredData.length);
        calculateStats(filteredData);

        // Paginate the filtered results
        const startIndex = (page - 1) * transactionsPerPage;
        const endIndex = startIndex + transactionsPerPage;
        setTransactions(filteredData.slice(startIndex, endIndex));
      } else {
        // Load paginated data for current page
        const offset = (page - 1) * transactionsPerPage;
        const data = await adminService.getAllTransactions({
          limit: transactionsPerPage,
          offset: offset,
        });

        setTransactions(data);

        // For unfiltered view, load first 1000 transactions to calculate stats
        // This is a reasonable compromise between performance and accuracy
        const statsData = await adminService.getAllTransactions({
          limit: 1000,
          offset: 0,
        });
        calculateStats(statsData);
        setTotalTransactions(1000); // Estimate - could be improved with a count endpoint
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Erro ao carregar transações');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: Transaction[]) => {
    const stats = data.reduce(
      (acc, t) => {
        acc.total++;
        if (t.status === 'COMPLETED') {
          acc.completed++;
          acc.totalVolume += t.amount;
        } else if (t.status === 'PENDING') {
          acc.pending++;
        } else if (t.status === 'FAILED') {
          acc.failed++;
        }
        return acc;
      },
      { total: 0, completed: 0, pending: 0, failed: 0, totalVolume: 0 }
    );
    setStats(stats);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTransaction(null);
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiado!`);
    } catch (error) {
      toast.error('Erro ao copiar');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'PENDING':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'PROCESSING':
        return <Activity className="w-4 h-4 text-blue-400" />;
      case 'FAILED':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'EXPIRED':
        return <Clock className="w-4 h-4 text-orange-400" />;
      case 'CANCELLED':
        return <XCircle className="w-4 h-4 text-gray-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-green-400 bg-green-900/50';
      case 'PENDING':
        return 'text-yellow-400 bg-yellow-900/50';
      case 'PROCESSING':
        return 'text-blue-400 bg-blue-900/50';
      case 'FAILED':
        return 'text-red-400 bg-red-900/50';
      case 'EXPIRED':
        return 'text-orange-400 bg-orange-900/50';
      case 'CANCELLED':
        return 'text-gray-400 bg-gray-700';
      default:
        return 'text-gray-400 bg-gray-700';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'DEPOSIT':
        return <ArrowDownLeft className="w-4 h-4" />;
      case 'WITHDRAW':
        return <ArrowUpRight className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const exportToCSV = async () => {
    try {
      setLoading(true);
      toast.loading('Exportando transações...');

      // Load all transactions for export (with filters if any)
      const allData = await adminService.getAllTransactions({
        status: filters.status || undefined,
        type: filters.type || undefined,
        userId: filters.userId || undefined,
      });

      // Filter by search term if provided
      let dataToExport = allData;
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        dataToExport = allData.filter(t =>
          t.id.toLowerCase().includes(searchTerm) ||
          t.userId.toLowerCase().includes(searchTerm)
        );
      }

      const headers = ['ID', 'Tipo', 'Status', 'Valor', 'Usuário', 'Data'];
      const rows = dataToExport.map((t) => [
        t.id,
        t.type,
        t.status,
        formatCurrency(t.amount),
        t.userId,
        formatDate(t.createdAt),
      ]);

      const csvContent = [headers, ...rows]
        .map((row) => row.join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.dismiss();
      toast.success(`${dataToExport.length} transações exportadas com sucesso!`);
    } catch (error) {
      toast.dismiss();
      toast.error('Erro ao exportar transações');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toaster position="top-right" />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold gradient-text">
              Todas as Transações
            </h1>
            <p className="text-gray-400 mt-2">
              Gerencie todas as transações do sistema
            </p>
          </div>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-5 h-5" />
            Exportar CSV
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total</p>
                <p className="text-2xl font-bold text-white">
                  {stats.total}
                </p>
              </div>
              <Activity className="w-8 h-8 text-purple-400" />
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Concluídas</p>
                <p className="text-2xl font-bold text-white">
                  {stats.completed}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Pendentes</p>
                <p className="text-2xl font-bold text-white">
                  {stats.pending}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Falhadas</p>
                <p className="text-2xl font-bold text-white">
                  {stats.failed}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Volume Total</p>
                <p className="text-xl font-bold text-white">
                  {formatCurrency(stats.totalVolume)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-400" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Buscar
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="ID ou usuário..."
                  className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Status
              </label>
              <select
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
              >
                <option value="">Todos</option>
                <option value="COMPLETED">Concluída</option>
                <option value="PENDING">Pendente</option>
                <option value="PROCESSING">Processando</option>
                <option value="FAILED">Falhou</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tipo
              </label>
              <select
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                value={filters.type}
                onChange={(e) =>
                  setFilters({ ...filters, type: e.target.value })
                }
              >
                <option value="">Todos</option>
                <option value="DEPOSIT">Depósito</option>
                <option value="WITHDRAW">Saque</option>
                <option value="TRANSFER">Transferência</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Data Inicial
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters({ ...filters, startDate: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Data Final
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters({ ...filters, endDate: e.target.value })
                }
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() =>
                  setFilters({
                    status: '',
                    type: '',
                    userId: '',
                    startDate: '',
                    endDate: '',
                    search: '',
                  })
                }
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="glass-card shadow-lg border border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">Nenhuma transação encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-modern">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">
                      Tipo
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">
                      Valor
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">
                      Usuário
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">
                      Data
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {transactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(transaction.type)}
                          <span className="text-sm text-gray-200">
                            {transaction.type === 'DEPOSIT'
                              ? 'Depósito'
                              : transaction.type === 'WITHDRAW'
                              ? 'Saque'
                              : 'Transferência'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(transaction.status)}
                          <span
                            className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusColor(
                              transaction.status
                            )}`}
                          >
                            {translateStatus(transaction.status)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm font-semibold text-white">
                          {formatCurrency(transaction.amount)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-300">
                          {transaction.user?.username || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-400">
                          {formatDate(transaction.createdAt)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button 
                          onClick={() => {
                            setSelectedTransaction(transaction);
                            setShowModal(true);
                          }}
                          className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          Ver detalhes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalTransactions > transactionsPerPage && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700">
                  <div className="text-sm text-gray-400">
                    Mostrando {Math.min((currentPage - 1) * transactionsPerPage + 1, totalTransactions)} a{' '}
                    {Math.min(currentPage * transactionsPerPage, totalTransactions)} de {totalTransactions} transações
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>

                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, Math.ceil(totalTransactions / transactionsPerPage)) }, (_, i) => {
                      const totalPages = Math.ceil(totalTransactions / transactionsPerPage);
                      let startPage = Math.max(1, currentPage - 2);
                      let endPage = Math.min(totalPages, startPage + 4);

                      if (endPage - startPage < 4) {
                        startPage = Math.max(1, endPage - 4);
                      }

                      const pageNum = startPage + i;
                      if (pageNum > totalPages) return null;

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 text-sm rounded ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 text-white hover:bg-gray-600'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalTransactions / transactionsPerPage)))}
                      disabled={currentPage >= Math.ceil(totalTransactions / transactionsPerPage)}
                      className="px-3 py-1 text-sm bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Transaction Details Modal */}
        {showModal && selectedTransaction && (
          <div className="modal-backdrop flex items-center justify-center z-50 p-4">
            <div className="glass-card shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <h2 className="text-xl font-bold text-white flex items-center">
                  {getTypeIcon(selectedTransaction.type)}
                  <span className="ml-2">Detalhes da Transação</span>
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Transaction Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">ID da Transação</h3>
                    <div className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
                      <code className="text-sm font-mono text-white">{selectedTransaction.id}</code>
                      <button
                        onClick={() => copyToClipboard(selectedTransaction.id, 'ID da transação')}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Usuário</h3>
                    <div className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
                      <code className="text-sm font-mono text-white">{selectedTransaction.userId}</code>
                      <button
                        onClick={() => copyToClipboard(selectedTransaction.userId, 'ID do usuário')}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Status and Type */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Tipo</h3>
                    <div className="flex items-center">
                      {getTypeIcon(selectedTransaction.type)}
                      <span className="ml-2 text-lg font-medium text-white">
                        {selectedTransaction.type === 'DEPOSIT' ? 'Depósito' :
                         selectedTransaction.type === 'WITHDRAW' ? 'Saque' : 'Transferência'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Status</h3>
                    <div className="flex items-center">
                      {getStatusIcon(selectedTransaction.status)}
                      <span className={`ml-2 text-sm font-semibold px-2 py-1 rounded-full ${getStatusColor(selectedTransaction.status)}`}>
                        {translateStatus(selectedTransaction.status)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Valor</h3>
                    <div className="text-2xl font-bold text-white">
                      {formatCurrency(selectedTransaction.amount)}
                    </div>
                  </div>
                </div>

                {/* PIX Information */}
                {selectedTransaction.pixKey && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">
                      {selectedTransaction.type === 'DEPOSIT' ? '🔹 Endereço DePix de Destino' : 'Chave PIX'}
                    </h3>
                    <div className="flex items-center justify-between bg-gradient-to-r from-green-900/30 to-green-800/20 border border-green-600 p-3 rounded-lg">
                      <code className="text-sm font-mono text-green-400 break-all">{selectedTransaction.pixKey}</code>
                      <button
                        onClick={() => copyToClipboard(selectedTransaction.pixKey!, 'Chave PIX')}
                        className="text-blue-400 hover:text-blue-300 transition-colors ml-2 flex-shrink-0"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* External ID */}
                {selectedTransaction.externalId && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">ID Externo (Depix)</h3>
                    <div className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
                      <code className="text-sm font-mono text-yellow-400">{selectedTransaction.externalId}</code>
                      <button
                        onClick={() => copyToClipboard(selectedTransaction.externalId!, 'ID externo')}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <Copy className="w-4 h-4" />
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

                {/* Metadata */}
                {selectedTransaction.metadata && (() => {
                  try {
                    const metadata = JSON.parse(selectedTransaction.metadata);
                    const eulenResponse = metadata.eulenResponse || metadata;
                    
                    return (
                      <>
                        {/* Depix API Details */}
                        {eulenResponse && (
                          <div>
                            <h3 className="text-sm font-medium text-gray-400 mb-2">Detalhes</h3>
                            <div className="bg-gray-700 p-4 rounded-lg space-y-3">
                              {eulenResponse.qrCode && (
                                <div>
                                  <h4 className="text-xs font-medium text-gray-400 mb-1">QR Code PIX</h4>
                                  <div className="flex items-center justify-between">
                                    <code className="text-xs font-mono text-blue-400 break-all">
                                      {eulenResponse.qrCode.substring(0, 50)}...
                                    </code>
                                    <button
                                      onClick={() => copyToClipboard(eulenResponse.qrCode, 'QR Code')}
                                      className="text-blue-400 hover:text-blue-300 transition-colors ml-2"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              )}

                              {eulenResponse.qrCodeImage && (
                                <div>
                                  <h4 className="text-xs font-medium text-gray-400 mb-1">URL da Imagem QR</h4>
                                  <a
                                    href={eulenResponse.qrCodeImage}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-mono text-cyan-400 hover:text-cyan-300 break-all"
                                  >
                                    {eulenResponse.qrCodeImage}
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Raw Metadata */}
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

                {/* Error Message */}
                {selectedTransaction.errorMessage && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Mensagem de Erro</h3>
                    <p className="text-red-400 bg-red-900/20 border border-red-600 p-3 rounded-lg">
                      {selectedTransaction.errorMessage}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end p-6 border-t border-gray-700">
                <button
                  onClick={handleCloseModal}
                  className="btn-outline transition duration-200"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}