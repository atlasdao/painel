import api from './api';
import { Transaction, DashboardStats, Balance, PixQRCode } from '@/app/types';

export const accountValidationService = {
  async getValidationStatus(): Promise<any> {
    const response = await api.get('/account-validation/status');
    return response.data;
  },

  async createValidationPayment(depixAddress: string): Promise<any> {
    const response = await api.post('/account-validation/create-payment', { depixAddress });
    return response.data;
  },

  async getValidationRequirements(): Promise<any> {
    const response = await api.get('/account-validation/requirements');
    return response.data;
  },

  async getUserLimits(): Promise<any> {
    const response = await api.get('/account-validation/limits');
    return response.data;
  },

  async manualValidationCheck(): Promise<any> {
    const response = await api.post('/account-validation/manual-check');
    return response.data;
  },
};

export const pixService = {
  async createDeposit(amount: number, pixKey?: string): Promise<PixQRCode> {
    const response = await api.post<PixQRCode>('/pix/deposit', { amount, pixKey });
    return response.data;
  },

  async generateQRCode(params: {
    amount: number;
    depixAddress: string; // Campo obrigatório
    description?: string;
    expirationMinutes?: number;
  }): Promise<any> {
    const response = await api.post('/pix/qrcode', params);
    return response.data;
  },

  async createWithdraw(amount: number, pixKey: string): Promise<Transaction> {
    const response = await api.post<Transaction>('/pix/withdraw', { amount, pixKey });
    return response.data;
  },

  async getTransactions(params?: { limit?: number; offset?: number }): Promise<Transaction[]> {
    // Convert limit/offset to take/skip for API compatibility
    const apiParams = params ? {
      take: params.limit,
      skip: params.offset
    } : undefined;
    const response = await api.get<Transaction[]>('/pix/transactions', { params: apiParams });
    return response.data;
  },

  async getTransaction(id: number): Promise<Transaction> {
    const response = await api.get<Transaction>(`/pix/transactions/${id}`);
    return response.data;
  },

  async getBalance(): Promise<Balance> {
    const response = await api.get<Balance>('/pix/balance');
    return response.data;
  },

  async checkDepositStatus(transactionId: string): Promise<any> {
    const response = await api.get<any>(`/pix/deposit/${transactionId}/status`);
    return response.data;
  },
};

