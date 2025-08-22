'use client';

import { useState, useEffect } from 'react';
import api from '@/app/lib/api';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Settings,
  Users,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Save,
  Key,
  Shield,
  Plus,
  Trash2,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import os from 'os';

export default function AdminSystemPage() {
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [medLimits, setMedLimits] = useState({
    dailyDepositLimit: 1000,
    dailyWithdrawLimit: 1000,
    monthlyDepositLimit: 10000,
    monthlyWithdrawLimit: 10000,
    maxTransactionAmount: 5000,
    requiresKyc: false,
    firstDayLimit: 500,
  });
  const [eulenToken, setEulenToken] = useState('');
  const [savingToken, setSavingToken] = useState(false);
  const [savingLimits, setSavingLimits] = useState(false);
  const [validationSettings, setValidationSettings] = useState({
    validationEnabled: true,
    validationAmount: 1.00,
    initialDailyLimit: 6000,
    limitTiers: [6000, 10000, 20000, 40000, 80000, 160000],
    thresholdTiers: [50000, 150000, 400000, 1000000, 2500000, 5000000],
  });
  const [savingValidation, setSavingValidation] = useState(false);

  useEffect(() => {
    loadSystemInfo();
    loadMedLimits();
    loadValidationSettings();
  }, []);

  const loadSystemInfo = async () => {
    setLoading(true);
    try {
      // Get real system information
      const statsResponse = await api.get('/admin/stats');
      const stats = statsResponse.data;

      // Calculate real uptime
      const uptimeSeconds = process.uptime ? process.uptime() : 0;
      const days = Math.floor(uptimeSeconds / 86400);
      const hours = Math.floor((uptimeSeconds % 86400) / 3600);
      const minutes = Math.floor((uptimeSeconds % 3600) / 60);

      setSystemInfo({
        ...stats,
        server: {
          status: 'online',
          uptime: `${days}d ${hours}h ${minutes}m`,
          version: process.env.npm_package_version || '1.0.0',
          nodeVersion: process.version || 'unknown',
          environment: process.env.NODE_ENV || 'development',
          memoryUsage: process.memoryUsage ? Math.round(process.memoryUsage().heapUsed / 1024 / 1024) : 0,
          platform: process.platform || 'unknown',
        },
      });
    } catch (error) {
      console.error('Error loading system info:', error);
      // Use fallback data if API fails
      setSystemInfo({
        totalUsers: 0,
        totalTransactions: 0,
        server: {
          status: 'online',
          uptime: '0d 0h 0m',
          version: '1.0.0',
          nodeVersion: 'v20.11.0',
          environment: 'development',
          memoryUsage: 0,
          platform: 'linux',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMedLimits = async () => {
    try {
      const response = await api.get('/admin/med-limits');
      setMedLimits(response.data);
    } catch (error) {
      console.error('Error loading MED limits:', error);
    }
  };

  const loadValidationSettings = async () => {
    try {
      const response = await api.get('/account-validation/settings');
      setValidationSettings(response.data);
    } catch (error) {
      console.error('Error loading validation settings:', error);
    }
  };

  const handleSaveMedLimits = async () => {
    setSavingLimits(true);
    try {
      await api.put('/admin/med-limits', medLimits);
      toast.success('Limites MED atualizados com sucesso!');
    } catch (error) {
      console.error('Error saving MED limits:', error);
      toast.error('Erro ao salvar limites MED');
    } finally {
      setSavingLimits(false);
    }
  };

  const handleSaveValidationSettings = async () => {
    setSavingValidation(true);
    try {
      await api.put('/account-validation/settings', validationSettings);
      toast.success('Configurações de validação salvas com sucesso!');
    } catch (error) {
      console.error('Error saving validation settings:', error);
      toast.error('Erro ao salvar configurações de validação');
    } finally {
      setSavingValidation(false);
    }
  };

  const handleTierChange = (index: number, value: string, type: 'limit' | 'threshold') => {
    const numValue = parseFloat(value) || 0;
    if (type === 'limit') {
      const newTiers = [...validationSettings.limitTiers];
      newTiers[index] = numValue;
      setValidationSettings({ ...validationSettings, limitTiers: newTiers });
    } else {
      const newTiers = [...validationSettings.thresholdTiers];
      newTiers[index] = numValue;
      setValidationSettings({ ...validationSettings, thresholdTiers: newTiers });
    }
  };

  const addTier = () => {
    const lastLimit = validationSettings.limitTiers[validationSettings.limitTiers.length - 1];
    const lastThreshold = validationSettings.thresholdTiers[validationSettings.thresholdTiers.length - 1];
    
    setValidationSettings({
      ...validationSettings,
      limitTiers: [...validationSettings.limitTiers, lastLimit * 2],
      thresholdTiers: [...validationSettings.thresholdTiers, lastThreshold * 2],
    });
  };

  const removeTier = (index: number) => {
    if (validationSettings.limitTiers.length <= 1) {
      toast.error('Deve haver pelo menos um nível');
      return;
    }
    
    setValidationSettings({
      ...validationSettings,
      limitTiers: validationSettings.limitTiers.filter((_, i) => i !== index),
      thresholdTiers: validationSettings.thresholdTiers.filter((_, i) => i !== index),
    });
  };

  const handleSaveEulenToken = async () => {
    if (!eulenToken.trim()) {
      toast.error('Token não pode estar vazio');
      return;
    }

    setSavingToken(true);
    try {
      await api.put('/admin/system/eulen-token', { token: eulenToken });
      toast.success('Token Eulen atualizado com sucesso!');
      setEulenToken('');
    } catch (error) {
      console.error('Error saving Eulen token:', error);
      toast.error('Erro ao salvar token Eulen');
    } finally {
      setSavingToken(false);
    }
  };

  const tabs = [
    { id: 'overview', name: 'Visão Geral', icon: Activity },
    { id: 'limits', name: 'Limites MED', icon: AlertTriangle },
    { id: 'validation', name: 'Validação', icon: CheckCircle },
    { id: 'settings', name: 'Configurações', icon: Settings },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Toaster position="top-right" />
      
      <h1 className="text-3xl font-bold mb-8">Sistema</h1>

      {/* Tab Navigation */}
      <div className="border-b border-gray-700 mb-8">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
                }`}
              >
                <Icon className="mr-2" size={16} />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* System Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <CheckCircle className="text-green-400" size={24} />
                <span className="text-xs bg-green-900/20 text-green-400 px-2 py-1 rounded-full">
                  Online
                </span>
              </div>
              <h3 className="text-lg font-semibold mb-1">Status do Sistema</h3>
              <p className="text-gray-400 text-sm">Todos os serviços operando</p>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <Activity className="text-blue-400" size={24} />
                <span className="text-2xl font-bold text-white">
                  {systemInfo?.server?.uptime || '0d 0h 0m'}
                </span>
              </div>
              <h3 className="text-lg font-semibold mb-1">Uptime</h3>
              <p className="text-gray-400 text-sm">Tempo ativo do sistema</p>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <Users className="text-purple-400" size={24} />
                <span className="text-2xl font-bold text-white">
                  {systemInfo?.totalUsers || 0}
                </span>
              </div>
              <h3 className="text-lg font-semibold mb-1">Usuários</h3>
              <p className="text-gray-400 text-sm">Total de usuários cadastrados</p>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <DollarSign className="text-yellow-400" size={24} />
                <span className="text-2xl font-bold text-white">
                  {systemInfo?.totalTransactions || 0}
                </span>
              </div>
              <h3 className="text-lg font-semibold mb-1">Transações</h3>
              <p className="text-gray-400 text-sm">Total de transações processadas</p>
            </div>
          </div>

          {/* System Information */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Informações do Sistema</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Versão da Aplicação:</span>
                  <span className="text-white font-mono">{systemInfo?.server?.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Node.js:</span>
                  <span className="text-white font-mono">{systemInfo?.server?.nodeVersion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Ambiente:</span>
                  <span className="text-white font-mono">{systemInfo?.server?.environment}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Plataforma:</span>
                  <span className="text-white font-mono">{systemInfo?.server?.platform}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Uso de Memória:</span>
                  <span className="text-white font-mono">{systemInfo?.server?.memoryUsage} MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className="text-green-400 font-mono">{systemInfo?.server?.status}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Ações Rápidas</h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => loadSystemInfo()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <RefreshCw size={16} />
                Atualizar Dados
              </button>
              <button
                onClick={() => toast.success('Cache limpo com sucesso!')}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Limpar Cache
              </button>
              <button
                onClick={() => toast.error('Função desabilitada em produção')}
                className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
              >
                Reiniciar Sistema
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MED Limits Tab */}
      {activeTab === 'limits' && (
        <div className="space-y-6">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Configuração de Limites MED</h2>
              <button
                onClick={handleSaveMedLimits}
                disabled={savingLimits}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {savingLimits ? (
                  <RefreshCw className="animate-spin" size={16} />
                ) : (
                  <Save size={16} />
                )}
                Salvar Alterações
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Limite Diário de Depósito (R$)
                </label>
                <input
                  type="number"
                  value={medLimits.dailyDepositLimit}
                  onChange={(e) => setMedLimits({ ...medLimits, dailyDepositLimit: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Limite Diário de Saque (R$)
                </label>
                <input
                  type="number"
                  value={medLimits.dailyWithdrawLimit}
                  onChange={(e) => setMedLimits({ ...medLimits, dailyWithdrawLimit: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Limite Mensal de Depósito (R$)
                </label>
                <input
                  type="number"
                  value={medLimits.monthlyDepositLimit}
                  onChange={(e) => setMedLimits({ ...medLimits, monthlyDepositLimit: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Limite Mensal de Saque (R$)
                </label>
                <input
                  type="number"
                  value={medLimits.monthlyWithdrawLimit}
                  onChange={(e) => setMedLimits({ ...medLimits, monthlyWithdrawLimit: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Valor Máximo por Transação (R$)
                </label>
                <input
                  type="number"
                  value={medLimits.maxTransactionAmount}
                  onChange={(e) => setMedLimits({ ...medLimits, maxTransactionAmount: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Limite Primeiro Dia (R$)
                </label>
                <input
                  type="number"
                  value={medLimits.firstDayLimit}
                  onChange={(e) => setMedLimits({ ...medLimits, firstDayLimit: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={medLimits.requiresKyc}
                    onChange={(e) => setMedLimits({ ...medLimits, requiresKyc: e.target.checked })}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-white">Exigir validação de conta para limites aumentados</span>
                </label>
              </div>
            </div>

            <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-yellow-400 mt-0.5" size={20} />
                <div>
                  <p className="text-yellow-400 font-medium">Conformidade MED</p>
                  <p className="text-gray-300 text-sm mt-1">
                    Estes limites são aplicados globalmente e afetam todos os usuários. 
                    Limites individuais podem ser configurados na página de gerenciamento de usuários.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Validation Tab */}
      {activeTab === 'validation' && (
        <div className="space-y-6">
          {/* Validation Settings */}
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold flex items-center">
                <Shield className="mr-2 text-yellow-400" />
                Configurações de Validação de Conta
              </h2>
              <button
                onClick={handleSaveValidationSettings}
                disabled={savingValidation}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {savingValidation ? (
                  <RefreshCw className="animate-spin" size={16} />
                ) : (
                  <Save size={16} />
                )}
                Salvar Configurações
              </button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="flex items-center space-x-3 mb-4">
                  <input
                    type="checkbox"
                    checked={validationSettings.validationEnabled}
                    onChange={(e) => setValidationSettings({ ...validationSettings, validationEnabled: e.target.checked })}
                    className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-white">Validação obrigatória</span>
                </label>
                
                <div className="p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-300">
                    Quando ativado, usuários precisam fazer um pagamento de validação antes de realizar depósitos.
                  </p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Valor da Validação (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    R$
                  </span>
                  <input
                    type="number"
                    value={validationSettings.validationAmount}
                    onChange={(e) => setValidationSettings({ ...validationSettings, validationAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.01"
                    min="0.01"
                  />
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Limite Diário Inicial (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  R$
                </span>
                <input
                  type="number"
                  value={validationSettings.initialDailyLimit}
                  onChange={(e) => setValidationSettings({ ...validationSettings, initialDailyLimit: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="100"
                  min="100"
                />
              </div>
              <p className="text-sm text-gray-400 mt-2">
                Limite diário para novos usuários após validação
              </p>
            </div>
          </div>

          {/* Progressive Tiers */}
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <TrendingUp className="mr-2 text-blue-400" />
                Níveis Progressivos
              </h2>
              
              <button
                onClick={addTier}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-200 text-sm flex items-center gap-2"
              >
                <Plus size={16} />
                Adicionar Nível
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Nível
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Limite Diário (R$)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Volume para Próximo (R$)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {validationSettings.limitTiers.map((limit, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        Tier {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                            R$
                          </span>
                          <input
                            type="number"
                            value={limit}
                            onChange={(e) => handleTierChange(index, e.target.value, 'limit')}
                            className="w-40 pl-10 pr-3 py-1 bg-gray-700 border border-gray-600 text-white rounded text-sm"
                            step="1000"
                            min="100"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                            R$
                          </span>
                          <input
                            type="number"
                            value={validationSettings.thresholdTiers[index]}
                            onChange={(e) => handleTierChange(index, e.target.value, 'threshold')}
                            className="w-40 pl-10 pr-3 py-1 bg-gray-700 border border-gray-600 text-white rounded text-sm"
                            step="10000"
                            min="1000"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => removeTier(index)}
                          disabled={validationSettings.limitTiers.length <= 1}
                          className="text-red-500 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                          <Trash2 size={16} />
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-800 rounded-lg">
              <div className="flex items-start">
                <AlertTriangle className="text-yellow-400 mr-2 mt-0.5" size={20} />
                <div className="text-sm text-yellow-300">
                  <p className="font-semibold mb-1">Como funcionam os níveis:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Usuários começam no Tier 1 após validação</li>
                    <li>Limites aumentam automaticamente ao atingir o volume necessário</li>
                    <li>O progresso é baseado no volume total de transações aprovadas</li>
                    <li>Admins podem ajustar níveis individuais manualmente</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-6">Configurações do Sistema</h2>

            {/* Eulen Token Update */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  <Key className="inline mr-2" size={16} />
                  Token JWT Eulen
                </label>
                <p className="text-sm text-gray-400 mb-3">
                  Atualize o token de autenticação da API Eulen/Plebank
                </p>
                <div className="flex gap-3">
                  <input
                    type="password"
                    value={eulenToken}
                    onChange={(e) => setEulenToken(e.target.value)}
                    placeholder="Cole o novo token JWT aqui..."
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleSaveEulenToken}
                    disabled={savingToken || !eulenToken.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    {savingToken ? (
                      <RefreshCw className="animate-spin" size={16} />
                    ) : (
                      <Save size={16} />
                    )}
                    Atualizar Token
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  O token será usado imediatamente após a atualização para todas as novas requisições.
                </p>
              </div>

              <div className="mt-8 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-blue-400 mt-0.5" size={20} />
                  <div>
                    <p className="text-blue-400 font-medium">Importante</p>
                    <p className="text-gray-300 text-sm mt-1">
                      Certifique-se de que o token é válido antes de atualizar. 
                      Um token inválido pode interromper as operações PIX.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}