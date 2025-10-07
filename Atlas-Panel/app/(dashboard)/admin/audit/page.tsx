'use client';

import { useState, useEffect } from 'react';
import { adminService } from '@/app/lib/services';
import {
  Search,
  Filter,
  Download,
  Calendar,
  Activity,
  User,
  Shield,
  Eye,
  X,
  Copy,
  Clock,
  FileText,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface AuditLog {
  id: string;
  userId?: string;
  user?: {
    username: string;
    email: string;
  };
  transactionId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestBody?: string;
  responseBody?: string;
  statusCode?: number;
  duration?: number;
  createdAt: string;
}

export default function AdminAuditPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    userId: '',
    action: '',
    resource: '',
    startDate: '',
    endDate: '',
    search: '',
  });
  const [stats, setStats] = useState({
    total: 0,
    todayCount: 0,
    weekCount: 0,
    monthCount: 0,
  });

  useEffect(() => {
    loadAuditLogs();
  }, [filters]);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const data = await adminService.getAuditLogs({
        userId: filters.userId || undefined,
        action: filters.action || undefined,
        resource: filters.resource || undefined,
        startDate: filters.startDate ? new Date(filters.startDate) : undefined,
        endDate: filters.endDate ? new Date(filters.endDate) : undefined,
        take: 100, // Limit to 100 records for performance
      });
      setAuditLogs(data);
      calculateStats(data);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      toast.error('Erro ao carregar logs de auditoria');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: AuditLog[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const stats = data.reduce(
      (acc, log) => {
        const logDate = new Date(log.createdAt);
        acc.total++;
        if (logDate >= today) acc.todayCount++;
        if (logDate >= weekAgo) acc.weekCount++;
        if (logDate >= monthAgo) acc.monthCount++;
        return acc;
      },
      { total: 0, todayCount: 0, weekCount: 0, monthCount: 0 }
    );
    setStats(stats);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedLog(null);
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiado!`);
    } catch (error) {
      toast.error('Erro ao copiar');
    }
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(date));
  };

  const getActionIcon = (action: string) => {
    if (action.includes('LOGIN') || action.includes('LOGOUT')) {
      return <User className="w-4 h-4 text-blue-400" />;
    }
    if (action.includes('CREATE') || action.includes('POST')) {
      return <div className="w-4 h-4 bg-green-400 rounded-full" />;
    }
    if (action.includes('UPDATE') || action.includes('PUT') || action.includes('PATCH')) {
      return <div className="w-4 h-4 bg-yellow-400 rounded-full" />;
    }
    if (action.includes('DELETE')) {
      return <div className="w-4 h-4 bg-red-400 rounded-full" />;
    }
    return <Activity className="w-4 h-4 text-gray-400" />;
  };

  const getStatusColor = (statusCode?: number) => {
    if (!statusCode) return 'text-gray-400';
    if (statusCode >= 200 && statusCode < 300) return 'text-green-400';
    if (statusCode >= 400 && statusCode < 500) return 'text-yellow-400';
    if (statusCode >= 500) return 'text-red-400';
    return 'text-gray-400';
  };

  const exportToCSV = () => {
    const headers = ['Data', 'Usuário', 'Ação', 'Recurso', 'Status', 'IP', 'Duração (ms)'];
    const rows = auditLogs.map((log) => [
      formatDate(log.createdAt),
      log.user?.username || log.userId || 'Sistema',
      log.action,
      log.resource,
      log.statusCode || 'N/A',
      log.ipAddress || 'N/A',
      log.duration || 'N/A',
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Logs de auditoria exportados com sucesso!');
  };

  const filteredLogs = auditLogs.filter((log) => {
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      return (
        log.action.toLowerCase().includes(searchTerm) ||
        log.resource.toLowerCase().includes(searchTerm) ||
        log.user?.username?.toLowerCase().includes(searchTerm) ||
        log.userId?.toLowerCase().includes(searchTerm) ||
        log.ipAddress?.toLowerCase().includes(searchTerm)
      );
    }
    return true;
  });

  return (
    <>
      <Toaster position="top-right" />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold gradient-text">
              Logs de Auditoria
            </h1>
            <p className="text-gray-400 mt-2">
              Visualize e monitore todas as ações realizadas no sistema
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total de Logs</p>
                <p className="text-2xl font-bold text-white">
                  {stats.total}
                </p>
              </div>
              <FileText className="w-8 h-8 text-purple-400" />
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Hoje</p>
                <p className="text-2xl font-bold text-white">
                  {stats.todayCount}
                </p>
              </div>
              <Clock className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Últimos 7 dias</p>
                <p className="text-2xl font-bold text-white">
                  {stats.weekCount}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Últimos 30 dias</p>
                <p className="text-2xl font-bold text-white">
                  {stats.monthCount}
                </p>
              </div>
              <Shield className="w-8 h-8 text-yellow-400" />
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
                  placeholder="Ação, recurso, usuário..."
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
                Ação
              </label>
              <input
                type="text"
                placeholder="Ex: LOGIN, GET, POST..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                value={filters.action}
                onChange={(e) =>
                  setFilters({ ...filters, action: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Recurso
              </label>
              <input
                type="text"
                placeholder="Ex: /admin/users..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                value={filters.resource}
                onChange={(e) =>
                  setFilters({ ...filters, resource: e.target.value })
                }
              />
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
                    userId: '',
                    action: '',
                    resource: '',
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

        {/* Audit Logs Table */}
        <div className="glass-card shadow-lg border border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">Nenhum log de auditoria encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-modern">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">
                      Data/Hora
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">
                      Usuário
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">
                      Ação
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">
                      Recurso
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">
                      IP Address
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">
                      Duração
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-300">
                          {formatDate(log.createdAt)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-200">
                            {log.user?.username || log.userId || 'Sistema'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.action)}
                          <span className="text-sm text-gray-200">
                            {log.action}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-300 font-mono">
                          {log.resource}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-sm font-semibold ${getStatusColor(log.statusCode)}`}>
                          {log.statusCode || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-400 font-mono">
                          {log.ipAddress || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-400">
                          {log.duration ? `${log.duration}ms` : 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button 
                          onClick={() => {
                            setSelectedLog(log);
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
            </div>
          )}
        </div>

        {/* Audit Log Details Modal */}
        {showModal && selectedLog && (
          <div className="modal-backdrop flex items-center justify-center z-50 p-4">
            <div className="glass-card shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <h2 className="text-xl font-bold text-white flex items-center">
                  <FileText className="w-6 h-6 mr-2" />
                  Detalhes do Log de Auditoria
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">ID do Log</h3>
                    <div className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
                      <code className="text-sm font-mono text-white">{selectedLog.id}</code>
                      <button
                        onClick={() => copyToClipboard(selectedLog.id, 'ID do log')}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Data/Hora</h3>
                    <p className="text-white bg-gray-700 p-3 rounded-lg">{formatDate(selectedLog.createdAt)}</p>
                  </div>
                </div>

                {/* User Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Usuário</h3>
                    <div className="bg-gray-700 p-3 rounded-lg">
                      <p className="text-white">{selectedLog.user?.username || 'Sistema'}</p>
                      {selectedLog.user?.email && (
                        <p className="text-gray-400 text-sm">{selectedLog.user.email}</p>
                      )}
                      {selectedLog.userId && (
                        <p className="text-gray-400 text-xs font-mono mt-1">ID: {selectedLog.userId}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Endereço IP</h3>
                    <p className="text-white bg-gray-700 p-3 rounded-lg font-mono">
                      {selectedLog.ipAddress || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Action and Resource */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Ação</h3>
                    <div className="flex items-center bg-gray-700 p-3 rounded-lg">
                      {getActionIcon(selectedLog.action)}
                      <span className="ml-2 text-white font-medium">{selectedLog.action}</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Recurso</h3>
                    <p className="text-white bg-gray-700 p-3 rounded-lg font-mono break-all">
                      {selectedLog.resource}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Status HTTP</h3>
                    <p className={`text-lg font-bold bg-gray-700 p-3 rounded-lg ${getStatusColor(selectedLog.statusCode)}`}>
                      {selectedLog.statusCode || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Performance and Technical Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Duração da Requisição</h3>
                    <p className="text-white bg-gray-700 p-3 rounded-lg">
                      {selectedLog.duration ? `${selectedLog.duration}ms` : 'N/A'}
                    </p>
                  </div>

                  {selectedLog.resourceId && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-400 mb-2">ID do Recurso</h3>
                      <div className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
                        <code className="text-sm font-mono text-yellow-400">{selectedLog.resourceId}</code>
                        <button
                          onClick={() => copyToClipboard(selectedLog.resourceId!, 'ID do recurso')}
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* User Agent */}
                {selectedLog.userAgent && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">User Agent</h3>
                    <div className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
                      <p className="text-white text-sm break-all">{selectedLog.userAgent}</p>
                      <button
                        onClick={() => copyToClipboard(selectedLog.userAgent!, 'User Agent')}
                        className="text-blue-400 hover:text-blue-300 transition-colors ml-2 flex-shrink-0"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Request Body */}
                {selectedLog.requestBody && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Dados da Requisição</h3>
                    <details className="group">
                      <summary className="text-sm font-medium text-blue-400 mb-2 cursor-pointer hover:text-blue-300 transition-colors">
                        📤 Clique para expandir
                      </summary>
                      <pre className="text-xs text-gray-300 bg-gray-900 p-3 rounded-lg overflow-x-auto mt-2 border border-gray-600">
                        {JSON.stringify(JSON.parse(selectedLog.requestBody), null, 2)}
                      </pre>
                    </details>
                  </div>
                )}

                {/* Response Body */}
                {selectedLog.responseBody && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Resposta da API</h3>
                    <details className="group">
                      <summary className="text-sm font-medium text-green-400 mb-2 cursor-pointer hover:text-green-300 transition-colors">
                        📥 Clique para expandir
                      </summary>
                      <pre className="text-xs text-gray-300 bg-gray-900 p-3 rounded-lg overflow-x-auto mt-2 border border-gray-600">
                        {JSON.stringify(JSON.parse(selectedLog.responseBody), null, 2)}
                      </pre>
                    </details>
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