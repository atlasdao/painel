import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDonationDto } from './dto/create-donation.dto';
import { ConfirmDonationDto } from './dto/confirm-donation.dto';
import { DonationMethod, DonationStatus } from '@prisma/client';
import { EulenClientService } from '../services/eulen-client.service';
import * as QRCode from 'qrcode';

@Injectable()
export class DonationsService {
  constructor(
    private prisma: PrismaService,
    private eulenClient: EulenClientService,
  ) {}

  async create(createDonationDto: CreateDonationDto, userId?: string) {
    const { paymentMethod, amount, donorName, message, transactionId } = createDonationDto;

    let pixQrCode: string | null = null;
    let externalTransactionId: string | null = null;

    // Only generate QR codes for PIX payments
    if (paymentMethod === DonationMethod.PIX) {
      try {
        // Use DEPIX API to generate real PIX QR code
        const depixResponse = await this.eulenClient.generatePixQRCode({
          amount: amount, // Amount in reais
          description: `Doação Atlas DAO - ${message || 'Apoio ao projeto'}`,
          userTaxNumber: undefined, // Could be added to DTO if needed
        });

        // Convert the QR text to QR image data URL for display
        pixQrCode = await QRCode.toDataURL(depixResponse.qrCode);
        externalTransactionId = depixResponse.transactionId;
      } catch (error) {
        console.error('Erro ao gerar QR Code PIX via DEPIX API:', error);
        throw new BadRequestException('Erro ao gerar QR Code PIX. Tente novamente em alguns minutos.');
      }
    }

    // DEPIX Liquid and Lightning should NOT generate QR codes - they work like Bitcoin
    if (paymentMethod === DonationMethod.DEPIX_LIQUID || paymentMethod === DonationMethod.DEPIX_LIGHTNING) {
      // These are blockchain transfers - no QR code generation needed
      // User will manually send to provided wallet address and input transaction ID
    }

    const donation = await this.prisma.donation.create({
      data: {
        userId,
        donorName,
        amount,
        paymentMethod,
        message,
        transactionId: externalTransactionId || transactionId, // Use DEPIX transaction ID for PIX
        pixQrCode,
        // PIX donations start as PENDING until webhook confirms payment
        // DEPIX/Bitcoin/etc donations also start as PENDING until manual confirmation
        status: DonationStatus.PENDING,
        confirmedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return {
      success: true,
      data: donation,
      message: paymentMethod === DonationMethod.PIX
        ? 'QR Code PIX gerado com sucesso! Aguardando pagamento.'
        : 'Doação criada! Envie o pagamento para o endereço fornecido e confirme com o ID da transação.',
    };
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [donations, total] = await Promise.all([
      this.prisma.donation.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      }),
      this.prisma.donation.count(),
    ]);

    return {
      success: true,
      data: {
        donations,
        pagination: {
          total,
          pages: Math.ceil(total / limit),
          current: page,
          limit,
        },
      },
    };
  }

  async findOne(id: string) {
    const donation = await this.prisma.donation.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!donation) {
      throw new NotFoundException('Doação não encontrada');
    }

    return {
      success: true,
      data: donation,
    };
  }

  async confirmDonation(id: string, confirmDonationDto: ConfirmDonationDto) {
    const donation = await this.prisma.donation.findUnique({
      where: { id },
    });

    if (!donation) {
      throw new NotFoundException('Doação não encontrada');
    }

    if (donation.status === DonationStatus.CONFIRMED) {
      throw new BadRequestException('Doação já foi confirmada');
    }

    if (donation.paymentMethod === DonationMethod.PIX) {
      throw new BadRequestException('Doações PIX são confirmadas automaticamente');
    }

    // Update transaction ID but keep status as PENDING for admin approval
    const updatedDonation = await this.prisma.donation.update({
      where: { id },
      data: {
        transactionId: confirmDonationDto.transactionId,
        // Keep status as PENDING - admin must approve manually
        status: DonationStatus.PENDING,
        confirmedAt: null, // Will be set when admin approves
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return {
      success: true,
      data: updatedDonation,
      message: 'ID da transação registrado! Aguardando aprovação do administrador.',
    };
  }

  async getStats() {
    const [totalDonations, totalAmount, recentDonations, topDonors] = await Promise.all([
      this.prisma.donation.count({
        where: { status: DonationStatus.CONFIRMED },
      }),
      this.prisma.donation.aggregate({
        where: { status: DonationStatus.CONFIRMED },
        _sum: { amount: true },
      }),
      this.prisma.donation.findMany({
        where: { status: DonationStatus.CONFIRMED },
        take: 5,
        orderBy: { confirmedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      }),
      this.prisma.donation.groupBy({
        by: ['userId', 'donorName'],
        where: {
          status: DonationStatus.CONFIRMED,
          OR: [
            { userId: { not: null } },
            { donorName: { not: null } },
          ],
        },
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      success: true,
      data: {
        totalDonations,
        totalAmount: totalAmount._sum.amount || 0,
        recentDonations,
        topDonors,
      },
    };
  }

  async getLeaderboard(limit = 10) {
    const leaderboard = await this.prisma.donation.groupBy({
      by: ['userId', 'donorName'],
      where: {
        status: DonationStatus.CONFIRMED,
        OR: [
          { userId: { not: null } },
          { donorName: { not: null } },
        ],
      },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
      take: limit,
    });

    const enrichedLeaderboard = await Promise.all(
      leaderboard.map(async (entry) => {
        let donorInfo: { id: string; username: string } | null = null;
        if (entry.userId) {
          donorInfo = await this.prisma.user.findUnique({
            where: { id: entry.userId },
            select: { id: true, username: true },
          });
        }

        return {
          donor: donorInfo || { name: entry.donorName },
          totalAmount: entry._sum.amount,
          totalDonations: entry._count,
        };
      })
    );

    return {
      success: true,
      data: enrichedLeaderboard,
    };
  }

  async getPendingCount() {
    const pendingDonations = await this.prisma.donation.count({
      where: { status: DonationStatus.PENDING },
    });

    return {
      success: true,
      data: {
        pendingDonations,
      },
    };
  }

  // Admin methods
  async findAllForAdmin(page: number = 1, limit: number = 20, status?: DonationStatus) {
    const skip = (page - 1) * limit;

    const where = status ? { status } : {};

    const [donations, total] = await Promise.all([
      this.prisma.donation.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.donation.count({ where }),
    ]);

    return {
      success: true,
      data: {
        donations,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async approveDonation(id: string, adminUserId: string) {
    const donation = await this.prisma.donation.findUnique({ where: { id } });

    if (!donation) {
      throw new NotFoundException('Doação não encontrada');
    }

    if (donation.status === 'CONFIRMED') {
      throw new BadRequestException('Doação já confirmada');
    }

    const updatedDonation = await this.prisma.donation.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    return {
      success: true,
      data: updatedDonation,
      message: 'Doação aprovada com sucesso',
    };
  }

  async rejectDonation(id: string, adminUserId: string, reason?: string) {
    const donation = await this.prisma.donation.findUnique({ where: { id } });

    if (!donation) {
      throw new NotFoundException('Doação não encontrada');
    }

    if (donation.status === 'CONFIRMED') {
      throw new BadRequestException('Não é possível rejeitar doação já confirmada');
    }

    const updatedDonation = await this.prisma.donation.update({
      where: { id },
      data: {
        status: 'REJECTED',
        // We could add an adminNotes field to the schema if needed
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    return {
      success: true,
      data: updatedDonation,
      message: 'Doação rejeitada com sucesso',
    };
  }
}