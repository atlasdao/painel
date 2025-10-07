'use client';

import { useState, useEffect } from 'react';
import { Award, Star, TrendingUp, Clock, Users, Shield, Target, CheckCircle, AlertCircle, Calendar, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/app/lib/api';

interface LevelConfiguration {
  level: number;
  name: string;
  requiredTransactionVolume: number;
  requiredTransactionCount: number;
  dailyLimit: number;
  monthlyLimit: number;
  features: string[];
  description: string;
}

interface UserLevel {
  id: string;
  userId: string;
  level: number;
  transactionVolume: number;
  transactionCount: number;
  earnedAt: string;
  updatedAt: string;
  configuration?: LevelConfiguration;
}

interface LevelHistory {
  id: string;
  userId: string;
  oldLevel: number;
  newLevel: number;
  reason: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

interface LevelStats {
  currentLevel: number;
  nextLevel: number | null;
  progressToNext: number;
  totalTransactionVolume: number;
  totalTransactionCount: number;
  canUpgrade: boolean;
  nextLevelRequirements?: {
    volumeNeeded: number;
    transactionsNeeded: number;
  };
}

export default function LevelsPage() {
  const [loading, setLoading] = useState(true);
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null);
  const [allLevels, setAllLevels] = useState<LevelConfiguration[]>([]);
  const [levelHistory, setLevelHistory] = useState<LevelHistory[]>([]);
  const [levelStats, setLevelStats] = useState<LevelStats | null>(null);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    loadLevelsData();
  }, []);

  const loadLevelsData = async () => {
    setLoading(true);
    try {
      // Load all data in parallel
      const [userLevelRes, configsRes, historyRes, statsRes] = await Promise.all([
        api.get('/levels/user'),
        api.get('/levels/configurations'),
        api.get('/levels/history'),
        api.get('/levels/stats')
      ]);

      // Safely set data with fallbacks
      setUserLevel(userLevelRes.data || null);
      setAllLevels(Array.isArray(configsRes.data) ? configsRes.data : []);
      setLevelHistory(Array.isArray(historyRes.data) ? historyRes.data : []);
      setLevelStats(statsRes.data || null);
    } catch (error: any) {
      console.error('Error loading levels data:', error);

      // Set safe fallbacks
      setUserLevel(null);
      setAllLevels([]);
      setLevelHistory([]);
      setLevelStats(null);

      // User-friendly error message based on error type
      if (error.response?.status === 401) {
        toast.error('Sua sessão expirou. Faça login novamente.');
      } else if (error.response?.status === 404) {
        toast.error('Sistema de níveis não encontrado. Contate o suporte.');
      } else {
        toast.error('Erro ao carregar dados dos níveis. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeLevel = async () => {
    if (!levelStats?.canUpgrade) return;

    setUpgrading(true);
    try {
      const response = await api.post('/levels/upgrade');

      if (response.data.upgraded) {
        toast.success(`🎉 Parabéns! Você foi promovido para o nível ${response.data.newLevel}!`, {
          duration: 5000,
          style: {
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
          },
        });

        // Reload data to show updated information
        await loadLevelsData();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao atualizar nível');
    } finally {
      setUpgrading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getLevelColor = (level: number) => {
    const colors = [
      'text-gray-400',     // Level 0
      'text-green-400',    // Level 1
      'text-blue-400',     // Level 2
      'text-purple-400',   // Level 3
      'text-yellow-400',   // Level 4
      'text-orange-400',   // Level 5
      'text-red-400',      // Level 6
      'text-pink-400',     // Level 7
      'text-indigo-400',   // Level 8
      'text-cyan-400',     // Level 9
      'text-amber-400',    // Level 10
    ];
    return colors[level] || 'text-gray-400';
  };

  const getLevelBadgeColor = (level: number) => {
    const colors = [
      'bg-gray-500/20 border-gray-500/30',     // Level 0
      'bg-green-500/20 border-green-500/30',   // Level 1
      'bg-blue-500/20 border-blue-500/30',     // Level 2
      'bg-purple-500/20 border-purple-500/30', // Level 3
      'bg-yellow-500/20 border-yellow-500/30', // Level 4
      'bg-orange-500/20 border-orange-500/30', // Level 5
      'bg-red-500/20 border-red-500/30',       // Level 6
      'bg-pink-500/20 border-pink-500/30',     // Level 7
      'bg-indigo-500/20 border-indigo-500/30', // Level 8
      'bg-cyan-500/20 border-cyan-500/30',     // Level 9
      'bg-amber-500/20 border-amber-500/30',   // Level 10
    ];
    return colors[level] || 'bg-gray-500/20 border-gray-500/30';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-gray-400">Carregando níveis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <Award className="text-purple-400" size={24} />
          Sistema de Níveis
        </h2>
        <p className="text-gray-400 mb-6">
          Evolua seus limites através do sistema de níveis baseado em volume de transações.
        </p>
      </div>

      {/* Current Level Card */}
      {userLevel && levelStats ? (
        <div className="bg-gradient-to-br from-purple-900/20 via-blue-900/10 to-pink-900/10 rounded-xl p-6 border border-purple-500/20">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className={`px-4 py-2 rounded-full border ${getLevelBadgeColor(userLevel.level)}`}>
                  <span className={`font-bold ${getLevelColor(userLevel.level)}`}>
                    Nível {userLevel.level}
                  </span>
                </div>
              </div>
              <p className="text-gray-400">Seu nível atual no sistema Atlas</p>
            </div>

            {levelStats.canUpgrade && (
              <button
                onClick={handleUpgradeLevel}
                disabled={upgrading}
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {upgrading ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <TrendingUp className="w-5 h-5" />
                    Subir de Nível
                  </>
                )}
              </button>
            )}
          </div>

          {/* Current Level Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-black/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-blue-400" />
                <span className="text-sm text-gray-400">Volume Total</span>
              </div>
              <p className="text-xl font-bold text-white">
                {formatCurrency(levelStats.totalTransactionVolume)}
              </p>
            </div>

            <div className="bg-black/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-green-400" />
                <span className="text-sm text-gray-400">Transações</span>
              </div>
              <p className="text-xl font-bold text-white">
                {levelStats.totalTransactionCount}
              </p>
            </div>

            <div className="bg-black/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-purple-400" />
                <span className="text-sm text-gray-400">Limite Diário</span>
              </div>
              <p className="text-xl font-bold text-white">
                {userLevel.configuration ? formatCurrency(userLevel.configuration.dailyLimit) : '-'}
              </p>
            </div>

          </div>

          {/* Progress to Next Level */}
          {levelStats.nextLevel !== null && levelStats.nextLevelRequirements && (
            <div className="bg-black/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-400">
                  Progresso para Nível {levelStats.nextLevel}
                </span>
                <span className="text-sm font-medium text-purple-400">
                  {Math.round(levelStats.progressToNext)}%
                </span>
              </div>

              <div className="w-full bg-gray-700 rounded-full h-3 mb-4">
                <div
                  className="bg-gradient-to-r from-purple-600 to-blue-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(levelStats.progressToNext, 100)}%` }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Volume necessário: </span>
                  <span className="text-white font-medium">
                    {formatCurrency(levelStats.nextLevelRequirements.volumeNeeded)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Transações necessárias: </span>
                  <span className="text-white font-medium">
                    {levelStats.nextLevelRequirements.transactionsNeeded}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gradient-to-br from-gray-900/20 via-gray-800/10 to-gray-900/10 rounded-xl p-6 border border-gray-500/20">
          <div className="text-center py-8">
            <Award className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Nível não encontrado</h3>
            <p className="text-gray-400 mb-4">
              Não foi possível carregar suas informações de nível.
            </p>
            <button
              onClick={loadLevelsData}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      )}

      {/* All Levels Overview */}
      <div>
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Star className="text-yellow-400" />
          Todos os Níveis
        </h3>

{allLevels && allLevels.length > 0 ? (
          <>
            {/* Mobile Layout */}
            <div className="block lg:hidden space-y-3">
              {allLevels.map((level) => {
                const isCurrentLevel = userLevel?.level === level.level;
                const isUnlocked = userLevel ? userLevel.level >= level.level : false;

                return (
                  <div
                    key={level.level}
                    className={`
                      bg-gray-800/50 rounded-xl border p-4 transition-all
                      ${isCurrentLevel
                        ? 'border-purple-500/50 bg-purple-500/10'
                        : isUnlocked
                        ? 'border-gray-600/50'
                        : 'border-gray-700/30 opacity-60'
                      }
                    `}
                  >
                    {/* Header Row */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`px-3 py-2 rounded-full border ${getLevelBadgeColor(level.level)}`}>
                          <span className={`font-bold text-base ${getLevelColor(level.level)}`}>
                            {level.level}
                          </span>
                        </div>
                        {isCurrentLevel && (
                          <div className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full">
                            <span className="text-xs font-medium text-purple-400">Atual</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center">
                        {isCurrentLevel ? (
                          <CheckCircle className="w-6 h-6 text-purple-400" />
                        ) : isUnlocked ? (
                          <CheckCircle className="w-6 h-6 text-green-400" />
                        ) : (
                          <div className="w-6 h-6 rounded-full border-2 border-gray-600" />
                        )}
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-xs text-gray-500 block mb-1">Volume Necessário</span>
                        <span className="text-white font-medium">
                          {formatCurrency(level.requiredTransactionVolume)}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block mb-1">Transações</span>
                        <span className="text-white font-medium">
                          {level.requiredTransactionCount}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-xs text-gray-500 block mb-1">Limite Diário</span>
                        <span className="text-white font-semibold text-lg">
                          {formatCurrency(level.dailyLimit)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table Layout */}
            <div className="hidden lg:block bg-gray-800/50 rounded-xl border border-gray-600/50 overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-5 gap-6 p-4 bg-gray-900/50 border-b border-gray-600/50">
                <div className="text-sm font-medium text-gray-400">Nível</div>
                <div className="text-sm font-medium text-gray-400">Volume Necessário</div>
                <div className="text-sm font-medium text-gray-400">Transações</div>
                <div className="text-sm font-medium text-gray-400">Limite Diário</div>
                <div className="text-sm font-medium text-gray-400 text-center">Status</div>
              </div>

              {/* Table Body */}
              {allLevels.map((level) => {
                const isCurrentLevel = userLevel?.level === level.level;
                const isUnlocked = userLevel ? userLevel.level >= level.level : false;

                return (
                  <div
                    key={level.level}
                    className={`
                      grid grid-cols-5 gap-6 p-4 border-b border-gray-700/30 last:border-b-0 transition-all hover:bg-gray-700/20
                      ${isCurrentLevel ? 'bg-purple-500/10' : ''}
                    `}
                  >
                    {/* Level Badge */}
                    <div className="flex items-center">
                      <div className={`px-3 py-2 rounded-full border ${getLevelBadgeColor(level.level)}`}>
                        <span className={`font-bold text-base ${getLevelColor(level.level)}`}>
                          {level.level}
                        </span>
                      </div>
                    </div>

                    {/* Volume Required */}
                    <div className="flex items-center">
                      <span className="text-sm text-white font-medium">
                        {formatCurrency(level.requiredTransactionVolume)}
                      </span>
                    </div>

                    {/* Transactions Required */}
                    <div className="flex items-center">
                      <span className="text-sm text-white font-medium">
                        {level.requiredTransactionCount}
                      </span>
                    </div>

                    {/* Daily Limit */}
                    <div className="flex items-center">
                      <span className="text-base font-semibold text-white">
                        {formatCurrency(level.dailyLimit)}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="flex items-center justify-center">
                      {isCurrentLevel ? (
                        <div className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full">
                          <span className="text-xs font-medium text-purple-400">Atual</span>
                        </div>
                      ) : isUnlocked ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-600" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-8 bg-gray-800/50 rounded-xl border border-gray-600/50">
            <p className="text-gray-400">Nenhum nível configurado encontrado.</p>
            <p className="text-sm text-gray-500 mt-2">Contate o administrador do sistema.</p>
          </div>
        )}
      </div>

      {/* Level History */}
      {levelHistory && levelHistory.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="text-blue-400" />
            Histórico de Níveis
          </h3>

          <div className="space-y-3">
            {levelHistory.slice(0, 5).map((history) => (
              <div
                key={history.id}
                className="p-4 bg-gray-800/50 rounded-lg border border-gray-600/50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    <div>
                      <p className="text-white font-medium">
                        Nível {history.oldLevel} → Nível {history.newLevel}
                      </p>
                      <p className="text-sm text-gray-400">{history.reason || 'Motivo não especificado'}</p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatDate(history.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}