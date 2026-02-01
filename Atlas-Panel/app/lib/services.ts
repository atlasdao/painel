import api from './api';
import { Transaction, DashboardStats, Balance, PixQRCode } from '@/app/types';

export const userService = {
  async getUserProfile(): Promise<any> {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  async getUserLimits(): Promise<any> {
    const response = await api.get('/account-validation/limits');
    return response.data;
  },
};

export const accountValidationService = {
  async getValidationStatus(): Promise<any> {
    const response = await api.get('/account-validation/status');
    return response.data;
  },

  async createValidationPayment(depixAddress?: string): Promise<any> {
    const payload: any = {};
    if (depixAddress) {
      payload.depixAddress = depixAddress;
    }
    // Note: EUID/tax number will be automatically extracted from the webhook
    // when the user completes the PIX payment
    const response = await api.post('/account-validation/create-payment', payload);
    return response.data;
  },

  async getValidationRequirements(): Promise<any> {
    const response = await api.get('/account-validation/requirements');
    return response.data;
  },

  // Robust method to get current validation amount from admin settings
  async getCurrentValidationAmount(): Promise<number> {
    try {
      // First try to get from the public requirements endpoint
      const requirements = await this.getValidationRequirements();
      if (requirements?.amount) {
        return requirements.amount;
      }
    } catch (error) {
      console.warn('Failed to get validation requirements, trying admin settings:', error);
    }

    try {
      // Fallback to admin settings endpoint (requires authentication)
      const response = await api.get('/account-validation/settings');
      return response.data?.validationAmount || 2.0;
    } catch (error) {
      console.error('Failed to get validation amount from admin settings:', error);
      // Final fallback
      return 2.0;
    }
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

  async getTransactions(params?: {
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
    type?: string;
    status?: string;
  }): Promise<Transaction[]> {
    // Convert limit/offset to take/skip for API compatibility and add all filters
    const apiParams = params ? {
      take: params.limit,
      skip: params.offset,
      startDate: params.startDate?.toISOString(),
      endDate: params.endDate?.toISOString(),
      type: params.type,
      status: params.status
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
  async getDashboardStats(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<DashboardStats> {
    const response = await api.get<DashboardStats>('/admin/dashboard', { params });
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

  // Risk Management
  async getRiskReviewQueue(limit?: number): Promise<any> {
    const response = await api.get('/risk/admin/review-queue', { params: { limit } });
    return response.data;
  },

  async getRiskStats(): Promise<any> {
    const response = await api.get('/risk/admin/stats');
    return response.data;
  },

  async getUserRiskProfile(userId: string): Promise<any> {
    const response = await api.get(`/risk/admin/user/${userId}`);
    return response.data;
  },

  async reviewUser(userId: string, data: { notes: string; newStatus?: string }): Promise<any> {
    const response = await api.put(`/risk/admin/review/${userId}`, data);
    return response.data;
  },

  async blockEntity(data: {
    type: string;
    value: string;
    reason: string;
    reasonDetails?: string;
    expiresAt?: string;
  }): Promise<any> {
    const response = await api.post('/risk/admin/block', data);
    return response.data;
  },

  async unblockEntity(type: string, value: string): Promise<any> {
    const response = await api.put(`/risk/admin/unblock/${type}/${value}`);
    return response.data;
  },

  async getBlockedEntities(type?: string, limit?: number, offset?: number): Promise<any> {
    const response = await api.get('/risk/admin/blocked', { params: { type, limit, offset } });
    return response.data;
  },

  async validateEuid(euid: string, userId: string): Promise<any> {
    const response = await api.get(`/risk/admin/validate-euid/${euid}/${userId}`);
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

export const profileService = {
  async getProfile(): Promise<any> {
    // Use the profile endpoint which has fresh data after avatar uploads
    const response = await api.get('/profile');
    return response.data;
  },

  async updateProfile(data: { username?: string; email?: string }): Promise<any> {
    const response = await api.patch('/profile', data);
    return response.data;
  },

  async uploadAvatar(file: File): Promise<any> {
    // Convert file to base64
    return new Promise((resolve, reject) => {
      console.log(`[SERVICE] Converting file to base64: ${file.name}, ${file.size} bytes`);

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const base64String = reader.result as string;
          const base64Data = base64String.split(',')[1]; // Remove data:image/png;base64, prefix
          const mimeType = file.type;

          console.log(`[SERVICE] Base64 conversion complete. Data length: ${base64Data.length}, MIME: ${mimeType}`);

          // Validate base64 data before sending
          if (!base64Data || base64Data.length === 0) {
            throw new Error('Falha ao converter imagem para upload');
          }

          console.log(`[SERVICE] About to send POST request to /profile/avatar`);
          console.log(`[SERVICE] Request payload:`, {
            avatarData: `${base64String.substring(0, 50)}...`,
            mimeType: mimeType,
            dataLength: base64String.length
          });

          const response = await api.post('/profile/avatar', {
            avatarData: base64String, // Send the full data URL (data:image/png;base64,...)
            mimeType: mimeType,
          }, {
            timeout: 60000, // 60 second timeout for large uploads
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                console.log(`[SERVICE] Upload progress: ${percentCompleted}%`);
              }
            }
          });

          console.log(`[SERVICE] Upload successful! Response status:`, response.status);
          console.log(`[SERVICE] Response data:`, response.data);
          console.log(`[SERVICE] Profile picture in response:`, response.data?.profilePicture ? `${response.data.profilePicture.length} chars` : 'null');

          resolve(response.data);
        } catch (error) {
          console.error(`[SERVICE] Upload error:`, error);
          const typedError = error as any;
          console.error(`[SERVICE] Error details:`, {
            message: typedError.message,
            response: typedError.response?.data,
            status: typedError.response?.status,
            statusText: typedError.response?.statusText
          });
          reject(error);
        }
      };
      reader.onerror = (error) => {
        console.error(`[SERVICE] FileReader error:`, error);
        reject(new Error('Falha ao ler arquivo de imagem'));
      };
    });
  },

  async removeAvatar(): Promise<void> {
    await api.delete('/profile/avatar');
  },

  async setup2FA(): Promise<any> {
    const response = await api.post('/profile/2fa/setup');
    return response.data;
  },

  async verify2FA(token: string): Promise<any> {
    const response = await api.post('/profile/2fa/verify', { token });
    return response.data;
  },

  async disable2FA(token: string): Promise<void> {
    await api.post('/profile/2fa/disable', { token });
  },

  async get2FAStatus(): Promise<{
    twoFactorEnabled: boolean;
    periodicCheckEnabled: boolean;
    lastVerified: string | null;
    remainingBackupCodes: number;
    requiresPeriodicVerification: boolean;
    isLocked: boolean;
    lockedUntil: string | null;
  }> {
    const response = await api.get('/profile/2fa/status');
    return response.data;
  },

  async verifyBackupCode(backupCode: string): Promise<{ success: boolean; remainingCodes: number }> {
    const response = await api.post('/profile/2fa/backup-code/verify', { backupCode });
    return response.data;
  },

  async regenerateBackupCodes(token: string): Promise<{ success: boolean; backupCodes: string[] }> {
    const response = await api.post('/profile/2fa/backup-codes/regenerate', { token });
    return response.data;
  },

  async togglePeriodicCheck(enabled: boolean): Promise<{ success: boolean; periodicCheckEnabled: boolean }> {
    const response = await api.post('/profile/2fa/periodic-check/toggle', { enabled });
    return response.data;
  },

  async updateDefaultWallet(data: { address: string; type: string }): Promise<any> {
    const response = await api.patch('/profile/wallet', data);
    return response.data;
  },

  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<any> {
    const response = await api.post('/profile/change-password', data);
    return response.data;
  },

  async toggleCommerceMode(): Promise<any> {
    const response = await api.post('/profile/commerce-mode/toggle');
    return response.data;
  },
};

// Tipos para colaboradores
export interface CollaboratorInvite {
  id: string;
  invitedEmail: string;
  invitedName: string;
  role: 'AUXILIAR' | 'GESTOR';
  status: 'PENDING' | 'ACTIVE' | 'REVOKED';
  createdAt: string;
  acceptedAt?: string;
  revokedAt?: string;
  inviteExpires: string;
  inviteLink?: string; // Link de convite para copiar (apenas para PENDING)
  collaborator?: {
    id: string;
    username: string;
    email: string;
    profilePicture?: string;
  };
}

export interface CollaboratorAccount {
  collaboratorId: string;
  accountId: string;
  username: string;
  email: string;
  profilePicture?: string;
  role: 'AUXILIAR' | 'GESTOR';
  permissions: string[];
}

export interface CollaboratorContext {
  type: 'OWNER' | 'COLLABORATOR';
  accountId: string;
  accountName: string;
  collaboratorId?: string;
  role: 'OWNER' | 'AUXILIAR' | 'GESTOR';
  permissions: string[];
}

export const collaboratorService = {
  // ========== GERENCIAMENTO (DONO) ==========

  async inviteCollaborator(data: {
    name: string;
    email: string;
    role: 'AUXILIAR' | 'GESTOR';
  }): Promise<CollaboratorInvite> {
    const response = await api.post('/collaborator/invite', data);
    return response.data;
  },

  async listCollaborators(): Promise<CollaboratorInvite[]> {
    const response = await api.get('/collaborator/list');
    return response.data;
  },

  async updateCollaboratorRole(
    collaboratorId: string,
    role: 'AUXILIAR' | 'GESTOR'
  ): Promise<{ id: string; role: string; message: string }> {
    const response = await api.patch(`/collaborator/${collaboratorId}/role`, { role });
    return response.data;
  },

  async revokeCollaborator(collaboratorId: string): Promise<{ message: string }> {
    const response = await api.delete(`/collaborator/${collaboratorId}`);
    return response.data;
  },

  async resendInvite(collaboratorId: string): Promise<{ message: string }> {
    const response = await api.post(`/collaborator/${collaboratorId}/resend`);
    return response.data;
  },

  // ========== CONVITE ==========

  async validateInviteToken(token: string): Promise<{
    invitedEmail: string;
    invitedName: string;
    role: 'AUXILIAR' | 'GESTOR';
    accountOwner: {
      username: string;
      profilePicture?: string;
    };
    hasExistingAccount: boolean;
    roleDescription: {
      title: string;
      description: string;
      permissions: string[];
    };
  }> {
    const response = await api.get(`/collaborator/invite/${token}`);
    return response.data;
  },

  async acceptInvite(token: string): Promise<{
    message: string;
    accountOwner: string;
    role: string;
  }> {
    const response = await api.post('/collaborator/invite/accept', { token });
    return response.data;
  },

  async acceptInviteWithRegistration(data: {
    token: string;
    username: string;
    password: string;
  }): Promise<{
    message: string;
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      email: string;
      username: string;
      roles: string[];
    };
    accountOwner: string;
    role: string;
  }> {
    const response = await api.post('/collaborator/invite/register', data);
    return response.data;
  },

  // ========== CONTEXTO ==========

  async getMyAccounts(): Promise<{
    ownAccount: {
      id: string;
      username: string;
      email: string;
      profilePicture?: string;
      role: 'OWNER';
    };
    collaborations: CollaboratorAccount[];
  }> {
    const response = await api.get('/collaborator/my-accounts');
    return response.data;
  },

  async switchToAccount(collaboratorId: string): Promise<{
    context: CollaboratorContext;
    message: string;
  }> {
    const response = await api.post(`/collaborator/switch/${collaboratorId}`);
    return response.data;
  },

  async switchToOwnAccount(): Promise<{
    context: CollaboratorContext;
  }> {
    const response = await api.post('/collaborator/switch/own');
    return response.data;
  },
};