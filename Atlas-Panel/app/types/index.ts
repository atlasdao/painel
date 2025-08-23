export interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  role?: 'USER' | 'ADMIN'; // Mantendo para compatibilidade
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  commerceMode?: boolean;
  paymentLinksEnabled?: boolean;
  commerceModeActivatedAt?: string | null;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface Transaction {
  id: string;
  userId: string;
  user?: {
    id: string;
    username: string;
    email: string;
  };
  type: 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER';
  amount: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'EXPIRED';
  currency?: string;
  pixKey?: string;
  pixKeyType?: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM_KEY';
  externalId?: string;
  description?: string;
  metadata?: string; // JSON string
  errorMessage?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalTransactions: number;
  totalVolume: number;
  pendingTransactions: number;
  completedTransactions: number;
  failedTransactions: number;
  activeUsers?: number;
  todayTransactions?: number;
  todayVolume?: number;
  successRate?: number;
  newUsersToday?: number;
  retentionRate?: number;
}

export interface Balance {
  available: number;
  pending: number;
  total: number;
}

export interface PixQRCode {
  qrCode: string;
  pixKey: string;
  amount: number;
  expiresAt: string;
}
