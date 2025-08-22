"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PixService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PixService = void 0;
const common_1 = require("@nestjs/common");
const eulen_client_service_1 = require("../services/eulen-client.service");
const limit_validation_service_1 = require("../services/limit-validation.service");
const liquid_validation_service_1 = require("../services/liquid-validation.service");
const transaction_repository_1 = require("../repositories/transaction.repository");
const audit_log_repository_1 = require("../repositories/audit-log.repository");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const QRCode = __importStar(require("qrcode"));
const uuid_1 = require("uuid");
let PixService = PixService_1 = class PixService {
    eulenClient;
    limitValidationService;
    liquidValidation;
    transactionRepository;
    auditLogRepository;
    prisma;
    logger = new common_1.Logger(PixService_1.name);
    constructor(eulenClient, limitValidationService, liquidValidation, transactionRepository, auditLogRepository, prisma) {
        this.eulenClient = eulenClient;
        this.limitValidationService = limitValidationService;
        this.liquidValidation = liquidValidation;
        this.transactionRepository = transactionRepository;
        this.auditLogRepository = auditLogRepository;
        this.prisma = prisma;
    }
    async createDeposit(userId, depositDto) {
        const transactionId = (0, uuid_1.v4)();
        try {
            await this.limitValidationService.validateAndThrow(userId, client_1.TransactionType.DEPOSIT, depositDto.amount);
            await this.auditLogRepository.createLog({
                userId,
                action: 'CREATE_DEPOSIT',
                resource: 'transaction',
                resourceId: transactionId,
                requestBody: depositDto,
            });
            const transaction = await this.transactionRepository.create({
                id: transactionId,
                user: { connect: { id: userId } },
                type: client_1.TransactionType.DEPOSIT,
                status: client_1.TransactionStatus.PENDING,
                amount: depositDto.amount,
                pixKey: depositDto.pixKey,
                pixKeyType: depositDto.pixKeyType,
                description: depositDto.description,
                externalId: depositDto.externalId,
            });
            const eulenResponse = await this.eulenClient.createDeposit({
                amount: depositDto.amount,
                pixKey: depositDto.pixKey,
                description: depositDto.description,
            });
            await this.transactionRepository.update(transaction.id, {
                externalId: eulenResponse.response?.id || transactionId,
                metadata: JSON.stringify(eulenResponse),
                status: client_1.TransactionStatus.PROCESSING,
            });
            if (depositDto.webhookUrl) {
            }
            this.logger.log(`Deposit created: ${transaction.id} for user ${userId}`);
            return this.mapTransactionToResponse(transaction);
        }
        catch (error) {
            await this.auditLogRepository.createLog({
                userId,
                action: 'CREATE_DEPOSIT_FAILED',
                resource: 'transaction',
                resourceId: transactionId,
                requestBody: depositDto,
                responseBody: { error: error.message },
                statusCode: 500,
            });
            this.logger.error(`Failed to create deposit for user ${userId}:`, error);
            throw error;
        }
    }
    async createWithdraw(userId, withdrawDto) {
        const transactionId = (0, uuid_1.v4)();
        try {
            await this.limitValidationService.validateAndThrow(userId, client_1.TransactionType.WITHDRAW, withdrawDto.amount);
            await this.auditLogRepository.createLog({
                userId,
                action: 'CREATE_WITHDRAW',
                resource: 'transaction',
                resourceId: transactionId,
                requestBody: withdrawDto,
            });
            const transaction = await this.transactionRepository.create({
                id: transactionId,
                user: { connect: { id: userId } },
                type: client_1.TransactionType.WITHDRAW,
                status: client_1.TransactionStatus.PENDING,
                amount: withdrawDto.amount,
                pixKey: withdrawDto.pixKey,
                pixKeyType: withdrawDto.pixKeyType,
                description: withdrawDto.description,
                externalId: withdrawDto.externalId,
            });
            const eulenResponse = await this.eulenClient.createWithdraw({
                amount: withdrawDto.amount,
                pixKey: withdrawDto.pixKey,
                description: withdrawDto.description,
            });
            await this.transactionRepository.update(transaction.id, {
                externalId: eulenResponse.response?.id || transactionId,
                metadata: JSON.stringify(eulenResponse),
                status: client_1.TransactionStatus.PROCESSING,
            });
            this.logger.log(`Withdraw created: ${transaction.id} for user ${userId}`);
            return this.mapTransactionToResponse(transaction);
        }
        catch (error) {
            await this.auditLogRepository.createLog({
                userId,
                action: 'CREATE_WITHDRAW_FAILED',
                resource: 'transaction',
                resourceId: transactionId,
                requestBody: withdrawDto,
                responseBody: { error: error.message },
                statusCode: 500,
            });
            this.logger.error(`Failed to create withdraw for user ${userId}:`, error);
            throw error;
        }
    }
    async createTransfer(userId, transferDto) {
        const transactionId = (0, uuid_1.v4)();
        try {
            await this.limitValidationService.validateAndThrow(userId, client_1.TransactionType.TRANSFER, transferDto.amount);
            await this.auditLogRepository.createLog({
                userId,
                action: 'CREATE_TRANSFER',
                resource: 'transaction',
                resourceId: transactionId,
                requestBody: transferDto,
            });
            const transaction = await this.transactionRepository.create({
                id: transactionId,
                user: { connect: { id: userId } },
                type: client_1.TransactionType.TRANSFER,
                status: client_1.TransactionStatus.PENDING,
                amount: transferDto.amount,
                pixKey: transferDto.destinationPixKey,
                pixKeyType: transferDto.pixKeyType,
                description: transferDto.description,
                externalId: transferDto.externalId,
                metadata: JSON.stringify({ sourcePixKey: transferDto.pixKey }),
            });
            this.logger.log(`Transfer created: ${transaction.id} for user ${userId}`);
            return this.mapTransactionToResponse(transaction);
        }
        catch (error) {
            await this.auditLogRepository.createLog({
                userId,
                action: 'CREATE_TRANSFER_FAILED',
                resource: 'transaction',
                resourceId: transactionId,
                requestBody: transferDto,
                responseBody: { error: error.message },
                statusCode: 500,
            });
            this.logger.error(`Failed to create transfer for user ${userId}:`, error);
            throw error;
        }
    }
    async getTransactionStatus(userId, transactionId) {
        try {
            const transaction = await this.transactionRepository.findById(transactionId);
            if (!transaction) {
                throw new common_1.HttpException('Transaction not found', common_1.HttpStatus.NOT_FOUND);
            }
            if (transaction.userId !== userId) {
                throw new common_1.HttpException('Unauthorized access to transaction', common_1.HttpStatus.FORBIDDEN);
            }
            if (transaction.status === client_1.TransactionStatus.PENDING ||
                transaction.status === client_1.TransactionStatus.PROCESSING) {
                if (transaction.externalId) {
                    const eulenStatus = await this.eulenClient.getDepositStatus(transaction.externalId);
                    if (eulenStatus.status) {
                        const newStatus = this.mapEulenStatus(eulenStatus.status);
                        if (newStatus !== transaction.status) {
                            await this.transactionRepository.updateStatus(transaction.id, newStatus, eulenStatus.errorMessage);
                            transaction.status = newStatus;
                            if (newStatus === client_1.TransactionStatus.COMPLETED) {
                                await this.limitValidationService.processSuccessfulTransaction(transaction.userId, transaction.type);
                            }
                        }
                    }
                }
            }
            return this.mapTransactionToResponse(transaction);
        }
        catch (error) {
            this.logger.error(`Failed to get transaction status ${transactionId}:`, error);
            throw error;
        }
    }
    async getUserTransactions(userId, filters) {
        const transactions = await this.transactionRepository.findByUserId(userId, filters);
        return transactions.map(t => this.mapTransactionToResponse(t));
    }
    async generatePixQRCode(userId, data) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { commerceMode: true },
            });
            if (user?.commerceMode && data.payerCpfCnpj) {
                const cpfCnpjClean = data.payerCpfCnpj.replace(/\D/g, '');
                if (cpfCnpjClean.length !== 11 && cpfCnpjClean.length !== 14) {
                    throw new common_1.HttpException('CPF/CNPJ inválido. Use 11 dígitos para CPF ou 14 para CNPJ.', common_1.HttpStatus.BAD_REQUEST);
                }
            }
            if (!this.liquidValidation.validateLiquidAddress(data.depixAddress)) {
                throw new common_1.HttpException('Endereço Liquid inválido. Por favor, verifique e tente novamente.', common_1.HttpStatus.BAD_REQUEST);
            }
            if (!this.liquidValidation.isMainnetAddress(data.depixAddress)) {
                throw new common_1.HttpException('Por favor, use um endereço da mainnet Liquid (deve começar com lq1, VJL, Q, G ou H)', common_1.HttpStatus.BAD_REQUEST);
            }
            const transaction = await this.transactionRepository.create({
                user: { connect: { id: userId } },
                type: client_1.TransactionType.DEPOSIT,
                status: client_1.TransactionStatus.PENDING,
                amount: data.amount,
                description: data.description || 'PIX QR Code Payment',
                pixKey: data.depixAddress,
                metadata: JSON.stringify({
                    isQrCodePayment: true,
                    depixAddress: data.depixAddress,
                    expirationMinutes: data.expirationMinutes || 18,
                    payerCpfCnpj: data.payerCpfCnpj,
                }),
            });
            this.logger.log(`Calling Eulen API to generate QR Code with data: ${JSON.stringify({
                amount: data.amount,
                depixAddress: data.depixAddress,
                description: data.description,
            })}`);
            const eulenResponse = await this.eulenClient.generatePixQRCode({
                amount: data.amount,
                depixAddress: data.depixAddress,
                description: data.description,
            });
            this.logger.log(`🔑 EULEN RESPONSE RECEIVED:`);
            this.logger.log(`  - transactionId (Eulen ID): ${eulenResponse.transactionId}`);
            this.logger.log(`  - qrCode: ${eulenResponse.qrCode ? 'Present' : 'Missing'}`);
            this.logger.log(`  - Full response: ${JSON.stringify(eulenResponse)}`);
            const qrCodeData = eulenResponse.qrCode || eulenResponse.payload || `PIX:${transaction.id}`;
            this.logger.log(`QR Code data extracted: ${qrCodeData}`);
            const qrCodeImage = await QRCode.toDataURL(qrCodeData, {
                width: 400,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF',
                },
            });
            await this.transactionRepository.update(transaction.id, {
                externalId: eulenResponse.transactionId,
                metadata: JSON.stringify({
                    ...JSON.parse(transaction.metadata || '{}'),
                    depixAddress: data.depixAddress,
                    qrCodeData,
                    eulenResponse,
                    eulenTransactionId: eulenResponse.transactionId,
                }),
            });
            this.logger.log(`PIX QR Code generated for transaction ${transaction.id} with Eulen ID: ${eulenResponse.transactionId}`);
            return {
                qrCode: qrCodeData,
                qrCodeImage,
                transactionId: transaction.id,
            };
        }
        catch (error) {
            this.logger.error(`Failed to generate PIX QR Code:`, error);
            throw error;
        }
    }
    async validatePixKey(pixKey) {
        try {
            const response = await this.eulenClient.validatePixKey(pixKey);
            return {
                valid: response.valid || true,
                keyType: response.keyType,
                ownerName: response.ownerName,
            };
        }
        catch (error) {
            this.logger.error(`Failed to validate PIX key ${pixKey}:`, error);
            return { valid: false };
        }
    }
    async getBalance(userId) {
        try {
            const eulenBalance = await this.eulenClient.getBalance();
            const stats = await this.transactionRepository.getTransactionStats(userId);
            return {
                available: eulenBalance.available || 0,
                pending: stats.pending || 0,
                total: stats.totalAmount || 0,
            };
        }
        catch (error) {
            this.logger.error(`Failed to get balance for user ${userId}:`, error);
            throw error;
        }
    }
    async checkDepositStatus(userId, transactionId) {
        try {
            this.logger.log(`🔍 Checking deposit status for transaction ${transactionId} by user ${userId}`);
            const transaction = await this.transactionRepository.findById(transactionId);
            if (!transaction) {
                throw new common_1.NotFoundException('Transaction not found');
            }
            this.logger.log(`🔍 DEBUGGING TRANSACTION DATA:`);
            this.logger.log(`  - Transaction ID: ${transaction.id}`);
            this.logger.log(`  - External ID: ${transaction.externalId}`);
            this.logger.log(`  - External ID length: ${transaction.externalId?.length || 'null'}`);
            this.logger.log(`  - External ID type: ${typeof transaction.externalId}`);
            this.logger.log(`  - Status: ${transaction.status}`);
            if (transaction.userId !== userId) {
                throw new common_1.ForbiddenException('Access denied to this transaction');
            }
            if (transaction.status === client_1.TransactionStatus.COMPLETED ||
                transaction.status === client_1.TransactionStatus.FAILED ||
                transaction.status === client_1.TransactionStatus.CANCELLED ||
                transaction.status === client_1.TransactionStatus.EXPIRED) {
                return {
                    transactionId: transaction.id,
                    status: transaction.status,
                    amount: transaction.amount,
                    processedAt: transaction.processedAt,
                    message: this.getStatusMessage(transaction.status),
                    shouldStopPolling: true,
                };
            }
            if (transaction.externalId &&
                (transaction.status === client_1.TransactionStatus.PENDING ||
                    transaction.status === client_1.TransactionStatus.PROCESSING)) {
                this.logger.log(`📡 CHECKING STATUS WITH EULEN API`);
                this.logger.log(`  - Our Transaction ID: ${transaction.id}`);
                this.logger.log(`  - Eulen ID (externalId): ${transaction.externalId}`);
                this.logger.log(`  - Calling: GET /deposit-status?id=${transaction.externalId}`);
                const eulenStatus = await this.eulenClient.getDepositStatus(transaction.externalId);
                this.logger.log(`📦 Eulen API Response: ${JSON.stringify(eulenStatus)}`);
                this.logger.log(`🎯 Eulen Status: ${eulenStatus.response?.status}`);
                this.logger.log(`💰 Eulen Amount: ${eulenStatus.response?.amount}`);
                this.logger.log(`🏦 Eulen DePix Address: ${eulenStatus.response?.depix_address}`);
                this.logger.log(`⏰ Eulen Created At: ${eulenStatus.response?.created_at}`);
                let newStatus = transaction.status;
                let shouldStopPolling = false;
                let payerInfo = null;
                if (eulenStatus.response?.status === 'depix_sent') {
                    newStatus = client_1.TransactionStatus.COMPLETED;
                    shouldStopPolling = true;
                    payerInfo = {
                        payerEUID: eulenStatus.response.payerEUID,
                        payerName: eulenStatus.response.payerName,
                        payerTaxNumber: eulenStatus.response.payerTaxNumber,
                        bankTxId: eulenStatus.response.bankTxId,
                        blockchainTxID: eulenStatus.response.blockchainTxID,
                    };
                    this.logger.log(`💰 PAYMENT COMPLETED!`);
                    this.logger.log(`👤 Payer Name: ${payerInfo.payerName}`);
                    this.logger.log(`📋 Payer Tax Number: ${payerInfo.payerTaxNumber}`);
                    this.logger.log(`🏦 Bank Transaction ID: ${payerInfo.bankTxId}`);
                    this.logger.log(`⛓️ Blockchain Transaction ID: ${payerInfo.blockchainTxID}`);
                }
                else if (eulenStatus.response?.status === 'canceled' || eulenStatus.response?.status === 'error') {
                    newStatus = client_1.TransactionStatus.FAILED;
                    shouldStopPolling = true;
                }
                else if (eulenStatus.response?.status === 'expired') {
                    newStatus = client_1.TransactionStatus.EXPIRED;
                    shouldStopPolling = true;
                }
                else if (eulenStatus.response?.status === 'under_review') {
                    newStatus = client_1.TransactionStatus.PROCESSING;
                    this.logger.log(`🔍 Payment under review`);
                }
                else if (eulenStatus.response?.status === 'refunded') {
                    newStatus = client_1.TransactionStatus.FAILED;
                    shouldStopPolling = true;
                }
                if (newStatus !== transaction.status) {
                    if (payerInfo) {
                        const currentMetadata = transaction.metadata ? JSON.parse(transaction.metadata) : {};
                        await this.transactionRepository.update(transaction.id, {
                            status: newStatus,
                            processedAt: new Date(),
                            metadata: JSON.stringify({
                                ...currentMetadata,
                                payerInfo,
                                eulenResponse: eulenStatus.response,
                                completedAt: new Date().toISOString(),
                            }),
                        });
                    }
                    else {
                        await this.transactionRepository.updateStatus(transaction.id, newStatus, newStatus === client_1.TransactionStatus.FAILED ? 'Payment failed or was canceled' : undefined);
                    }
                    if (newStatus === client_1.TransactionStatus.COMPLETED) {
                        await this.limitValidationService.processSuccessfulTransaction(transaction.userId, transaction.type);
                        try {
                            const metadata = transaction.metadata ? JSON.parse(transaction.metadata) : {};
                            if (metadata.isValidation && payerInfo) {
                                this.logger.log(`✅ VALIDATION PAYMENT COMPLETED!`);
                                this.logger.log(`👤 User validated: ${payerInfo?.payerName} (${payerInfo?.payerTaxNumber})`);
                                this.logger.log(`💳 Transaction ${transaction.id} completed - triggering account validation`);
                            }
                        }
                        catch (error) {
                            this.logger.warn(`Error processing validation for transaction ${transaction.id}:`, error);
                        }
                    }
                    this.logger.log(`Transaction ${transactionId} status updated from ${transaction.status} to ${newStatus}`);
                }
                return {
                    transactionId: transaction.id,
                    externalId: transaction.externalId,
                    status: newStatus,
                    amount: transaction.amount,
                    eulenStatus: eulenStatus.response,
                    eulenFullResponse: eulenStatus,
                    message: this.getStatusMessage(newStatus),
                    shouldStopPolling,
                    debugInfo: {
                        eulenResponseReceived: true,
                        eulenStatusValue: eulenStatus.response?.status,
                        originalStatus: transaction.status,
                        newStatus: newStatus,
                        timestamp: new Date().toISOString(),
                    },
                };
            }
            this.logger.warn(`⚠️ Transaction ${transaction.id} has no externalId (Eulen ID) - cannot check status with Eulen`);
            return {
                transactionId: transaction.id,
                status: transaction.status,
                amount: transaction.amount,
                message: 'Waiting for payment confirmation (no Eulen ID)',
                shouldStopPolling: false,
                warning: 'No Eulen ID available for status check',
            };
        }
        catch (error) {
            this.logger.error(`Failed to check deposit status for transaction ${transactionId}:`, error);
            if (error.response?.status >= 500 || error.response?.status === 520 || error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
                this.logger.warn(`External API unavailable, returning last known status for transaction ${transactionId}`);
                try {
                    const transaction = await this.transactionRepository.findById(transactionId);
                    if (transaction) {
                        return {
                            transactionId: transaction.id,
                            status: transaction.status,
                            amount: transaction.amount,
                            processedAt: transaction.processedAt,
                            message: this.getStatusMessage(transaction.status),
                            shouldStopPolling: false,
                            warning: 'External payment service temporarily unavailable. Status check will retry automatically.',
                            error: 'SERVICE_UNAVAILABLE'
                        };
                    }
                }
                catch (dbError) {
                    this.logger.error('Database error while fetching fallback status:', dbError);
                }
            }
            throw error;
        }
    }
    async pingEulenAPI() {
        try {
            const eulenResponse = await this.eulenClient.ping();
            return {
                status: 'healthy',
                timestamp: new Date(),
                eulenStatus: eulenResponse,
            };
        }
        catch (error) {
            this.logger.error('Eulen API ping failed:', error);
            throw new common_1.HttpException('Eulen API is not available', common_1.HttpStatus.SERVICE_UNAVAILABLE);
        }
    }
    async getUserLimits(userId) {
        try {
            return await this.limitValidationService.getUserLimitsSummary(userId);
        }
        catch (error) {
            this.logger.error(`Failed to get user limits for ${userId}:`, error);
            throw error;
        }
    }
    getStatusMessage(status) {
        switch (status) {
            case client_1.TransactionStatus.COMPLETED:
                return 'Pagamento confirmado e DePix enviado com sucesso';
            case client_1.TransactionStatus.PENDING:
                return 'Aguardando pagamento';
            case client_1.TransactionStatus.PROCESSING:
                return 'Pagamento recebido, processando conversão para DePix';
            case client_1.TransactionStatus.FAILED:
                return 'Pagamento falhou ou foi cancelado';
            case client_1.TransactionStatus.CANCELLED:
                return 'Transação cancelada';
            case client_1.TransactionStatus.EXPIRED:
                return 'QR Code expirado';
            default:
                return 'Status desconhecido';
        }
    }
    mapTransactionToResponse(transaction) {
        return {
            id: transaction.id,
            type: transaction.type,
            status: transaction.status,
            amount: transaction.amount,
            pixKey: transaction.pixKey,
            pixKeyType: transaction.pixKeyType,
            externalId: transaction.externalId,
            description: transaction.description,
            metadata: transaction.metadata,
            errorMessage: transaction.errorMessage,
            currency: transaction.currency,
            createdAt: transaction.createdAt,
            updatedAt: transaction.updatedAt,
            processedAt: transaction.processedAt,
        };
    }
    mapEulenStatus(eulenStatus) {
        const statusMap = {
            'pending': client_1.TransactionStatus.PENDING,
            'processing': client_1.TransactionStatus.PROCESSING,
            'completed': client_1.TransactionStatus.COMPLETED,
            'success': client_1.TransactionStatus.COMPLETED,
            'failed': client_1.TransactionStatus.FAILED,
            'cancelled': client_1.TransactionStatus.CANCELLED,
            'expired': client_1.TransactionStatus.EXPIRED,
        };
        return statusMap[eulenStatus.toLowerCase()] || client_1.TransactionStatus.PENDING;
    }
};
exports.PixService = PixService;
exports.PixService = PixService = PixService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [eulen_client_service_1.EulenClientService,
        limit_validation_service_1.LimitValidationService,
        liquid_validation_service_1.LiquidValidationService,
        transaction_repository_1.TransactionRepository,
        audit_log_repository_1.AuditLogRepository,
        prisma_service_1.PrismaService])
], PixService);
//# sourceMappingURL=pix.service.js.map