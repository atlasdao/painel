'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Edit,
  Calendar,
  Users,
  Percent,
  DollarSign,
  Tag,
  BarChart3,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import api from '@/app/lib/api';

interface DiscountCoupon {
  id: string;
  code: string;
  description?: string;
  discountPercentage: number;
  maxUses?: number;
  maxUsesPerUser: number;
  currentUses: number;
  validFrom: string;
  validUntil?: string;
  minAmount?: number;
  maxAmount?: number;
  allowedMethods: string[];
  isActive: boolean;
  createdAt: string;
  createdBy?: string;
  _count?: {
    usages: number;
  };
}

interface CouponStats {
  total: number;
  active: number;
  expired: number;
  totalUsages: number;
  totalDiscounts: number;
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<DiscountCoupon[]>([]);
  const [stats, setStats] = useState<CouponStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<DiscountCoupon | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discountPercentage: 10,
    maxUses: '',
    maxUsesPerUser: 1,
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: '',
    minAmount: '',
    maxAmount: '',
    allowedMethods: ['PIX', 'DEPIX'],
    isActive: true
  });

  useEffect(() => {
    fetchCoupons();
    fetchStats();
  }, []);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/coupons');
      setCoupons(response.data);
    } catch (error) {
      console.error('Error fetching coupons:', error);
      setError('Erro ao carregar cupons');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/coupons/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const payload: any = {
      ...formData,
      discountPercentage: Number(formData.discountPercentage),
      maxUsesPerUser: Number(formData.maxUsesPerUser),
      maxUses: formData.maxUses ? Number(formData.maxUses) : undefined,
      minAmount: formData.minAmount ? Number(formData.minAmount) : undefined,
      maxAmount: formData.maxAmount ? Number(formData.maxAmount) : undefined,
      validUntil: formData.validUntil || undefined,
    };

    try {
      if (editingCoupon) {
        await api.patch(`/admin/coupons/${editingCoupon.id}`, payload);
        setSuccess('Cupom atualizado com sucesso');
      } else {
        await api.post('/admin/coupons', payload);
        setSuccess('Cupom criado com sucesso');
      }

      setShowCreateModal(false);
      setEditingCoupon(null);
      resetForm();
      fetchCoupons();
      fetchStats();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Erro ao salvar cupom');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cupom?')) return;

    try {
      await api.delete(`/admin/coupons/${id}`);
      setSuccess('Cupom excluído com sucesso');
      fetchCoupons();
      fetchStats();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Erro ao excluir cupom');
    }
  };

  const handleEdit = (coupon: DiscountCoupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      description: coupon.description || '',
      discountPercentage: coupon.discountPercentage,
      maxUses: coupon.maxUses?.toString() || '',
      maxUsesPerUser: coupon.maxUsesPerUser,
      validFrom: coupon.validFrom.split('T')[0],
      validUntil: coupon.validUntil ? coupon.validUntil.split('T')[0] : '',
      minAmount: coupon.minAmount?.toString() || '',
      maxAmount: coupon.maxAmount?.toString() || '',
      allowedMethods: coupon.allowedMethods,
      isActive: coupon.isActive
    });
    setShowCreateModal(true);
  };

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      discountPercentage: 10,
      maxUses: '',
      maxUsesPerUser: 1,
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: '',
      minAmount: '',
      maxAmount: '',
      allowedMethods: ['PIX', 'DEPIX'],
      isActive: true
    });
  };

  const getStatusColor = (coupon: DiscountCoupon) => {
    if (!coupon.isActive) return 'text-gray-400';
    if (coupon.validUntil && new Date(coupon.validUntil) < new Date()) return 'text-red-400';
    if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getStatusText = (coupon: DiscountCoupon) => {
    if (!coupon.isActive) return 'Inativo';
    if (coupon.validUntil && new Date(coupon.validUntil) < new Date()) return 'Expirado';
    if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) return 'Limite Atingido';
    return 'Ativo';
  };

  return (
    <div className="p-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-white">Cupons de Desconto</h1>
          <p className="text-gray-400">Gerencie cupons de desconto para saques</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingCoupon(null);
            setShowCreateModal(true);
          }}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors flex items-center"
        >
          <Plus size={20} className="mr-2" />
          Novo Cupom
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Total de Cupons</span>
              <Tag size={20} className="text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Cupons Ativos</span>
              <CheckCircle size={20} className="text-green-400" />
            </div>
            <p className="text-2xl font-bold text-white">{stats.active}</p>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Expirados</span>
              <XCircle size={20} className="text-red-400" />
            </div>
            <p className="text-2xl font-bold text-white">{stats.expired}</p>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Total de Usos</span>
              <Users size={20} className="text-blue-400" />
            </div>
            <p className="text-2xl font-bold">{stats.totalUsages}</p>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Total Descontado</span>
              <DollarSign size={20} className="text-yellow-400" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(stats.totalDiscounts)}</p>
          </div>
        </div>
      )}

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500 rounded-lg flex items-center">
          <AlertCircle size={20} className="text-red-500 mr-2" />
          <span className="text-red-500">{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-500/10 border border-green-500 rounded-lg">
          <span className="text-green-500">{success}</span>
        </div>
      )}

      {/* Coupons Table */}
      <div className="glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold">Lista de Cupons</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="table-modern">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Desconto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Usos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Validade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Limites
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {coupons.map((coupon) => (
                <tr key={coupon.id} className="hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="font-medium">{coupon.code}</p>
                      {coupon.description && (
                        <p className="text-sm text-gray-400">{coupon.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-lg font-semibold text-green-400">
                      {coupon.discountPercentage}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p>{coupon.currentUses} / {coupon.maxUses || '∞'}</p>
                      <p className="text-xs text-gray-400">
                        Max por usuário: {coupon.maxUsesPerUser}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <p>De: {new Date(coupon.validFrom).toLocaleDateString('pt-BR')}</p>
                      {coupon.validUntil && (
                        <p>Até: {new Date(coupon.validUntil).toLocaleDateString('pt-BR')}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      {coupon.minAmount && (
                        <p>Min: {formatCurrency(coupon.minAmount)}</p>
                      )}
                      {coupon.maxAmount && (
                        <p>Max: {formatCurrency(coupon.maxAmount)}</p>
                      )}
                      <p className="text-xs text-gray-400">
                        {coupon.allowedMethods.join(', ')}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${getStatusColor(coupon)}`}>
                      {getStatusText(coupon)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(coupon)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(coupon.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                    Nenhum cupom encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-card p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              {editingCoupon ? 'Editar Cupom' : 'Criar Novo Cupom'}
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Código do Cupom *
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="DESCONTO10"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Desconto (%) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.discountPercentage}
                    onChange={(e) => setFormData({ ...formData, discountPercentage: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    Descrição
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Cupom de boas-vindas"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Máximo de Usos (Total)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxUses}
                    onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                    placeholder="Ilimitado"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Máximo por Usuário *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxUsesPerUser}
                    onChange={(e) => setFormData({ ...formData, maxUsesPerUser: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Válido De *
                  </label>
                  <input
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Válido Até
                  </label>
                  <input
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Valor Mínimo (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.minAmount}
                    onChange={(e) => setFormData({ ...formData, minAmount: e.target.value })}
                    placeholder="Sem mínimo"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Valor Máximo (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.maxAmount}
                    onChange={(e) => setFormData({ ...formData, maxAmount: e.target.value })}
                    placeholder="Sem máximo"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Métodos Permitidos
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.allowedMethods.includes('PIX')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, allowedMethods: [...formData.allowedMethods, 'PIX'] });
                          } else {
                            setFormData({ ...formData, allowedMethods: formData.allowedMethods.filter(m => m !== 'PIX') });
                          }
                        }}
                        className="mr-2"
                      />
                      PIX
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.allowedMethods.includes('DEPIX')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, allowedMethods: [...formData.allowedMethods, 'DEPIX'] });
                          } else {
                            setFormData({ ...formData, allowedMethods: formData.allowedMethods.filter(m => m !== 'DEPIX') });
                          }
                        }}
                        className="mr-2"
                      />
                      DePix
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Status
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="mr-2"
                    />
                    Ativo
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingCoupon(null);
                    resetForm();
                  }}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors"
                >
                  {editingCoupon ? 'Atualizar' : 'Criar'} Cupom
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}