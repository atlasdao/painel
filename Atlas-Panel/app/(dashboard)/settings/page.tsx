'use client';

import { useState, useEffect } from 'react';
import { authService } from '@/app/lib/auth';
import { userService } from '@/app/lib/services';
import api from '@/app/lib/api';
import { User, Lock, Shield, Save, Loader, Eye, EyeOff, AlertTriangle, TrendingUp, Calendar } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'limits' | 'api'>('profile');
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  // Profile State
  const [profile, setProfile] = useState({
    email: '',
    username: '',
    role: '',
    createdAt: '',
  });

  // Password State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });



  // Limits State
  const [userLimits, setUserLimits] = useState<any>(null);

  useEffect(() => {
    loadUserProfile();
    loadUserLimits();
  }, []);

  const loadUserProfile = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (user) {
        setProfile({
          email: user.email || '',
          username: user.username || '',
          role: user.role || user.roles?.[0] || 'user',
          createdAt: user.createdAt || '',
        });
        // Remove this line since we don't get API key from profile anymore
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Erro ao carregar perfil');
    }
  };

  const loadUserLimits = async () => {
    try {
      const limits = await userService.getUserLimits();
      setUserLimits(limits);
    } catch (error: any) {
      console.error('Error loading user limits:', error);
      
      // Fallback: provide default empty limits structure so the UI doesn't break
      setUserLimits({
        limits: {
          daily: { deposit: 0, withdraw: 0, transfer: 0 },
          monthly: { deposit: 0, withdraw: 0, transfer: 0 },
          perTransaction: { deposit: 0, withdraw: 0, transfer: 0 },
        },
        dailyUsage: { depositToday: 0, withdrawToday: 0, transferToday: 0 },
        monthlyUsage: { depositThisMonth: 0, withdrawThisMonth: 0, transferThisMonth: 0 },
        isFirstDay: true,
        isKycVerified: false,
        isHighRiskUser: false,
      });
      
      toast.error('Erro ao carregar limites. Dados padrão carregados.');
    }
  };


  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // API call to update profile would go here
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error('A nova senha deve ter pelo menos 8 caracteres');
      return;
    }

    setLoading(true);
    try {
      // API call to change password would go here
      toast.success('Senha alterada com sucesso!');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      toast.error('Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  };



  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };


  return (
    <div className="container mx-auto px-4 py-8">
      <Toaster position="top-right" />
      
      <h1 className="text-3xl font-bold mb-8">Configurações</h1>

      {/* Tab Navigation */}
      <div className="border-b border-gray-700 mb-8">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'profile'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
            }`}
          >
            <User className="inline mr-2" size={16} />
            Perfil
          </button>
          
          <button
            onClick={() => setActiveTab('security')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'security'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
            }`}
          >
            <Lock className="inline mr-2" size={16} />
            Segurança
          </button>
          
          
          <button
            onClick={() => setActiveTab('limits')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'limits'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
            }`}
          >
            <AlertTriangle className="inline mr-2" size={16} />
            Meus Limites
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-6">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  E-mail
                </label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Nome de Usuário
                </label>
                <input
                  type="text"
                  value={profile.username}
                  onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Tipo de Conta
                </label>
                <input
                  type="text"
                  value={profile.role === 'admin' ? 'Administrador' : 'Usuário'}
                  className="w-full px-3 py-2 border border-gray-600 text-gray-400 rounded-lg bg-gray-700"
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Membro Desde
                </label>
                <input
                  type="text"
                  value={formatDate(profile.createdAt)}
                  className="w-full px-3 py-2 border border-gray-600 text-gray-400 rounded-lg bg-gray-700"
                  disabled
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <Loader className="animate-spin mr-2" size={16} />
                ) : (
                  <Save className="mr-2" size={16} />
                )}
                Salvar Alterações
              </button>
            </div>
          </form>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <form onSubmit={handleChangePassword} className="space-y-6 max-w-md">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Shield className="mr-2" size={20} />
              Alterar Senha
            </h3>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Senha Atual
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                >
                  {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Nova Senha
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                >
                  {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Confirmar Nova Senha
              </label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <Loader className="animate-spin mr-2" size={16} />
              ) : (
                <Lock className="mr-2" size={16} />
              )}
              Alterar Senha
            </button>
          </form>
        )}


        {/* Limits Tab */}
        {activeTab === 'limits' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <AlertTriangle className="mr-2 text-yellow-400" size={20} />
              Meus Limites de Transação
            </h3>

            {userLimits ? (
              <div className="space-y-6">
                {/* Status Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={`p-4 rounded-lg border ${
                    userLimits.isFirstDay 
                      ? 'bg-yellow-900/20 border-yellow-600' 
                      : 'bg-green-900/20 border-green-600'
                  }`}>
                    <div className="flex items-center justify-between">
                      <Calendar className={userLimits.isFirstDay ? "text-yellow-400" : "text-green-400"} size={20} />
                      <span className={`text-xs font-semibold ${
                        userLimits.isFirstDay ? 'text-yellow-400' : 'text-green-400'
                      }`}>
                        {userLimits.isFirstDay ? 'PRIMEIRO DIA' : 'USUÁRIO ATIVO'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 mt-2">Status da Conta</p>
                  </div>

                  <div className={`p-4 rounded-lg border ${
                    userLimits.isKycVerified 
                      ? 'bg-blue-900/20 border-blue-600' 
                      : 'bg-gray-700/20 border-gray-600'
                  }`}>
                    <div className="flex items-center justify-between">
                      <Shield className={userLimits.isKycVerified ? "text-blue-400" : "text-gray-400"} size={20} />
                      <span className={`text-xs font-semibold ${
                        userLimits.isKycVerified ? 'text-blue-400' : 'text-gray-400'
                      }`}>
                        {userLimits.isKycVerified ? 'KYC VERIFICADO' : 'KYC PENDENTE'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 mt-2">Status KYC</p>
                  </div>

                  <div className={`p-4 rounded-lg border ${
                    userLimits.isHighRiskUser 
                      ? 'bg-red-900/20 border-red-600' 
                      : 'bg-gray-700/20 border-gray-600'
                  }`}>
                    <div className="flex items-center justify-between">
                      <TrendingUp className={userLimits.isHighRiskUser ? "text-red-400" : "text-gray-400"} size={20} />
                      <span className={`text-xs font-semibold ${
                        userLimits.isHighRiskUser ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {userLimits.isHighRiskUser ? 'ALTO RISCO' : 'RISCO NORMAL'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 mt-2">Perfil de Risco</p>
                  </div>
                </div>

                {/* Current Limits */}
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h4 className="text-md font-semibold text-white mb-4">Seus Limites Atuais</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h5 className="text-sm font-medium text-gray-300 mb-2">Limites Diários</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Depósito:</span>
                          <span className="text-white font-mono">R$ {userLimits.limits?.daily?.deposit?.toFixed(2) || '0,00'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Saque:</span>
                          <span className="text-white font-mono">R$ {userLimits.limits?.daily?.withdraw?.toFixed(2) || '0,00'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Transferência:</span>
                          <span className="text-white font-mono">R$ {userLimits.limits?.daily?.transfer?.toFixed(2) || '0,00'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="text-sm font-medium text-gray-300 mb-2">Por Transação</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Depósito:</span>
                          <span className="text-white font-mono">R$ {userLimits.limits?.perTransaction?.deposit?.toFixed(2) || '0,00'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Saque:</span>
                          <span className="text-white font-mono">R$ {userLimits.limits?.perTransaction?.withdraw?.toFixed(2) || '0,00'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Transferência:</span>
                          <span className="text-white font-mono">R$ {userLimits.limits?.perTransaction?.transfer?.toFixed(2) || '0,00'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="text-sm font-medium text-gray-300 mb-2">Limites Mensais</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Depósito:</span>
                          <span className="text-white font-mono">R$ {userLimits.limits?.monthly?.deposit?.toFixed(2) || '0,00'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Saque:</span>
                          <span className="text-white font-mono">R$ {userLimits.limits?.monthly?.withdraw?.toFixed(2) || '0,00'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Transferência:</span>
                          <span className="text-white font-mono">R$ {userLimits.limits?.monthly?.transfer?.toFixed(2) || '0,00'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Usage Progress */}
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h4 className="text-md font-semibold text-white mb-4">Uso Atual</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="text-sm font-medium text-gray-300 mb-3">Hoje</h5>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-xs text-gray-400">Depósitos</span>
                            <span className="text-xs text-white">
                              R$ {userLimits.dailyUsage?.depositToday?.toFixed(2) || '0,00'} / R$ {userLimits.limits?.daily?.deposit?.toFixed(2) || '0,00'}
                            </span>
                          </div>
                          <div className="w-full bg-gray-600 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full"
                              style={{
                                width: `${Math.min(100, ((userLimits.dailyUsage?.depositToday || 0) / (userLimits.limits?.daily?.deposit || 1)) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-xs text-gray-400">Saques</span>
                            <span className="text-xs text-white">
                              R$ {userLimits.dailyUsage?.withdrawToday?.toFixed(2) || '0,00'} / R$ {userLimits.limits?.daily?.withdraw?.toFixed(2) || '0,00'}
                            </span>
                          </div>
                          <div className="w-full bg-gray-600 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full"
                              style={{
                                width: `${Math.min(100, ((userLimits.dailyUsage?.withdrawToday || 0) / (userLimits.limits?.daily?.withdraw || 1)) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="text-sm font-medium text-gray-300 mb-3">Este Mês</h5>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-xs text-gray-400">Depósitos</span>
                            <span className="text-xs text-white">
                              R$ {userLimits.monthlyUsage?.depositThisMonth?.toFixed(2) || '0,00'} / R$ {userLimits.limits?.monthly?.deposit?.toFixed(2) || '0,00'}
                            </span>
                          </div>
                          <div className="w-full bg-gray-600 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full"
                              style={{
                                width: `${Math.min(100, ((userLimits.monthlyUsage?.depositThisMonth || 0) / (userLimits.limits?.monthly?.deposit || 1)) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-xs text-gray-400">Saques</span>
                            <span className="text-xs text-white">
                              R$ {userLimits.monthlyUsage?.withdrawThisMonth?.toFixed(2) || '0,00'} / R$ {userLimits.limits?.monthly?.withdraw?.toFixed(2) || '0,00'}
                            </span>
                          </div>
                          <div className="w-full bg-gray-600 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full"
                              style={{
                                width: `${Math.min(100, ((userLimits.monthlyUsage?.withdrawThisMonth || 0) / (userLimits.limits?.monthly?.withdraw || 1)) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Compliance Notice */}
                <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-semibold text-yellow-300 mb-2">Limites de Segurança</h5>
                      <p className="text-sm text-yellow-200">
                        Estes limites são impostos para segurança da infraestrutura e de clientes honestos
                        através para garantir segurança e conformidade legal. 
                        {userLimits.isFirstDay && ' Como novo usuário, você tem um limite especial de R$ 500 no primeiro dia.'}
                        {!userLimits.isFirstDay && !userLimits.isKycVerified && ' Faça a primeira transação para aumentar seus limites.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <Loader className="animate-spin w-8 h-8 text-blue-400" />
                <span className="ml-3 text-gray-400">Carregando informações de limites...</span>
              </div>
            )}


          </div>
        )}
      </div>
    </div>
  );
}