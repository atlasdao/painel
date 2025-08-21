export declare class CreatePaymentLinkDto {
    amount: number;
    walletAddress: string;
    description?: string;
    expiresAt?: Date;
}
export declare class PaymentLinkResponseDto {
    id: string;
    userId: string;
    shortCode: string;
    amount: number;
    walletAddress: string;
    description?: string;
    currentQrCode?: string;
    qrCodeGeneratedAt?: Date;
    lastPaymentId?: string;
    totalPayments: number;
    totalAmount: number;
    isActive: boolean;
    expiresAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
