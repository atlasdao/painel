import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentLinkDto, PaymentLinkResponseDto } from './dto/payment-link.dto';
import { PixService } from '../pix/pix.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { nanoid } from 'nanoid';

@Injectable()
export class PaymentLinkService {
  private readonly logger = new Logger(PaymentLinkService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pixService: PixService,
  ) {}

  async create(
    userId: string,
    dto: CreatePaymentLinkDto,
  ): Promise<PaymentLinkResponseDto> {
    // Generate unique short code
    const shortCode = nanoid(8);

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

  async findByUserId(userId: string): Promise<PaymentLinkResponseDto[]> {
    const links = await this.prisma.paymentLink.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return links.map(link => this.formatResponse(link));
  }

  async findByShortCode(shortCode: string): Promise<PaymentLinkResponseDto | null> {
    const link = await this.prisma.paymentLink.findUnique({
      where: { shortCode },
    });

    if (!link) return null;

    // Check if link is expired
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      await this.prisma.paymentLink.update({
        where: { id: link.id },
        data: { isActive: false },
      });
      throw new HttpException('Payment link has expired', HttpStatus.GONE);
    }

    return this.formatResponse(link);
  }

  async delete(id: string, userId: string): Promise<void> {
    const link = await this.prisma.paymentLink.findFirst({
      where: { id, userId },
    });

    if (!link) {
      throw new HttpException('Payment link not found', HttpStatus.NOT_FOUND);
    }

    await this.prisma.paymentLink.delete({
      where: { id },
    });
  }

  async generateQRCode(shortCode: string): Promise<{ qrCode: string; expiresAt: Date }> {
    const link = await this.prisma.paymentLink.findUnique({
      where: { shortCode },
    });

    if (!link) {
      throw new HttpException('Payment link not found', HttpStatus.NOT_FOUND);
    }

    if (!link.isActive) {
      throw new HttpException('Payment link is inactive', HttpStatus.BAD_REQUEST);
    }

    try {
      // Generate PIX QR Code
      const qrCodeData = await this.pixService.generatePixQRCode(link.userId, {
        amount: link.amount,
        depixAddress: link.walletAddress,
        description: link.description || `Payment ${shortCode}`,
      });

      // Update link with new QR code
      const expiresAt = new Date(Date.now() + 28 * 60 * 1000); // 28 minutes from now
      
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
    } catch (error) {
      this.logger.error(`Failed to generate QR code for ${shortCode}:`, error);
      throw new HttpException(
        'Failed to generate QR code',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Cron job to regenerate QR codes every 28 minutes
  @Cron('*/28 * * * *')
  async regenerateExpiredQRCodes() {
    this.logger.log('Starting QR code regeneration for expired payment links');

    const expiredLinks = await this.prisma.paymentLink.findMany({
      where: {
        isActive: true,
        qrCodeGeneratedAt: {
          lt: new Date(Date.now() - 28 * 60 * 1000), // Older than 28 minutes
        },
      },
    });

    for (const link of expiredLinks) {
      try {
        await this.generateQRCode(link.shortCode);
        this.logger.log(`Regenerated QR code for payment link ${link.shortCode}`);
      } catch (error) {
        this.logger.error(
          `Failed to regenerate QR code for ${link.shortCode}:`,
          error,
        );
      }
    }
  }

  async handlePaymentCompleted(transactionId: string, amount: number) {
    // Find payment link by amount and recent QR code generation
    const recentTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
    
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
      // Update payment link statistics
      await this.prisma.paymentLink.update({
        where: { id: link.id },
        data: {
          lastPaymentId: transactionId,
          totalPayments: { increment: 1 },
          totalAmount: { increment: amount },
          currentQrCode: null, // Clear QR code to force regeneration
          qrCodeGeneratedAt: null,
        },
      });

      this.logger.log(`Payment completed for link ${link.shortCode}`);
    }
  }

  private formatResponse(link: any): PaymentLinkResponseDto {
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
}