import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentLinkDto, PaymentLinkResponseDto } from './dto/payment-link.dto';
import { PixService } from '../pix/pix.service';
export declare class PaymentLinkService {
    private readonly prisma;
    private readonly pixService;
    private readonly logger;
    constructor(prisma: PrismaService, pixService: PixService);
    create(userId: string, dto: CreatePaymentLinkDto): Promise<PaymentLinkResponseDto>;
    findByUserId(userId: string): Promise<PaymentLinkResponseDto[]>;
    findByShortCode(shortCode: string): Promise<PaymentLinkResponseDto | null>;
    delete(id: string, userId: string): Promise<void>;
    generateQRCode(shortCode: string): Promise<{
        qrCode: string;
        expiresAt: Date;
    }>;
    regenerateExpiredQRCodes(): Promise<void>;
    handlePaymentCompleted(transactionId: string, amount: number): Promise<void>;
    private formatResponse;
}
