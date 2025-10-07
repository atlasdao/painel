import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCommerceApplicationDto,
  UpdateApplicationStatusDto,
  CommerceApplicationStatus,
} from './dto/commerce.dto';

@Injectable()
export class CommerceService {
  private readonly logger = new Logger(CommerceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createApplication(userId: string, dto: CreateCommerceApplicationDto) {
    this.logger.log(`Creating commerce application for user ${userId}`);

    // Check if user already has an application
    const existingApplication = await this.prisma.commerceApplication.findUnique({
      where: { userId },
    });

    if (existingApplication) {
      if (existingApplication.status === 'REJECTED') {
        // Allow resubmission if previously rejected
        return this.prisma.commerceApplication.update({
          where: { userId },
          data: {
            ...dto,
            status: 'PENDING',
            rejectionReason: null,
            reviewedBy: null,
            reviewedAt: null,
            reviewNotes: null,
          },
        });
      }
      throw new BadRequestException('Você já possui uma aplicação em andamento');
    }

    // Create new application
    return this.prisma.commerceApplication.create({
      data: {
        userId,
        ...dto,
        status: 'PENDING',
      },
    });
  }

  async getApplication(userId: string) {
    const application = await this.prisma.commerceApplication.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            commerceMode: true,
            isAccountValidated: true,
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException('Aplicação não encontrada');
    }

    return application;
  }

  async getUserApplicationStatus(userId: string) {
    const application = await this.prisma.commerceApplication.findUnique({
      where: { userId },
      select: {
        id: true,
        status: true,
        depositPaid: true,
        depositAmount: true,
        rejectionReason: true,
        createdAt: true,
      },
    });

    // Also check if user has commerce mode active
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        commerceMode: true,
        isAccountValidated: true,
      },
    });

    return {
      hasApplication: !!application,
      application,
      user,
    };
  }

  async getAllApplications(status?: CommerceApplicationStatus) {
    const where = status ? { status } : {};

    return this.prisma.commerceApplication.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateApplicationStatus(
    applicationId: string,
    adminId: string,
    dto: UpdateApplicationStatusDto,
  ) {
    const application = await this.prisma.commerceApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Aplicação não encontrada');
    }

    const updateData: any = {
      status: dto.status,
      reviewedBy: adminId,
      reviewedAt: new Date(),
    };

    if (dto.reviewNotes) {
      updateData.reviewNotes = dto.reviewNotes;
    }

    if (dto.status === 'REJECTED' && dto.rejectionReason) {
      updateData.rejectionReason = dto.rejectionReason;
    }

    if (dto.status === 'APPROVED') {
      // When approved, set status to DEPOSIT_PENDING
      updateData.status = 'DEPOSIT_PENDING';
    }

    return this.prisma.commerceApplication.update({
      where: { id: applicationId },
      data: updateData,
    });
  }

  async processDeposit(userId: string, transactionId: string) {
    const application = await this.prisma.commerceApplication.findUnique({
      where: { userId },
    });

    if (!application) {
      throw new NotFoundException('Aplicação não encontrada');
    }

    if (application.status !== 'DEPOSIT_PENDING' && application.status !== 'APPROVED') {
      throw new BadRequestException('Aplicação não está aguardando depósito');
    }

    // Verify transaction exists and is for the correct amount
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction || transaction.userId !== userId) {
      throw new NotFoundException('Transação não encontrada');
    }

    // Check if amount matches (100k satoshis = approx R$ value, adjust as needed)
    // For now, we'll accept any deposit as proof of payment
    if (transaction.status !== 'COMPLETED') {
      throw new BadRequestException('Transação não está completa');
    }

    // Update application with deposit info
    await this.prisma.commerceApplication.update({
      where: { userId },
      data: {
        depositPaid: true,
        depositPaidAt: new Date(),
        status: 'ACTIVE',
        commerceActivatedAt: new Date(),
      },
    });

    // Activate commerce mode for user
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        commerceMode: true,
        commerceModeActivatedAt: new Date(),
        paymentLinksEnabled: true,
      },
    });

    return { success: true, message: 'Depósito processado e modo comércio ativado' };
  }

  async checkRefundEligibility(userId: string) {
    const application = await this.prisma.commerceApplication.findUnique({
      where: { userId },
    });

    if (!application || !application.depositPaid) {
      throw new NotFoundException('Depósito não encontrado');
    }

    if (application.depositRefunded) {
      throw new BadRequestException('Depósito já foi reembolsado');
    }

    // Check if 3 months have passed
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const isThreeMonthsPassed = application.depositPaidAt &&
      application.depositPaidAt < threeMonthsAgo;

    // Count user transactions
    const transactionCount = await this.prisma.transaction.count({
      where: {
        userId,
        status: 'COMPLETED',
        createdAt: {
          gte: application.depositPaidAt || new Date(),
        },
      },
    });

    const isEligible = isThreeMonthsPassed && transactionCount >= 200;

    return {
      eligible: isEligible,
      monthsPassed: isThreeMonthsPassed,
      transactionCount,
      requiredTransactions: 200,
      depositAmount: application.depositAmount,
    };
  }

  async processRefund(userId: string, adminId: string) {
    const eligibility = await this.checkRefundEligibility(userId);

    if (!eligibility.eligible) {
      throw new BadRequestException(
        `Reembolso não disponível. Transações: ${eligibility.transactionCount}/200`,
      );
    }

    // Mark deposit as refunded
    await this.prisma.commerceApplication.update({
      where: { userId },
      data: {
        depositRefunded: true,
        depositRefundedAt: new Date(),
      },
    });

    // Log the refund action
    this.logger.log(`Deposit refunded for user ${userId} by admin ${adminId}`);

    return {
      success: true,
      message: 'Depósito reembolsado com sucesso',
      amount: eligibility.depositAmount,
    };
  }

  async incrementTransactionCount(userId: string) {
    const application = await this.prisma.commerceApplication.findUnique({
      where: { userId },
    });

    if (application && application.status === 'ACTIVE') {
      await this.prisma.commerceApplication.update({
        where: { userId },
        data: {
          transactionCount: {
            increment: 1,
          },
        },
      });
    }
  }
}