export const adminService = {
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await api.get<DashboardStats>('/admin/dashboard');
    return response.data;
  },

  async getAllTransactions(params?: { 
    limit?: number; 
    offset?: number;
    status?: string;
    userId?: number | string;
    type?: string;
  }): Promise<Transaction[]> {
    // Convert limit/offset to take/skip for API compatibility
    const apiParams = params ? {
      take: params.limit,
      skip: params.offset,
      status: params.status,
      userId: params.userId ? (typeof params.userId === 'string' ? params.userId : params.userId.toString()) : undefined,
      type: params.type
    } : undefined;
    const response = await api.get<Transaction[]>('/admin/transactions', { params: apiParams });
    return response.data;
  },

  async updateTransactionStatus(
    transactionId: number, 
    status: 'COMPLETED' | 'FAILED'
  ): Promise<Transaction> {
    const response = await api.patch<Transaction>(
      `/admin/transactions/${transactionId}`,
      { status }
    );
    return response.data;
  },

  async getUsers(params?: { limit?: number; offset?: number }): Promise<any[]> {
    // Convert limit/offset to take/skip for API compatibility
    const apiParams = params ? {
      take: params.limit,
      skip: params.offset
    } : undefined;
    const response = await api.get('/admin/users', { params: apiParams });
    return response.data;
  },

  async createUser(data: { username: string; email: string; password: string; role: string }): Promise<any> {
    const response = await api.post('/admin/users', data);
    return response.data;
  },

  async updateUser(userId: string, data: any): Promise<any> {
    const response = await api.patch(`/admin/users/${userId}`, data);
    return response.data;
  },

  async deleteUser(userId: string): Promise<void> {
    await api.delete(`/admin/users/${userId}`);
  },

  async generateApiKey(userId: string): Promise<any> {
    const response = await api.post(`/admin/users/${userId}/generate-api-key`);
    return response.data;
  },

  async updateUserMedLimits(userId: string, limits: any): Promise<any> {
    const response = await api.put(`/admin/users/${userId}/med-limits`, limits);
    return response.data;
  },

  async adjustUserReputation(userId: string, reputation: any): Promise<any> {
    const response = await api.put(`/account-validation/user/${userId}/limits`, reputation);
    return response.data;
  },

  async getSystemStats(): Promise<any> {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  async getUserStats(userId?: string): Promise<any> {
    if (userId) {
      const response = await api.get(`/admin/users/${userId}/stats`);
      return response.data;
    }
    const response = await api.get('/admin/stats/users');
    return response.data;
  },

  async getAuditStats(startDate?: Date, endDate?: Date): Promise<any> {
    const params = {
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
    };
    const response = await api.get('/admin/stats/audit', { params });
    return response.data;
  },

  async getAuditLogs(params?: {
    skip?: number;
    take?: number;
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<any[]> {
    const apiParams = params ? {
      skip: params.skip,
      take: params.take,
      userId: params.userId,
      action: params.action,
      resource: params.resource,
      startDate: params.startDate?.toISOString(),
      endDate: params.endDate?.toISOString(),
    } : undefined;
    const response = await api.get('/admin/audit-logs', { params: apiParams });
    return response.data;
  },

  // User Limits Management (MED Compliance)
  async getAllUsersWithLimits(params?: {
    skip?: number;
    take?: number;
    isFirstDay?: boolean;
    isKycVerified?: boolean;
    isHighRiskUser?: boolean;
  }): Promise<any> {
    const apiParams = params ? {
      skip: params.skip,
      take: params.take,
      isFirstDay: params.isFirstDay,
      isKycVerified: params.isKycVerified,
      isHighRiskUser: params.isHighRiskUser,
    } : undefined;
    const response = await api.get('/admin/users/limits', { params: apiParams });
    return response.data;
  },

  async getUserLimits(userId: string): Promise<any> {
    const response = await api.get(`/admin/users/${userId}/limits`);
    return response.data;
  },

  async updateUserLimits(userId: string, limits: {
    dailyDepositLimit?: number;
    dailyWithdrawLimit?: number;
    dailyTransferLimit?: number;
    maxDepositPerTx?: number;
    maxWithdrawPerTx?: number;
    maxTransferPerTx?: number;
    monthlyDepositLimit?: number;
    monthlyWithdrawLimit?: number;
    monthlyTransferLimit?: number;
    isKycVerified?: boolean;
    isHighRiskUser?: boolean;
    notes?: string;
  }): Promise<any> {
    const response = await api.put(`/admin/users/${userId}/limits`, limits);
    return response.data;
  },

  async resetUserFirstDay(userId: string): Promise<any> {
    const response = await api.post(`/admin/users/${userId}/limits/reset-first-day`);
    return response.data;
  },

  async applyKycLimits(userId: string): Promise<any> {
    const response = await api.post(`/admin/users/${userId}/limits/apply-kyc-limits`);
    return response.data;
  },
};

export const userService = {
  async getUserLimits(): Promise<any> {
    const response = await api.get('/pix/limits');
    return response.data;
  },
};

export const apiKeyService = {
  async getApiKeyStatus(): Promise<{ hasApiKey: boolean; createdAt?: string }> {
    const response = await api.get('/auth/apitoken');
    return response.data;
  },

  async generateApiKey(data: { name?: string; expirationDays?: number }): Promise<any> {
    const response = await api.post('/auth/apitoken', data);
    return response.data;
  },

  async revokeApiKey(): Promise<void> {
    await api.delete('/auth/apitoken');
  },
};

export const apiKeyRequestService = {
  async getMyRequests(): Promise<any[]> {
    const response = await api.get('/api-key-requests/my-requests');
    return response.data;
  },

  async getMyApiKeys(): Promise<any[]> {
    const response = await api.get('/api-key-requests/my-api-keys');
    return response.data;
  },

  async createRequest(data: {
    usageReason: string;
    serviceUrl: string;
    estimatedVolume: string;
    usageType: 'SINGLE_CPF' | 'MULTIPLE_CPF';
  }): Promise<any> {
    const response = await api.post('/api-key-requests', data);
    return response.data;
  },

  async getPendingRequests(): Promise<any[]> {
    const response = await api.get('/api-key-requests');
    return response.data;
  },

  async approveRequest(requestId: string, data?: { approvalNotes?: string }): Promise<any> {
    const response = await api.put(`/api-key-requests/${requestId}/approve`, data || {});
    return response.data;
  },

  async rejectRequest(requestId: string, data: { approvalNotes: string }): Promise<any> {
    const response = await api.put(`/api-key-requests/${requestId}/reject`, data);
    return response.data;
  },
};