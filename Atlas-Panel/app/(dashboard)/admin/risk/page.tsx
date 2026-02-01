'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminService } from '../../../lib/services';

interface RiskUser {
  id: string;
  email: string;
  name: string | null;
  riskScore: number;
  riskStatus: string;
  lastAnalysis: string;
  flags: string[];
  devices: number;
  sessions: number;
}

interface BlockedEntity {
  id: string;
  type: string;
  value: string;
  reason: string;
  notes: string | null;
  createdAt: string;
  expiresAt: string | null;
}

interface RiskStats {
  totalUsers: number;
  pendingReview: number;
  blocked: number;
  cleared: number;
  blockedEntities: {
    ips: number;
    fingerprints: number;
    euids: number;
  };
}

interface UserRiskProfile {
  user: {
    id: string;
    email: string;
    name: string | null;
    createdAt: string;
  };
  riskProfile: {
    riskScore: number;
    riskStatus: string;
    riskFactors: Record<string, number>;
    lastAnalysis: string;
    reviewNotes: string | null;
  } | null;
  devices: Array<{
    id: string;
    fingerprintHash: string;
    userAgent: string;
    lastSeen: string;
    isTrusted: boolean;
  }>;
  sessions: Array<{
    id: string;
    ipAddress: string;
    country: string | null;
    city: string | null;
    isVpn: boolean;
    isTor: boolean;
    createdAt: string;
  }>;
  events: Array<{
    id: string;
    eventType: string;
    riskScore: number;
    details: Record<string, unknown>;
    createdAt: string;
  }>;
}

