import {
	IsNumber,
	IsString,
	IsOptional,
	IsDate,
	IsBoolean,
	Min,
	Matches,
	Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreatePaymentLinkDto {
	@ApiPropertyOptional({
		description: 'Fixed amount to be paid (required if not custom amount)',
		example: 100.5,
	})
	@IsNumber()
	@IsOptional()
	@Min(0.01)
	@Type(() => Number)
	amount?: number;

	@ApiPropertyOptional({
		description: 'Allow customer to choose the amount',
		example: false,
		default: false,
	})
	@IsBoolean()
	@IsOptional()
	isCustomAmount?: boolean;

	@ApiPropertyOptional({
		description: 'Minimum amount for custom payment',
		example: 10.0,
	})
	@IsNumber()
	@IsOptional()
	@Min(0.01)
	@Type(() => Number)
	minAmount?: number;

	@ApiPropertyOptional({
		description: 'Maximum amount for custom payment',
		example: 1000.0,
	})
	@IsNumber()
	@IsOptional()
	@Min(0.01)
	@Type(() => Number)
	maxAmount?: number;

	@ApiProperty({
		description: 'Wallet address to receive payment',
		example: 'VJL7NxqTjLLFSCqNcPjBvzUgXxMfVuXP7RG',
	})
	@IsString()
	walletAddress: string;

	@ApiPropertyOptional({
		description: 'Payment description',
		example: 'Product payment',
	})
	@IsString()
	@IsOptional()
	description?: string;

	@ApiPropertyOptional({
		description: 'Expiration date for the payment link',
		example: '2024-12-31T23:59:59Z',
	})
	@IsDate()
	@IsOptional()
	@Type(() => Date)
	expiresAt?: Date;

	@ApiPropertyOptional({
		description: 'Requer CPF/CNPJ do pagador antes de gerar QR Code (obrigatório para valores acima de R$ 3000)',
		example: false,
		default: false,
	})
	@IsBoolean()
	@IsOptional()
	requiresTaxNumber?: boolean;

	@ApiPropertyOptional({
		description: 'Valor mínimo para exigir CPF/CNPJ (em reais)',
		example: 3000.00,
		default: 3000.00,
	})
	@IsNumber()
	@IsOptional()
	@Min(0)
	@Type(() => Number)
	minAmountForTaxNumber?: number;
}

export class UpdatePaymentLinkDto {
	@ApiPropertyOptional({
		description: 'Fixed amount to be paid (optional for updates)',
		example: 100.5,
	})
	@IsNumber()
	@IsOptional()
	@Min(0.01)
	@Type(() => Number)
	amount?: number;

	@ApiPropertyOptional({
		description: 'Allow customer to choose the amount',
		example: false,
	})
	@IsBoolean()
	@IsOptional()
	isCustomAmount?: boolean;

	@ApiPropertyOptional({
		description: 'Minimum amount for custom payment',
		example: 10.0,
	})
	@IsNumber()
	@IsOptional()
	@Min(0.01)
	@Type(() => Number)
	minAmount?: number;

	@ApiPropertyOptional({
		description: 'Maximum amount for custom payment',
		example: 1000.0,
	})
	@IsNumber()
	@IsOptional()
	@Min(0.01)
	@Type(() => Number)
	maxAmount?: number;

	@ApiPropertyOptional({
		description: 'Wallet address to receive payment',
		example: 'VJL7NxqTjLLFSCqNcPjBvzUgXxMfVuXP7RG',
	})
	@IsString()
	@IsOptional()
	walletAddress?: string;

	@ApiPropertyOptional({
		description: 'Payment description',
		example: 'Updated product payment',
	})
	@IsString()
	@IsOptional()
	description?: string;

	@ApiPropertyOptional({
		description: 'Expiration date for the payment link',
		example: '2024-12-31T23:59:59Z',
	})
	@IsDate()
	@IsOptional()
	@Type(() => Date)
	expiresAt?: Date;

	@ApiPropertyOptional({
		description: 'Active status of the payment link',
		example: true,
	})
	@IsBoolean()
	@IsOptional()
	isActive?: boolean;

	@ApiPropertyOptional({
		description: 'Requer CPF/CNPJ do pagador antes de gerar QR Code (obrigatório para valores acima de R$ 3000)',
		example: false,
		default: false,
	})
	@IsBoolean()
	@IsOptional()
	requiresTaxNumber?: boolean;

	@ApiPropertyOptional({
		description: 'Valor mínimo para exigir CPF/CNPJ (em reais)',
		example: 3000.00,
		default: 3000.00,
	})
	@IsNumber()
	@IsOptional()
	@Min(0)
	@Type(() => Number)
	minAmountForTaxNumber?: number;
}

export class PaymentLinkResponseDto {
	id: string;
	userId: string;
	shortCode: string;
	amount?: number;
	isCustomAmount: boolean;
	minAmount?: number;
	maxAmount?: number;
	walletAddress: string;
	description?: string;
	currentQrCode?: string;
	qrCodeGeneratedAt?: Date;
	lastPaymentId?: string;
	totalPayments: number;
	totalAmount: number;
	isActive: boolean;
	expiresAt?: Date;
	requiresTaxNumber: boolean;
	minAmountForTaxNumber: number;
	createdAt: Date;
	updatedAt: Date;
}

export class GenerateQRWithTaxNumberDto {
	@ApiPropertyOptional({
		description: 'Valor customizado (para links com valor variável)',
		example: 100.50,
	})
	@IsNumber()
	@IsOptional()
	@Type(() => Number)
	@Min(0.01)
	@Max(5000)
	amount?: number;

	@ApiProperty({
		description: 'CPF ou CNPJ do pagador (apenas números ou formatado)',
		example: '123.456.789-00',
	})
	@IsString()
	@Matches(/^(\d{11}|\d{14}|\d{3}\.\d{3}\.\d{3}-\d{2}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})$/, {
		message: 'CPF/CNPJ inválido. Use apenas números ou formatos: 000.000.000-00 (CPF) ou 00.000.000/0000-00 (CNPJ)',
	})
	taxNumber: string;
}

export class GenerateQRCodeDto {
	@ApiPropertyOptional({
		description: 'Valor customizado (para links com valor variável)',
		example: 100.50,
	})
	@IsNumber()
	@IsOptional()
	@Type(() => Number)
	@Min(0.01)
	@Max(5000)
	amount?: number;
}

export class QRCodeResponseDto {
	qrCode: string;
	expiresAt: Date;
	transactionId: string;
	requiresTaxNumber?: boolean;
	sessionToken?: string;
	needsTaxNumber?: boolean;
}
