'use client';

import { useState, useEffect } from 'react';
import { adminService } from '@/app/lib/services';
import { UserRole, getRoleLabel } from '@/app/types/user-role';
import {
  Users,
  Search,
  Filter,
  UserPlus,
  Edit,
  Trash2,
  Shield,
  Ban,
  CheckCircle,
  XCircle,
  Key,
  Mail,
  Calendar,
  Activity,
  Settings,
  DollarSign,
  X,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  User,
  Lock,
  Unlock,
  CreditCard,
  TrendingUp,
  AlertCircle,
  Store,
  ArrowUpDown
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { translateStatus } from '@/app/lib/translations';

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  isActive: boolean;
  apiKey?: string;
  createdAt: string;
  lastLoginAt?: string;
  isAccountValidated?: boolean;
  validatedAt?: string;
  apiDailyLimit?: number;
  apiMonthlyLimit?: number;
  commerceMode?: boolean;
  commerceModeActivatedAt?: string;
}

interface UserStats {
  totalTransactions: number;
  totalVolume: number;
  pendingTransactions: number;
  completedTransactions: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterValidated, setFilterValidated] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [newUserData, setNewUserData] = useState({
    username: '',
    email: '',
    password: '',
    role: UserRole.USER,
  });

  const [editUserData, setEditUserData] = useState({
    username: '',
    email: '',
    role: UserRole.USER,
    apiDailyLimit: 6000,
    apiMonthlyLimit: 180000,
    commerceMode: false,
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const data = await adminService.getUsers({ limit: 1000 });
      setUsers(data);
      toast.success('Usuários carregados com sucesso');
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadUserStats = async (userId: string) => {
    setLoadingStats(true);
    try {
      const stats = await adminService.getUserStats(userId);
      setUserStats(stats);
    } catch (error) {
      console.error('Error loading user stats:', error);
      toast.error('Erro ao carregar estatísticas');
    } finally {
      setLoadingStats(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await adminService.updateUser(userId, { isActive: !currentStatus });
      toast.success(`Usuário ${!currentStatus ? 'ativado' : 'desativado'} com sucesso`);
      loadUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error('Erro ao alterar status do usuário');
    }
  };

  const handleToggleCommerceMode = async (userId: string, currentMode: boolean) => {
    try {
      await adminService.updateUser(userId, { commerceMode: !currentMode });
      toast.success(`Modo Comércio ${!currentMode ? 'ativado' : 'desativado'} com sucesso`);
      loadUsers();
    } catch (error) {
      console.error('Error toggling commerce mode:', error);
      toast.error('Erro ao alterar modo comércio');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
    
    try {
      await adminService.deleteUser(userId);
      toast.success('Usuário excluído com sucesso');
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Erro ao excluir usuário');
    }
  };

  const handleCreateUser = async () => {
    try {
      await adminService.createUser(newUserData);
      toast.success('Usuário criado com sucesso');
      setShowNewUserModal(false);
      setNewUserData({
        username: '',
        email: '',
        password: '',
        role: UserRole.USER,
      });
      loadUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Erro ao criar usuário');
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    
    try {
      await adminService.updateUser(selectedUser.id, editUserData);
      toast.success('Usuário atualizado com sucesso');
      setShowEditModal(false);
      loadUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Erro ao atualizar usuário');
    }
  };

  const handleGenerateApiKey = async (userId: string) => {
    try {
      const response = await adminService.generateApiKey(userId);
      toast.success('API Key gerada com sucesso');
      if (response.apiKey) {
        navigator.clipboard.writeText(response.apiKey);
        toast.success('API Key copiada para a área de transferência');
      }
      loadUsers();
    } catch (error) {
      console.error('Error generating API key:', error);
      toast.error('Erro ao gerar API Key');
    }
  };

  const openUserDetails = (user: User) => {
    setSelectedUser(user);
    setShowUserModal(true);
    loadUserStats(user.id);
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditUserData({
      username: user.username,
      email: user.email,
      role: user.role as UserRole,
      apiDailyLimit: user.apiDailyLimit || 6000,
      apiMonthlyLimit: user.apiMonthlyLimit || 180000,
      commerceMode: user.commerceMode || false,
    });
    setShowEditModal(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência');
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  // Filtered and sorted users
  const filteredUsers = users
    .filter(user => {
      const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            user.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filterStatus === 'all' ||
                           (filterStatus === 'active' && user.isActive) ||
                           (filterStatus === 'inactive' && !user.isActive);
      const matchesValidated = filterValidated === 'all' ||
                              (filterValidated === 'validated' && user.isAccountValidated) ||
                              (filterValidated === 'not-validated' && !user.isAccountValidated);

      return matchesSearch && matchesStatus && matchesValidated;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'username':
          return a.username.localeCompare(b.username);
        case 'email':
          return a.email.localeCompare(b.email);
        case 'lastLogin':
          if (!a.lastLoginAt && !b.lastLoginAt) return 0;
          if (!a.lastLoginAt) return 1;
          if (!b.lastLoginAt) return -1;
          return new Date(b.lastLoginAt).getTime() - new Date(a.lastLoginAt).getTime();
        default:
          return 0;
      }
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Carregando usuários...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text flex items-center">
            <Users className="mr-3" />
            Gestão de Usuários
          </h1>
          <p className="text-gray-400 mt-2">
            {filteredUsers.length} de {users.length} usuários
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => loadUsers(true)}
            disabled={refreshing}
            className="btn-outline flex items-center space-x-2"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
          <button
            onClick={() => setShowNewUserModal(true)}
            className="btn-gradient flex items-center space-x-2"
          >
            <UserPlus className="w-5 h-5" />
            <span>Novo Usuário</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nome, email ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 input-modern"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 input-modern"
          >
            <option value="all">Todos os Status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>

          {/* Validation Filter */}
          <select
            value={filterValidated}
            onChange={(e) => setFilterValidated(e.target.value)}
            className="px-3 py-2 input-modern"
          >
            <option value="all">Toda Validação</option>
            <option value="validated">Validados</option>
            <option value="not-validated">Não Validados</option>
          </select>

          {/* Sort By */}
          <div className="relative">
            <ArrowUpDown className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full pl-10 pr-3 py-2 input-modern"
            >
              <option value="newest">Mais Recentes</option>
              <option value="oldest">Mais Antigos</option>
              <option value="username">Nome A-Z</option>
              <option value="email">Email A-Z</option>
              <option value="lastLogin">Último Login</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-modern">
            <thead>
              <tr>
                <th className="text-left">
                  Usuário
                </th>
                <th className="text-left">
                  Email
                </th>
                <th className="text-left">
                  Papel
                </th>
                <th className="text-left">
                  Status
                </th>
                <th className="text-left">
                  Validação
                </th>
                <th className="text-left">
                  Criado em
                </th>
                <th className="text-left">
                  Último Login
                </th>
                <th className="text-left">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-800 rounded-full flex items-center justify-center mr-3">
                        <User className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{user.username}</div>
                        <div className="text-xs text-gray-400 font-mono">{user.id.slice(0, 8)}...</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="text-sm text-gray-300">{user.email}</span>
                  </td>
                  <td>
                    <span className={`badge ${
                      user.role === 'ADMIN'
                        ? 'badge-danger'
                        : 'badge-info'
                    }`}>
                      <Shield className="w-3 h-3 mr-1" />
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${
                      user.isActive
                        ? 'badge-success'
                        : 'badge-danger'
                    }`}>
                      {user.isActive ? (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Ativo
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 mr-1" />
                          Inativo
                        </>
                      )}
                    </span>
                  </td>
                  <td>
                    {user.isAccountValidated ? (
                      <span className="badge badge-success">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Validado
                      </span>
                    ) : (
                      <span className="badge badge-warning">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Pendente
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="text-sm text-gray-400">
                      {formatDate(user.createdAt)}
                    </span>
                  </td>
                  <td>
                    <span className="text-sm text-gray-400">
                      {user.lastLoginAt ? formatDate(user.lastLoginAt) : '-'}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openUserDetails(user)}
                        className="p-2 bg-gray-700/50 hover:bg-gray-600/50 text-white rounded-lg transition duration-200 hover-lift"
                        title="Ver detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(user)}
                        className="p-2 bg-blue-600/50 hover:bg-blue-700/50 text-white rounded-lg transition duration-200 hover-lift"
                        title="Editar usuário"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(user.id, user.isActive)}
                        className={`p-2 ${
                          user.isActive
                            ? 'bg-orange-600/50 hover:bg-orange-700/50'
                            : 'bg-green-600/50 hover:bg-green-700/50'
                        } text-white rounded-lg transition duration-200 hover-lift`}
                        title={user.isActive ? 'Desativar' : 'Ativar'}
                      >
                        {user.isActive ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2 bg-red-600/50 hover:bg-red-700/50 text-white rounded-lg transition duration-200 hover-lift"
                        title="Excluir usuário"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Nenhum usuário encontrado</p>
            </div>
          )}
        </div>
      </div>

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-white">Detalhes do Usuário</h2>
              <button
                onClick={() => {
                  setShowUserModal(false);
                  setSelectedUser(null);
                  setUserStats(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* User Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-gray-400">ID</label>
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-mono text-sm">{selectedUser.id}</span>
                    <button
                      onClick={() => copyToClipboard(selectedUser.id)}
                      className="text-gray-400 hover:text-white"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Username</label>
                  <p className="text-white">{selectedUser.username}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Email</label>
                  <p className="text-white">{selectedUser.email}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Papel</label>
                  <p className="text-white">{getRoleLabel(selectedUser.role)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Status</label>
                  <p className={selectedUser.isActive ? 'text-green-400' : 'text-red-400'}>
                    {selectedUser.isActive ? 'Ativo' : 'Inativo'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Validação</label>
                  <p className={selectedUser.isAccountValidated ? 'text-green-400' : 'text-yellow-400'}>
                    {selectedUser.isAccountValidated ? 'Validado' : 'Não Validado'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Criado em</label>
                  <p className="text-white">{formatDate(selectedUser.createdAt)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Último Login</label>
                  <p className="text-white">
                    {selectedUser.lastLoginAt ? formatDate(selectedUser.lastLoginAt) : 'Nunca'}
                  </p>
                </div>
              </div>

              {/* API Key - Note: This shows legacy single API key, users now manage multiple keys through API Key Requests */}
              {selectedUser.apiKey && (
                <div>
                  <label className="text-sm text-gray-400">Legacy API Key</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <code className="flex-1 bg-gray-900/50 p-2 rounded text-xs text-green-400 font-mono">
                      {selectedUser.apiKey}
                    </code>
                    <button
                      onClick={() => copyToClipboard(selectedUser.apiKey!)}
                      className="p-2 btn-outline"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Usuários agora podem ter múltiplas API keys através do sistema de solicitações
                  </p>
                </div>
              )}

              {/* User Stats */}
              {loadingStats ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-gray-400 mt-2">Carregando estatísticas...</p>
                </div>
              ) : userStats && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Estatísticas</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="stat-card p-3">
                      <p className="text-xs text-gray-400">Total de Transações</p>
                      <p className="text-xl font-bold text-white">{userStats.totalTransactions}</p>
                    </div>
                    <div className="stat-card p-3">
                      <p className="text-xs text-gray-400">Volume Total</p>
                      <p className="text-xl font-bold text-white">{formatCurrency(userStats.totalVolume)}</p>
                    </div>
                    <div className="stat-card p-3">
                      <p className="text-xs text-gray-400">Pendentes</p>
                      <p className="text-xl font-bold text-yellow-400">{userStats.pendingTransactions}</p>
                    </div>
                    <div className="stat-card p-3">
                      <p className="text-xs text-gray-400">Concluídas</p>
                      <p className="text-xl font-bold text-green-400">{userStats.completedTransactions}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end pt-4 border-t border-gray-700">
                <button
                  onClick={() => handleGenerateApiKey(selectedUser.id)}
                  className="btn-gradient flex items-center justify-center space-x-2 w-full sm:w-auto"
                >
                  <Key className="w-4 h-4" />
                  <span>Gerar Nova API Key</span>
                </button>
                <button
                  onClick={() => {
                    setShowUserModal(false);
                    openEditModal(selectedUser);
                  }}
                  className="btn-gradient flex items-center justify-center space-x-2 w-full sm:w-auto"
                >
                  <Edit className="w-4 h-4" />
                  <span>Editar</span>
                </button>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="btn-outline w-full sm:w-auto"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New User Modal */}
      {showNewUserModal && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-white mb-6">Criar Novo Usuário</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nome de Usuário
                </label>
                <input
                  type="text"
                  value={newUserData.username}
                  onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                  className="w-full input-modern"
                  placeholder="johndoe"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  className="w-full input-modern"
                  placeholder="john@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Senha
                </label>
                <input
                  type="password"
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  className="w-full input-modern"
                  placeholder="••••••••"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Papel
                </label>
                <select
                  value={newUserData.role}
                  onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value as UserRole })}
                  className="w-full input-modern"
                >
                  <option value={UserRole.USER}>Usuário</option>
                  <option value={UserRole.ADMIN}>Administrador</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowNewUserModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateUser}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition duration-200"
              >
                Criar Usuário
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-white mb-6">Editar Usuário</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nome de Usuário
                </label>
                <input
                  type="text"
                  value={editUserData.username}
                  onChange={(e) => setEditUserData({ ...editUserData, username: e.target.value })}
                  className="w-full input-modern"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={editUserData.email}
                  onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })}
                  className="w-full input-modern"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Papel
                </label>
                <select
                  value={editUserData.role}
                  onChange={(e) => setEditUserData({ ...editUserData, role: e.target.value as UserRole })}
                  className="w-full input-modern"
                >
                  <option value={UserRole.USER}>Usuário</option>
                  <option value={UserRole.ADMIN}>Administrador</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Limite Diário API
                </label>
                <input
                  type="number"
                  value={editUserData.apiDailyLimit}
                  onChange={(e) => setEditUserData({ ...editUserData, apiDailyLimit: parseInt(e.target.value) })}
                  className="w-full input-modern"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Limite Mensal API
                </label>
                <input
                  type="number"
                  value={editUserData.apiMonthlyLimit}
                  onChange={(e) => setEditUserData({ ...editUserData, apiMonthlyLimit: parseInt(e.target.value) })}
                  className="w-full input-modern"
                />
              </div>

              <div className="mt-4">
                <label className="flex items-center justify-between cursor-pointer p-3 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-purple-500 transition-colors">
                  <div className="flex items-center">
                    <Store className="w-5 h-5 text-purple-400 mr-3" />
                    <div>
                      <span className="text-sm font-medium text-gray-200">Modo Comércio</span>
                      <p className="text-xs text-gray-400 mt-1">Permite transações comerciais para este usuário</p>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={editUserData.commerceMode}
                      onChange={(e) => setEditUserData({ ...editUserData, commerceMode: e.target.checked })}
                    />
                    <div className={`w-12 h-6 rounded-full transition-colors ${
                      editUserData.commerceMode ? 'bg-purple-500' : 'bg-gray-600'
                    }`}>
                      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                        editUserData.commerceMode ? 'translate-x-6' : 'translate-x-0'
                      }`} />
                    </div>
                  </div>
                </label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateUser}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition duration-200"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}