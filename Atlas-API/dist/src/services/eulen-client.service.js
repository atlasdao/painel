"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var EulenClientService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EulenClientService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
const rate_limiter_service_1 = require("./rate-limiter.service");
const prisma_service_1 = require("../prisma/prisma.service");
let EulenClientService = EulenClientService_1 = class EulenClientService {
    configService;
    rateLimiter;
    prisma;
    logger = new common_1.Logger(EulenClientService_1.name);
    client;
    constructor(configService, rateLimiter, prisma) {
        this.configService = configService;
        this.rateLimiter = rateLimiter;
        this.prisma = prisma;
        const baseURL = this.configService.get('EULEN_API_URL', 'https://depix.eulen.app/api');
        this.client = axios_1.default.create({
            baseURL,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'X-Async': 'auto',
            },
        });
        this.client.interceptors.request.use(async (config) => {
            config.headers['X-Nonce'] = this.generateNonce();
            const authToken = await this.getEulenToken();
            if (authToken) {
                config.headers['Authorization'] = `Bearer ${authToken}`;
            }
            this.logger.log(`🚀 EULEN API REQUEST`);
            this.logger.log(`📍 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
            this.logger.log(`🔑 Headers: ${JSON.stringify(config.headers, null, 2)}`);
            if (config.data) {
                this.logger.log(`📦 Request Body: ${JSON.stringify(config.data, null, 2)}`);
            }
            return config;
        }, (error) => {
            this.logger.error('❌ Eulen API Request Error:', error);
            return Promise.reject(error);
        });
        this.client.interceptors.response.use((response) => {
            this.logger.log(`✅ EULEN API RESPONSE`);
            this.logger.log(`📍 ${response.config.method?.toUpperCase()} ${response.config.url}`);
            this.logger.log(`📊 Status: ${response.status} ${response.statusText}`);
            this.logger.log(`🔍 Response Headers: ${JSON.stringify(response.headers, null, 2)}`);
            this.logger.log(`📦 Response Body: ${JSON.stringify(response.data, null, 2)}`);
            return response;
        }, (error) => {
            this.logger.error(`❌ EULEN API ERROR`);
            this.logger.error(`📍 ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
            this.logger.error(`📊 Status: ${error.response?.status} ${error.response?.statusText}`);
            if (error.response?.data) {
                this.logger.error(`📦 Error Response: ${JSON.stringify(error.response.data, null, 2)}`);
            }
            this.logger.error(`🔍 Error Message: ${error.message}`);
            this.handleApiError(error);
            return Promise.reject(error);
        });
    }
    async getEulenToken() {
        try {
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
        }
        catch (error) {
            this.logger.error('❌ Error fetching Eulen token from database:', error);
            this.logger.error('Database connection may be down. Cannot proceed without token.');
            return null;
        }
    }
    generateNonce() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    handleApiError(error) {
        const status = error.response?.status || 500;
        const message = error.response?.data?.message || error.message;
        this.logger.error(`Eulen API Error: ${status} - ${message}`);
        if (status === 401) {
            throw new common_1.HttpException('Eulen API authentication failed', common_1.HttpStatus.UNAUTHORIZED);
        }
        else if (status === 403) {
            throw new common_1.HttpException('Eulen API access forbidden', common_1.HttpStatus.FORBIDDEN);
        }
        else if (status === 429) {
            throw new common_1.HttpException('Eulen API rate limit exceeded', common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        else if (status >= 500) {
            throw new common_1.HttpException('Eulen API service unavailable', common_1.HttpStatus.SERVICE_UNAVAILABLE);
        }
        else {
            throw new common_1.HttpException(message, status);
        }
    }
    async ping() {
        return this.rateLimiter.executeWithRateLimit('ping', async () => {
            try {
                const response = await this.client.get('/ping');
                return response.data;
            }
            catch (error) {
                throw error;
            }
        });
    }
    async createDeposit(data) {
        return this.rateLimiter.executeWithRateLimit('deposit', async () => {
            try {
                this.logger.log(`💰 CREATING EULEN DEPOSIT`);
                this.logger.log(`💵 Amount (cents): ${data.amount}`);
                this.logger.log(`🏦 DePix Address: ${data.pixKey}`);
                this.logger.log(`📝 Description: ${data.description || 'N/A'}`);
                const requestData = {
                    amountInCents: data.amount,
                };
                if (data.pixKey) {
                    requestData.depixAddress = data.pixKey;
                }
                if (data.userFullName) {
                    requestData.endUserFullName = data.userFullName;
                }
                if (data.userTaxNumber) {
                    requestData.endUserTaxNumber = data.userTaxNumber;
                }
                this.logger.log(`📤 Request Data: ${JSON.stringify(requestData, null, 2)}`);
                const response = await this.client.post('/deposit', requestData);
                this.logger.log(`✅ DEPOSIT CREATION SUCCESS`);
                this.logger.log(`📋 Transaction ID: ${response.data.response.id}`);
                this.logger.log(`📱 QR Code: ${response.data.response.qrCopyPaste ? 'Generated' : 'Missing'}`);
                this.logger.log(`🖼️ QR Image URL: ${response.data.response.qrImageUrl ? 'Generated' : 'Missing'}`);
                this.logger.log(`📦 Full Response: ${JSON.stringify(response.data, null, 2)}`);
                return response.data;
            }
            catch (error) {
                throw error;
            }
        });
    }
    async getDepositStatus(transactionId) {
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
            }
            catch (error) {
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
    async createWithdraw(data) {
        this.logger.warn('Withdraw endpoint not yet available in Eulen API');
        return {
            transactionId: `withdraw-${Date.now()}`,
            status: 'PENDING',
            amount: data.amount,
            pixKey: data.pixKey,
            message: 'Withdraw functionality coming soon',
        };
    }
    async getWithdrawStatus(transactionId) {
        this.logger.warn('Withdraw status endpoint not yet available');
        return {
            transactionId,
            status: 'PENDING',
            message: 'Withdraw status check coming soon',
        };
    }
    async getBalance() {
        this.logger.warn('Balance endpoint not yet available');
        return {
            balance: 0,
            available: 0,
            pending: 0,
            currency: 'BRL',
        };
    }
    async getTransactions(params) {
        this.logger.warn('Transaction list endpoint not yet available');
        return {
            transactions: [],
            total: 0,
        };
    }
    async generatePixQRCode(data) {
        try {
            if (!data.depixAddress) {
                throw new common_1.HttpException('Endereço DePix é obrigatório', common_1.HttpStatus.BAD_REQUEST);
            }
            const amountInCents = Math.round(data.amount * 100);
            if (amountInCents < 100) {
                throw new common_1.HttpException('Valor mínimo é R$ 1,00', common_1.HttpStatus.BAD_REQUEST);
            }
            const depositResponse = await this.createDeposit({
                amount: amountInCents,
                pixKey: data.depixAddress,
                description: data.description,
            });
            const qrCopyPaste = depositResponse.response?.qrCopyPaste;
            const qrImageUrl = depositResponse.response?.qrImageUrl;
            const transactionId = depositResponse.response?.id;
            this.logger.log(`Eulen deposit response: qrCopyPaste=${!!qrCopyPaste}, qrImageUrl=${!!qrImageUrl}, id=${transactionId}`);
            if (!qrCopyPaste || !transactionId) {
                this.logger.error(`Invalid Eulen API response: ${JSON.stringify(depositResponse)}`);
                if (process.env.NODE_ENV === 'development' || !qrCopyPaste) {
                    this.logger.warn('Using mock PIX QR code for development/fallback');
                    const mockPixCode = `00020126580014BR.GOV.BCB.PIX0136${data.depixAddress.substring(0, 32)}5204000053039865802BR5925Atlas DAO Dev Environment6009Sao Paulo62070503***63041234`;
                    const mockTransactionId = transactionId || `mock-${Date.now()}`;
                    return {
                        qrCode: mockPixCode,
                        qrCodeImage: qrImageUrl || '',
                        amount: data.amount,
                        transactionId: mockTransactionId,
                    };
                }
                throw new common_1.HttpException('Eulen API returned invalid response - missing QR code data', common_1.HttpStatus.SERVICE_UNAVAILABLE);
            }
            return {
                qrCode: qrCopyPaste,
                qrCodeImage: qrImageUrl,
                amount: data.amount,
                transactionId: transactionId,
            };
        }
        catch (error) {
            throw error;
        }
    }
    async validatePixKey(pixKey) {
        const isValidDePix = pixKey.startsWith('VJL') || pixKey.startsWith('ex1');
        return {
            valid: isValidDePix,
            type: isValidDePix ? 'DEPIX' : 'INVALID',
            network: 'liquid',
            address: pixKey,
        };
    }
};
exports.EulenClientService = EulenClientService;
exports.EulenClientService = EulenClientService = EulenClientService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        rate_limiter_service_1.RateLimiterService,
        prisma_service_1.PrismaService])
], EulenClientService);
//# sourceMappingURL=eulen-client.service.js.map