export default function RiskManagementPage() {
  const [activeTab, setActiveTab] = useState<'queue' | 'blocked' | 'stats'>('queue');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Queue state
  const [reviewQueue, setReviewQueue] = useState<RiskUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserRiskProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Blocked entities state
  const [blockedEntities, setBlockedEntities] = useState<BlockedEntity[]>([]);
  const [blockedFilter, setBlockedFilter] = useState<string>('all');

  // Stats state
  const [stats, setStats] = useState<RiskStats | null>(null);

  // Action state
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');

  // Block entity modal
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockForm, setBlockForm] = useState({
    type: 'IP',
    value: '',
    reason: 'MANUAL_BLOCK',
    notes: '',
    expiresInDays: ''
  });

  const loadReviewQueue = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminService.getRiskReviewQueue(50);
      setReviewQueue(data.users || []);
    } catch (err) {
      console.error('Erro ao carregar fila de revisão:', err);
      setError('Falha ao carregar fila de revisão');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBlockedEntities = useCallback(async () => {
    try {
      setLoading(true);
      const type = blockedFilter === 'all' ? undefined : blockedFilter;
      const data = await adminService.getBlockedEntities(type, 100, 0);
      setBlockedEntities(data.entities || []);
    } catch (err) {
      console.error('Erro ao carregar entidades bloqueadas:', err);
      setError('Falha ao carregar entidades bloqueadas');
    } finally {
      setLoading(false);
    }
  }, [blockedFilter]);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminService.getRiskStats();
      setStats(data);
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err);
      setError('Falha ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'queue') {
      loadReviewQueue();
    } else if (activeTab === 'blocked') {
      loadBlockedEntities();
    } else if (activeTab === 'stats') {
      loadStats();
    }
  }, [activeTab, loadReviewQueue, loadBlockedEntities, loadStats]);

  const loadUserProfile = async (userId: string) => {
    try {
      setProfileLoading(true);
      setSelectedUser(userId);
      const data = await adminService.getUserRiskProfile(userId);
      setUserProfile(data);
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
      setError('Falha ao carregar perfil do usuário');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleReviewUser = async (userId: string, newStatus: 'CLEARED' | 'BLOCKED' | 'MONITORING') => {
    if (!reviewNotes.trim() && newStatus !== 'MONITORING') {
      setError('Por favor, adicione notas para esta ação');
      return;
    }

    try {
      setActionLoading(true);
      await adminService.reviewUser(userId, { notes: reviewNotes, newStatus });
      setReviewNotes('');
      setSelectedUser(null);
      setUserProfile(null);
      await loadReviewQueue();
    } catch (err) {
      console.error('Erro ao revisar usuário:', err);
      setError('Falha ao processar revisão');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlockEntity = async () => {
    if (!blockForm.value.trim()) {
      setError('Por favor, preencha o valor a ser bloqueado');
      return;
    }

    try {
      setActionLoading(true);
      // Calcular data de expiração se dias foram informados
      let expiresAt: string | undefined;
      if (blockForm.expiresInDays) {
        const days = parseInt(blockForm.expiresInDays);
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + days);
        expiresAt = expirationDate.toISOString();
      }

      await adminService.blockEntity({
        type: blockForm.type,
        value: blockForm.value,
        reason: blockForm.reason,
        reasonDetails: blockForm.notes || undefined,
        expiresAt
      });
      setShowBlockModal(false);
      setBlockForm({ type: 'IP', value: '', reason: 'MANUAL_BLOCK', notes: '', expiresInDays: '' });
      await loadBlockedEntities();
    } catch (err) {
      console.error('Erro ao bloquear entidade:', err);
      setError('Falha ao bloquear entidade');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblockEntity = async (type: string, value: string) => {
    if (!confirm(`Tem certeza que deseja desbloquear ${type}: ${value}?`)) {
      return;
    }

    try {
      setActionLoading(true);
      await adminService.unblockEntity(type, value);
      await loadBlockedEntities();
    } catch (err) {
      console.error('Erro ao desbloquear:', err);
      setError('Falha ao desbloquear entidade');
    } finally {
      setActionLoading(false);
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-red-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING_REVIEW: 'bg-yellow-500/20 text-yellow-400',
      CLEARED: 'bg-green-500/20 text-green-400',
      BLOCKED: 'bg-red-500/20 text-red-400',
      MONITORING: 'bg-blue-500/20 text-blue-400'
    };
    return styles[status] || 'bg-gray-500/20 text-gray-400';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Gerenciamento de Riscos</h1>

        {/* Error display */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400">
            {error}
            <button onClick={() => setError(null)} className="ml-4 underline">Fechar</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'queue'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Fila de Revisão
          </button>
          <button
            onClick={() => setActiveTab('blocked')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'blocked'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Entidades Bloqueadas
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'stats'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Estatísticas
          </button>
        </div>

        {/* Queue Tab */}
        {activeTab === 'queue' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User List */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-4">Usuários para Revisão</h2>

              {loading ? (
                <div className="text-center py-8 text-gray-400">Carregando...</div>
              ) : reviewQueue.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  Nenhum usuário pendente de revisão
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {reviewQueue.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => loadUserProfile(user.id)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedUser === user.id
                          ? 'bg-blue-600/30 border border-blue-500'
                          : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{user.email}</p>
                          <p className="text-sm text-gray-400">{user.name || 'Sem nome'}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${getRiskColor(user.riskScore)}`}>
                            {user.riskScore}
                          </p>
                          <span className={`text-xs px-2 py-1 rounded ${getStatusBadge(user.riskStatus)}`}>
                            {user.riskStatus}
                          </span>
                        </div>
                      </div>
                      {user.flags && user.flags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {user.flags.map((flag, i) => (
                            <span key={i} className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">
                              {flag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* User Profile */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-4">Detalhes do Usuário</h2>

              {!selectedUser ? (
                <div className="text-center py-8 text-gray-400">
                  Selecione um usuário para ver detalhes
                </div>
              ) : profileLoading ? (
                <div className="text-center py-8 text-gray-400">Carregando perfil...</div>
              ) : userProfile ? (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {/* User Info */}
                  <div className="bg-gray-700 rounded-lg p-3">
                    <h3 className="font-medium mb-2">Informações</h3>
                    <p><span className="text-gray-400">Email:</span> {userProfile.user.email}</p>
                    <p><span className="text-gray-400">Nome:</span> {userProfile.user.name || '-'}</p>
                    <p><span className="text-gray-400">Criado em:</span> {new Date(userProfile.user.createdAt).toLocaleString('pt-BR')}</p>
                  </div>

                  {/* Risk Profile */}
                  {userProfile.riskProfile && (
                    <div className="bg-gray-700 rounded-lg p-3">
                      <h3 className="font-medium mb-2">Perfil de Risco</h3>
                      <p>
                        <span className="text-gray-400">Score:</span>{' '}
                        <span className={`font-bold ${getRiskColor(userProfile.riskProfile.riskScore)}`}>
                          {userProfile.riskProfile.riskScore}
                        </span>
                      </p>
                      <p><span className="text-gray-400">Status:</span> {userProfile.riskProfile.riskStatus}</p>
                      {userProfile.riskProfile.riskFactors && Object.keys(userProfile.riskProfile.riskFactors).length > 0 && (
                        <div className="mt-2">
                          <span className="text-gray-400">Fatores:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Object.entries(userProfile.riskProfile.riskFactors).map(([key, value]) => (
                              <span key={key} className="text-xs bg-gray-600 px-2 py-0.5 rounded">
                                {key}: {String(value)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Devices */}
                  <div className="bg-gray-700 rounded-lg p-3">
                    <h3 className="font-medium mb-2">Dispositivos ({userProfile.devices.length})</h3>
                    {userProfile.devices.length === 0 ? (
                      <p className="text-gray-400 text-sm">Nenhum dispositivo registrado</p>
                    ) : (
                      <div className="space-y-2">
                        {userProfile.devices.slice(0, 5).map((device) => (
                          <div key={device.id} className="text-sm bg-gray-600 rounded p-2">
                            <p className="font-mono text-xs truncate">{device.fingerprintHash}</p>
                            <p className="text-gray-400 truncate">{device.userAgent}</p>
                            <p className="text-xs text-gray-500">
                              Último acesso: {new Date(device.lastSeen).toLocaleString('pt-BR')}
                              {device.isTrusted && <span className="ml-2 text-green-400">Confiável</span>}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Sessions */}
                  <div className="bg-gray-700 rounded-lg p-3">
                    <h3 className="font-medium mb-2">Sessões Recentes ({userProfile.sessions.length})</h3>
                    {userProfile.sessions.length === 0 ? (
                      <p className="text-gray-400 text-sm">Nenhuma sessão registrada</p>
                    ) : (
                      <div className="space-y-2">
                        {userProfile.sessions.slice(0, 5).map((session) => (
                          <div key={session.id} className="text-sm bg-gray-600 rounded p-2">
                            <p className="font-mono">{session.ipAddress}</p>
                            <p className="text-gray-400">
                              {session.city && `${session.city}, `}{session.country || 'Localização desconhecida'}
                            </p>
                            <div className="flex gap-2 mt-1">
                              {session.isVpn && (
                                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">VPN</span>
                              )}
                              {session.isTor && (
                                <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">TOR</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Events */}
                  {userProfile.events && userProfile.events.length > 0 && (
                    <div className="bg-gray-700 rounded-lg p-3">
                      <h3 className="font-medium mb-2">Eventos de Risco ({userProfile.events.length})</h3>
                      <div className="space-y-2">
                        {userProfile.events.slice(0, 5).map((event) => (
                          <div key={event.id} className="text-sm bg-gray-600 rounded p-2">
                            <div className="flex justify-between">
                              <span>{event.eventType}</span>
                              <span className={getRiskColor(event.riskScore)}>{event.riskScore}</span>
                            </div>
                            <p className="text-xs text-gray-500">
                              {new Date(event.createdAt).toLocaleString('pt-BR')}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="bg-gray-700 rounded-lg p-3">
                    <h3 className="font-medium mb-2">Ações</h3>
                    <textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Notas sobre a decisão..."
                      className="w-full bg-gray-600 border border-gray-500 rounded p-2 text-sm mb-3"
                      rows={2}
                    />
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleReviewUser(selectedUser, 'CLEARED')}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm disabled:opacity-50"
                      >
                        Aprovar
                      </button>
                      <button
                        onClick={() => handleReviewUser(selectedUser, 'MONITORING')}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm disabled:opacity-50"
                      >
                        Monitorar
                      </button>
                      <button
                        onClick={() => handleReviewUser(selectedUser, 'BLOCKED')}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm disabled:opacity-50"
                      >
                        Bloquear
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Blocked Tab */}
        {activeTab === 'blocked' && (
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex gap-2">
                <select
                  value={blockedFilter}
                  onChange={(e) => setBlockedFilter(e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded px-3 py-2"
                >
                  <option value="all">Todos os tipos</option>
                  <option value="IP">IPs</option>
                  <option value="FINGERPRINT">Fingerprints</option>
                  <option value="EUID">EUIDs (CPF/CNPJ)</option>
                </select>
              </div>
              <button
                onClick={() => setShowBlockModal(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
              >
                + Bloquear Entidade
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8 text-gray-400">Carregando...</div>
            ) : blockedEntities.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                Nenhuma entidade bloqueada
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-700">
                      <th className="pb-2 pr-4">Tipo</th>
                      <th className="pb-2 pr-4">Valor</th>
                      <th className="pb-2 pr-4">Motivo</th>
                      <th className="pb-2 pr-4">Notas</th>
                      <th className="pb-2 pr-4">Bloqueado em</th>
                      <th className="pb-2 pr-4">Expira em</th>
                      <th className="pb-2">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blockedEntities.map((entity) => (
                      <tr key={entity.id} className="border-b border-gray-700">
                        <td className="py-2 pr-4">
                          <span className="bg-gray-700 px-2 py-1 rounded text-sm">{entity.type}</span>
                        </td>
                        <td className="py-2 pr-4 font-mono text-sm">{entity.value}</td>
                        <td className="py-2 pr-4 text-sm">{entity.reason}</td>
                        <td className="py-2 pr-4 text-sm text-gray-400">{entity.notes || '-'}</td>
                        <td className="py-2 pr-4 text-sm">
                          {new Date(entity.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-2 pr-4 text-sm">
                          {entity.expiresAt
                            ? new Date(entity.expiresAt).toLocaleDateString('pt-BR')
                            : 'Permanente'}
                        </td>
                        <td className="py-2">
                          <button
                            onClick={() => handleUnblockEntity(entity.type, entity.value)}
                            disabled={actionLoading}
                            className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
                          >
                            Desbloquear
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {loading ? (
              <div className="col-span-full text-center py-8 text-gray-400">Carregando...</div>
            ) : stats ? (
              <>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-gray-400 text-sm">Total de Usuários</h3>
                  <p className="text-3xl font-bold">{stats.totalUsers}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-gray-400 text-sm">Pendentes de Revisão</h3>
                  <p className="text-3xl font-bold text-yellow-400">{stats.pendingReview}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-gray-400 text-sm">Bloqueados</h3>
                  <p className="text-3xl font-bold text-red-400">{stats.blocked}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-gray-400 text-sm">Aprovados</h3>
                  <p className="text-3xl font-bold text-green-400">{stats.cleared}</p>
                </div>

                {/* Blocked entities breakdown */}
                <div className="bg-gray-800 rounded-lg p-4 md:col-span-2 lg:col-span-4">
                  <h3 className="text-gray-400 text-sm mb-4">Entidades Bloqueadas</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-700 rounded p-3 text-center">
                      <p className="text-2xl font-bold">{stats.blockedEntities?.ips || 0}</p>
                      <p className="text-gray-400 text-sm">IPs</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3 text-center">
                      <p className="text-2xl font-bold">{stats.blockedEntities?.fingerprints || 0}</p>
                      <p className="text-gray-400 text-sm">Fingerprints</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3 text-center">
                      <p className="text-2xl font-bold">{stats.blockedEntities?.euids || 0}</p>
                      <p className="text-gray-400 text-sm">EUIDs (CPF/CNPJ)</p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="col-span-full text-center py-8 text-gray-400">
                Falha ao carregar estatísticas
              </div>
            )}
          </div>
        )}

        {/* Block Entity Modal */}
        {showBlockModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Bloquear Entidade</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Tipo</label>
                  <select
                    value={blockForm.type}
                    onChange={(e) => setBlockForm({ ...blockForm, type: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  >
                    <option value="IP">IP</option>
                    <option value="FINGERPRINT">Fingerprint</option>
                    <option value="EUID">EUID (CPF/CNPJ)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Valor</label>
                  <input
                    type="text"
                    value={blockForm.value}
                    onChange={(e) => setBlockForm({ ...blockForm, value: e.target.value })}
                    placeholder={blockForm.type === 'IP' ? '192.168.1.1' : blockForm.type === 'EUID' ? 'CPF ou CNPJ' : 'Hash do fingerprint'}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Motivo</label>
                  <select
                    value={blockForm.reason}
                    onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  >
                    <option value="MANUAL_BLOCK">Bloqueio Manual</option>
                    <option value="FRAUD_DETECTED">Fraude Detectada</option>
                    <option value="SUSPICIOUS_ACTIVITY">Atividade Suspeita</option>
                    <option value="ABUSE">Abuso</option>
                    <option value="TOR_EXIT">Exit Node TOR</option>
                    <option value="KNOWN_DATACENTER">Datacenter Conhecido</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Notas (opcional)</label>
                  <textarea
                    value={blockForm.notes}
                    onChange={(e) => setBlockForm({ ...blockForm, notes: e.target.value })}
                    placeholder="Detalhes adicionais..."
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Expiração (dias, vazio = permanente)</label>
                  <input
                    type="number"
                    value={blockForm.expiresInDays}
                    onChange={(e) => setBlockForm({ ...blockForm, expiresInDays: e.target.value })}
                    placeholder="30"
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowBlockModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleBlockEntity}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded disabled:opacity-50"
                >
                  {actionLoading ? 'Bloqueando...' : 'Bloquear'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
