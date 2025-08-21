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
var PaymentLinkService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentLinkService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const pix_service_1 = require("../pix/pix.service");
const schedule_1 = require("@nestjs/schedule");
const nanoid_1 = require("nanoid");
let PaymentLinkService = PaymentLinkService_1 = class PaymentLinkService {
    prisma;
    pixService;
    logger = new common_1.Logger(PaymentLinkService_1.name);
    constructor(prisma, pixService) {
        this.prisma = prisma;
        this.pixService = pixService;
    }
    async create(userId, dto) {
        const shortCode = (0, nanoid_1.nanoid)(8);
        const paymentLink = await this.prisma.paymentLink.create({
            data: {
                userId,
                shortCode,
                amount: dto.amount,
                walletAddress: dto.walletAddress,
                description: dto.description,
                expiresAt: dto.expiresAt,
            },
        });
        return this.formatResponse(paymentLink);
    }
    async findByUserId(userId) {
        const links = await this.prisma.paymentLink.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        return links.map(link => this.formatResponse(link));
    }
    async findByShortCode(shortCode) {
        const link = await this.prisma.paymentLink.findUnique({
            where: { shortCode },
        });
        if (!link)
            return null;
        if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
            await this.prisma.paymentLink.update({
                where: { id: link.id },
                data: { isActive: false },
            });
            throw new common_1.HttpException('Payment link has expired', common_1.HttpStatus.GONE);
        }
        return this.formatResponse(link);
    }
    async delete(id, userId) {
        const link = await this.prisma.paymentLink.findFirst({
            where: { id, userId },
        });
        if (!link) {
            throw new common_1.HttpException('Payment link not found', common_1.HttpStatus.NOT_FOUND);
        }
        await this.prisma.paymentLink.delete({
            where: { id },
        });
    }
    async generateQRCode(shortCode) {
        const link = await this.prisma.paymentLink.findUnique({
            where: { shortCode },
        });
        if (!link) {
            throw new common_1.HttpException('Payment link not found', common_1.HttpStatus.NOT_FOUND);
        }
        if (!link.isActive) {
            throw new common_1.HttpException('Payment link is inactive', common_1.HttpStatus.BAD_REQUEST);
        }
        try {
            const qrCodeData = await this.pixService.generatePixQRCode(link.userId, {
                amount: link.amount,
                depixAddress: link.walletAddress,
                description: link.description || `Payment ${shortCode}`,
            });
            const expiresAt = new Date(Date.now() + 28 * 60 * 1000);
            await this.prisma.paymentLink.update({
                where: { id: link.id },
                data: {
                    currentQrCode: qrCodeData.qrCode,
                    qrCodeGeneratedAt: new Date(),
                },
            });
            return {
                qrCode: qrCodeData.qrCode,
                expiresAt,
            };
        }
        catch (error) {
            this.logger.error(`Failed to generate QR code for ${shortCode}:`, error);
            throw new common_1.HttpException('Failed to generate QR code', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async regenerateExpiredQRCodes() {
        this.logger.log('Starting QR code regeneration for expired payment links');
        const expiredLinks = await this.prisma.paymentLink.findMany({
            where: {
                isActive: true,
                qrCodeGeneratedAt: {
                    lt: new Date(Date.now() - 28 * 60 * 1000),
                },
            },
        });
        for (const link of expiredLinks) {
            try {
                await this.generateQRCode(link.shortCode);
                this.logger.log(`Regenerated QR code for payment link ${link.shortCode}`);
            }
            catch (error) {
                this.logger.error(`Failed to regenerate QR code for ${link.shortCode}:`, error);
            }
        }
    }
    async handlePaymentCompleted(transactionId, amount) {
        const recentTime = new Date(Date.now() - 30 * 60 * 1000);
        const link = await this.prisma.paymentLink.findFirst({
            where: {
                amount,
                isActive: true,
                qrCodeGeneratedAt: {
                    gte: recentTime,
                },
            },
            orderBy: {
                qrCodeGeneratedAt: 'desc',
            },
        });
        if (link) {
            await this.prisma.paymentLink.update({
                where: { id: link.id },
                data: {
                    lastPaymentId: transactionId,
                    totalPayments: { increment: 1 },
                    totalAmount: { increment: amount },
                    currentQrCode: null,
                    qrCodeGeneratedAt: null,
                },
            });
            this.logger.log(`Payment completed for link ${link.shortCode}`);
        }
    }
    formatResponse(link) {
        return {
            id: link.id,
            userId: link.userId,
            shortCode: link.shortCode,
            amount: link.amount,
            walletAddress: link.walletAddress,
            description: link.description,
            currentQrCode: link.currentQrCode,
            qrCodeGeneratedAt: link.qrCodeGeneratedAt,
            lastPaymentId: link.lastPaymentId,
            totalPayments: link.totalPayments,
            totalAmount: link.totalAmount,
            isActive: link.isActive,
            expiresAt: link.expiresAt,
            createdAt: link.createdAt,
            updatedAt: link.updatedAt,
        };
    }
};
exports.PaymentLinkService = PaymentLinkService;
__decorate([
    (0, schedule_1.Cron)('*/28 * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PaymentLinkService.prototype, "regenerateExpiredQRCodes", null);
exports.PaymentLinkService = PaymentLinkService = PaymentLinkService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        pix_service_1.PixService])
], PaymentLinkService);
//# sourceMappingURL=payment-link.service.js.map