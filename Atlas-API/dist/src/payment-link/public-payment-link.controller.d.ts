import { PaymentLinkService } from './payment-link.service';
import { PaymentLinkResponseDto } from './dto/payment-link.dto';
export declare class PublicPaymentLinkController {
    private readonly paymentLinkService;
    constructor(paymentLinkService: PaymentLinkService);
    getPaymentLink(shortCode: string): Promise<PaymentLinkResponseDto>;
    generateQRCode(shortCode: string): Promise<{
        qrCode: string;
        expiresAt: Date;
    }>;
}
