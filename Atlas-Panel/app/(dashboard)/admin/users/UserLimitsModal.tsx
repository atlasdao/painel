import React, { useState } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';
import { api } from '@/app/lib/api';
import toast from 'react-hot-toast';

interface UserLimitsModalProps {
  user: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function UserLimitsModal({
  user,
  isOpen,
  onClose,
  onSave,
}: UserLimitsModalProps) {
  const [limits, setLimits] = useState({
    dailyDepositLimit: user?.limits?.dailyDepositLimit || 1000,
    dailyWithdrawLimit: user?.limits?.dailyWithdrawLimit || 1000,
    dailyTransferLimit: user?.limits?.dailyTransferLimit || 1000,
    monthlyDepositLimit: user?.limits?.monthlyDepositLimit || 10000,
    monthlyWithdrawLimit: user?.limits?.monthlyWithdrawLimit || 10000,
    monthlyTransferLimit: user?.limits?.monthlyTransferLimit || 10000,
    maxDepositPerTx: user?.limits?.maxDepositPerTx || 5000,
    maxWithdrawPerTx: user?.limits?.maxWithdrawPerTx || 5000,
    maxTransferPerTx: user?.limits?.maxTransferPerTx || 5000,
    apiDailyLimit: user?.apiDailyLimit || 6000,
    apiMonthlyLimit: user?.apiMonthlyLimit || 180000,
    isKycVerified: user?.limits?.isKycVerified || false,
    isHighRiskUser: user?.limits?.isHighRiskUser || false,
  });

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/admin/users/${user.id}/limits`, limits);
      toast.success('Limites atualizados com sucesso!');
      onSave();
      onClose();
    } catch (error) {
      console.error('Error updating limits:', error);
      toast.error('Erro ao atualizar limites');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Ajustar Limites do Usuário</h2>
            <p className="text-sm text-gray-400 mt-1">
              {user?.username} ({user?.email})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Daily Limits */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Limites Diários</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Depósito (R$)
                </label>
                <input
                  type="number"
                  value={limits.dailyDepositLimit}
                  onChange={(e) => setLimits({ ...limits, dailyDepositLimit: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Saque (R$)
                </label>
                <input
                  type="number"
                  value={limits.dailyWithdrawLimit}
                  onChange={(e) => setLimits({ ...limits, dailyWithdrawLimit: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Transferência (R$)
                </label>
                <input
                  type="number"
                  value={limits.dailyTransferLimit}
                  onChange={(e) => setLimits({ ...limits, dailyTransferLimit: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Monthly Limits */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Limites Mensais</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Depósito (R$)
                </label>
                <input
                  type="number"
                  value={limits.monthlyDepositLimit}
                  onChange={(e) => setLimits({ ...limits, monthlyDepositLimit: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Saque (R$)
                </label>
                <input
                  type="number"
                  value={limits.monthlyWithdrawLimit}
                  onChange={(e) => setLimits({ ...limits, monthlyWithdrawLimit: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Transferência (R$)
                </label>
                <input
                  type="number"
                  value={limits.monthlyTransferLimit}
                  onChange={(e) => setLimits({ ...limits, monthlyTransferLimit: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Per Transaction Limits */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Limites por Transação</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Máx. Depósito (R$)
                </label>
                <input
                  type="number"
                  value={limits.maxDepositPerTx}
                  onChange={(e) => setLimits({ ...limits, maxDepositPerTx: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Máx. Saque (R$)
                </label>
                <input
                  type="number"
                  value={limits.maxWithdrawPerTx}
                  onChange={(e) => setLimits({ ...limits, maxWithdrawPerTx: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Máx. Transferência (R$)
                </label>
                <input
                  type="number"
                  value={limits.maxTransferPerTx}
                  onChange={(e) => setLimits({ ...limits, maxTransferPerTx: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* API Limits */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Limites de API</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Limite Diário API (R$)
                </label>
                <input
                  type="number"
                  value={limits.apiDailyLimit}
                  onChange={(e) => setLimits({ ...limits, apiDailyLimit: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Limite Mensal API (R$)
                </label>
                <input
                  type="number"
                  value={limits.apiMonthlyLimit}
                  onChange={(e) => setLimits({ ...limits, apiMonthlyLimit: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Flags */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Configurações Especiais</h3>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={limits.isKycVerified}
                  onChange={(e) => setLimits({ ...limits, isKycVerified: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <span className="text-white">KYC Verificado</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={limits.isHighRiskUser}
                  onChange={(e) => setLimits({ ...limits, isHighRiskUser: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <span className="text-white">Usuário de Alto Risco</span>
              </label>
            </div>
          </div>

          {/* Warning */}
          <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-yellow-400 mt-0.5" size={20} />
              <div>
                <p className="text-yellow-400 font-medium">Atenção</p>
                <p className="text-gray-300 text-sm mt-1">
                  Estes limites substituirão os limites globais MED para este usuário específico.
                  Use com cuidado para manter a conformidade regulatória.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Salvar Limites
          </button>
        </div>
      </div>
    </div>
  );
}