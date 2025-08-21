import { PaymentLinkService } from './payment-link.service';
import { CreatePaymentLinkDto, PaymentLinkResponseDto } from './dto/payment-link.dto';
export declare class PaymentLinkController {
    private readonly paymentLinkService;
    constructor(paymentLinkService: PaymentLinkService);
    createPaymentLink(req: any, dto: CreatePaymentLinkDto): Promise<PaymentLinkResponseDto>;
    getMyPaymentLinks(req: any): Promise<PaymentLinkResponseDto[]>;
    deletePaymentLink(req: any, id: string): Promise<{
        message: string;
    }>;
}
