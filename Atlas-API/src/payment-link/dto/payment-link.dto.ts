import {
	IsNumber,
	IsString,
	IsOptional,
	IsDate,
	IsBoolean,
	Min,
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
	createdAt: Date;
	updatedAt: Date;
}
