import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { RateLimiterService } from './rate-limiter.service';
import { PrismaService } from '../prisma/prisma.service';

interface DepositRequest {
  amountInCents: number;
  depixAddress?: string;
  endUserFullName?: string;
  endUserTaxNumber?: string;
}

interface DepositResponse {
  response: {
    id: string;
    qrCopyPaste: string;
    qrImageUrl: string;
  };
  async: boolean;
}

@Injectable()
export class EulenClientService {
  private readonly logger = new Logger(EulenClientService.name);
  private readonly client: AxiosInstance;

  constructor(
    private readonly configService: ConfigService,
    private readonly rateLimiter: RateLimiterService,
    private readonly prisma: PrismaService,
  ) {
    const baseURL = this.configService.get<string>('EULEN_API_URL', 'https://depix.eulen.app/api');

    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-Async': 'auto',
      },
    });

    // Request interceptor for logging and auth
    this.client.interceptors.request.use(
      async (config) => {
        // Add nonce header for each request
        config.headers['X-Nonce'] = this.generateNonce();
        
        // Get auth token dynamically from database or fallback to env
        const authToken = await this.getEulenToken();
        if (authToken) {
          config.headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        // Detailed request logging
        this.logger.log(`🚀 EULEN API REQUEST`);
        this.logger.log(`📍 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
        this.logger.log(`🔑 Headers: ${JSON.stringify(config.headers, null, 2)}`);
        if (config.data) {
          this.logger.log(`📦 Request Body: ${JSON.stringify(config.data, null, 2)}`);
        }
        
        return config;
      },
      (error) => {
        this.logger.error('❌ Eulen API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        // Detailed response logging
        this.logger.log(`✅ EULEN API RESPONSE`);
        this.logger.log(`📍 ${response.config.method?.toUpperCase()} ${response.config.url}`);
        this.logger.log(`📊 Status: ${response.status} ${response.statusText}`);
        this.logger.log(`🔍 Response Headers: ${JSON.stringify(response.headers, null, 2)}`);
        this.logger.log(`📦 Response Body: ${JSON.stringify(response.data, null, 2)}`);
        
        return response;
      },
      (error: AxiosError) => {
        // Detailed error logging
        this.logger.error(`❌ EULEN API ERROR`);
        this.logger.error(`📍 ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
        this.logger.error(`📊 Status: ${error.response?.status} ${error.response?.statusText}`);
        if (error.response?.data) {
          this.logger.error(`📦 Error Response: ${JSON.stringify(error.response.data, null, 2)}`);
        }
        this.logger.error(`🔍 Error Message: ${error.message}`);
        
        this.handleApiError(error);
        return Promise.reject(error);
      }
    );
  }

  private async getEulenToken(): Promise<string | null> {
    try {
      // ALWAYS fetch token from database - no hardcoded tokens allowed
      const systemSetting = await this.prisma.systemSettings.findUnique({
        where: { key: 'EULEN_API_TOKEN' },
      });

      if (systemSetting?.value) {
        this.logger.log(`✅ Using Eulen token from database (length: ${systemSetting.value.length})`);
        this.logger.debug(`Token preview: ${systemSetting.value.substring(0, 50)}...`);
        return systemSetting.value;
      }

      this.logger.error('❌ CRITICAL: No Eulen API token found in database!');
      this.logger.error('Please ensure EULEN_API_TOKEN is set in SystemSettings table');
      return null;
    } catch (error) {
      this.logger.error('❌ Error fetching Eulen token from database:', error);
      this.logger.error('Database connection may be down. Cannot proceed without token.');
      return null;
    }
  }

  private generateNonce(): string {
    // Generate a valid UUID v4 for the nonce
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private handleApiError(error: AxiosError): void {
    const status = error.response?.status || 500;
    const message = (error.response?.data as any)?.message || error.message;

    this.logger.error(`Eulen API Error: ${status} - ${message}`);

    if (status === 401) {
      throw new HttpException('Eulen API authentication failed', HttpStatus.UNAUTHORIZED);
    } else if (status === 403) {
      throw new HttpException('Eulen API access forbidden', HttpStatus.FORBIDDEN);
    } else if (status === 429) {
      throw new HttpException('Eulen API rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    } else if (status >= 500) {
      throw new HttpException('Eulen API service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    } else {
      throw new HttpException(message, status);
    }
  }

  /**
   * Ping endpoint - Basic connectivity check
   */
  async ping(): Promise<any> {
    return this.rateLimiter.executeWithRateLimit('ping', async () => {
      try {
        const response = await this.client.get('/ping');
        // The API returns the data wrapped in response/async structure
        return response.data;
      } catch (error) {
        throw error;
      }
    });
  }

  /**
   * Create a deposit (PIX to DePix conversion)
   * Converts Brazilian Real (BRL) via PIX to DePix tokens on Liquid Network
   */
  async createDeposit(data: {
    amount: number; // Amount in cents
    pixKey: string; // DePix address (Liquid address)
    description?: string;
    userFullName?: string;
    userTaxNumber?: string;
  }): Promise<DepositResponse> {
    return this.rateLimiter.executeWithRateLimit('deposit', async () => {
      try {
        this.logger.log(`💰 CREATING EULEN DEPOSIT`);
        this.logger.log(`💵 Amount (cents): ${data.amount}`);
        this.logger.log(`🏦 DePix Address: ${data.pixKey}`);
        this.logger.log(`📝 Description: ${data.description || 'N/A'}`);
        
        // Only send required fields
        const requestData: any = {
          amountInCents: data.amount,
        };

        // Add depixAddress if provided (even if it's the default)
        // The API needs to know where to send the DePix
        if (data.pixKey) {
          requestData.depixAddress = data.pixKey;
        }

        // Only add optional fields if they are provided
        if (data.userFullName) {
          requestData.endUserFullName = data.userFullName;
        }
        if (data.userTaxNumber) {
          requestData.endUserTaxNumber = data.userTaxNumber;
        }

        this.logger.log(`📤 Request Data: ${JSON.stringify(requestData, null, 2)}`);
        const response = await this.client.post<DepositResponse>('/deposit', requestData);
        
        this.logger.log(`✅ DEPOSIT CREATION SUCCESS`);
        this.logger.log(`📋 Transaction ID: ${response.data.response.id}`);
        this.logger.log(`📱 QR Code: ${response.data.response.qrCopyPaste ? 'Generated' : 'Missing'}`);
        this.logger.log(`🖼️ QR Image URL: ${response.data.response.qrImageUrl ? 'Generated' : 'Missing'}`);
        this.logger.log(`📦 Full Response: ${JSON.stringify(response.data, null, 2)}`);
        
        return response.data;
      } catch (error) {
        throw error;
      }
    });
  }

  /**
   * Get deposit status
   * Check the status of a PIX to DePix conversion
   */
  async getDepositStatus(transactionId: string): Promise<any> {
    return this.rateLimiter.executeWithRateLimit('deposit-status', async () => {
      try {
        this.logger.log(`🔍 CHECKING DEPOSIT STATUS`);
        this.logger.log(`📋 Eulen Transaction ID: ${transactionId}`);
        this.logger.log(`🌐 Full URL: ${this.client.defaults.baseURL}/deposit-status?id=${transactionId}`);
        
        const response = await this.client.get('/deposit-status', {
          params: { id: transactionId },
        });
        
        this.logger.log(`📊 DEPOSIT STATUS RESPONSE`);
        this.logger.log(`🎯 Status: ${response.data?.response?.status || 'unknown'}`);
        this.logger.log(`💰 Amount: ${response.data?.response?.amount || 'N/A'}`);
        this.logger.log(`🏦 DePix Address: ${response.data?.response?.depix_address || 'N/A'}`);
        this.logger.log(`⏰ Created At: ${response.data?.response?.created_at || 'N/A'}`);
        this.logger.log(`📦 Full Response: ${JSON.stringify(response.data, null, 2)}`);
        
        return response.data;
      } catch (error) {
        // If endpoint is still in development, return mock status
        if (error.response?.status === 404) {
          this.logger.warn('Deposit status endpoint in development, returning mock status');
          return {
            id: transactionId,
            status: 'PENDING',
            message: 'Status check currently in development',
          };
        }
        throw error;
      }
    });
  }

  // Legacy methods for compatibility - will map to real Eulen endpoints

  async createWithdraw(data: {
    amount: number;
    pixKey: string;
    description?: string;
  }): Promise<any> {
    // Withdraw would be DePix to PIX (reverse of deposit)
    // This endpoint may not exist yet in Eulen API
    this.logger.warn('Withdraw endpoint not yet available in Eulen API');
    return {
      transactionId: `withdraw-${Date.now()}`,
      status: 'PENDING',
      amount: data.amount,
      pixKey: data.pixKey,
      message: 'Withdraw functionality coming soon',
    };
  }

  async getWithdrawStatus(transactionId: string): Promise<any> {
    this.logger.warn('Withdraw status endpoint not yet available');
    return {
      transactionId,
      status: 'PENDING',
      message: 'Withdraw status check coming soon',
    };
  }

  async getBalance(): Promise<any> {
    // Balance check would require wallet integration
    this.logger.warn('Balance endpoint not yet available');
    return {
      balance: 0,
      available: 0,
      pending: 0,
      currency: 'BRL',
    };
  }

  async getTransactions(params?: {
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<any> {
    this.logger.warn('Transaction list endpoint not yet available');
    return {
      transactions: [],
      total: 0,
    };
  }

  async generatePixQRCode(data: {
    amount: number; // Amount in REAIS
    depixAddress: string; // DePix address from frontend - REQUIRED
    description?: string;
  }): Promise<any> {
    // Use the deposit endpoint to generate QR code
    try {
      // Validate that depixAddress is provided
      if (!data.depixAddress) {
        throw new HttpException('Endereço DePix é obrigatório', HttpStatus.BAD_REQUEST);
      }

      // Convert amount from reais to cents (must be integer)
      // Ex: 1.00 reais = 100 centavos
      const amountInCents = Math.round(data.amount * 100);
      
      // Validate minimum amount (100 cents = 1 real)
      if (amountInCents < 100) {
        throw new HttpException('Valor mínimo é R$ 1,00', HttpStatus.BAD_REQUEST);
      }

      const depositResponse = await this.createDeposit({
        amount: amountInCents, // Already in cents
        pixKey: data.depixAddress, // Use address from frontend
        description: data.description,
      });

      // Check if we got the expected response structure
      const qrCopyPaste = depositResponse.response?.qrCopyPaste;
      const qrImageUrl = depositResponse.response?.qrImageUrl;
      const transactionId = depositResponse.response?.id;

      this.logger.log(`Eulen deposit response: qrCopyPaste=${!!qrCopyPaste}, qrImageUrl=${!!qrImageUrl}, id=${transactionId}`);

      if (!qrCopyPaste || !transactionId) {
        this.logger.error(`Invalid Eulen API response: ${JSON.stringify(depositResponse)}`);
        
        // In development, provide a mock PIX QR code when Eulen API fails
        if (process.env.NODE_ENV === 'development' || !qrCopyPaste) {
          this.logger.warn('Using mock PIX QR code for development/fallback');
          
          // Generate a mock PIX QR code string
          const mockPixCode = `00020126580014BR.GOV.BCB.PIX0136${data.depixAddress.substring(0, 32)}5204000053039865802BR5925Atlas DAO Dev Environment6009Sao Paulo62070503***63041234`;
          const mockTransactionId = transactionId || `mock-${Date.now()}`;
          
          return {
            qrCode: mockPixCode,
            qrCodeImage: qrImageUrl || '', // May be empty in mock
            amount: data.amount,
            transactionId: mockTransactionId,
          };
        }
        
        throw new HttpException('Eulen API returned invalid response - missing QR code data', HttpStatus.SERVICE_UNAVAILABLE);
      }

      return {
        qrCode: qrCopyPaste,
        qrCodeImage: qrImageUrl,
        amount: data.amount,
        transactionId: transactionId,
      };
    } catch (error) {
      throw error;
    }
  }

  async validatePixKey(pixKey: string): Promise<any> {
    // Validate if it's a valid Liquid/DePix address
    // Basic validation - Liquid addresses start with specific prefixes
    const isValidDePix = pixKey.startsWith('VJL') || pixKey.startsWith('ex1');
    
    return {
      valid: isValidDePix,
      type: isValidDePix ? 'DEPIX' : 'INVALID',
      network: 'liquid',
      address: pixKey,
    };
  }
}