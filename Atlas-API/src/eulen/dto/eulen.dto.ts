import {
	IsNumber,
	IsString,
	IsOptional,
	IsEnum,
	IsUUID,
	Min,
	IsEmail,
	IsMobilePhone,
	IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { TransactionStatus, TransactionType, PixKeyType } from '@prisma/client';

export class DepositDto {
	@ApiProperty({
		description: 'Transaction amount in BRL',
		example: 100.5,
		minimum: 0.01,
	})
	@IsNumber({ maxDecimalPlaces: 2 })
	@Min(0.01)
	@Type(() => Number)
	amount: number;

	@ApiProperty({
		description: 'PIX key for the transaction',
		example: 'user@example.com',
	})
	@IsString()
	@Transform(({ value }) => value?.trim())
	pixKey: string;

	@ApiPropertyOptional({
		description: 'PIX key type',
		enum: PixKeyType,
		example: PixKeyType.EMAIL,
	})
	@IsOptional()
	@IsEnum(PixKeyType)
	pixKeyType?: PixKeyType;

	@ApiPropertyOptional({
		description: 'Transaction description',
		example: 'Payment for services',
	})
	@IsOptional()
	@IsString()
	@Transform(({ value }) => value?.trim())
	description?: string;

	@ApiPropertyOptional({
		description: 'External transaction ID',
		example: 'EXT-123456',
	})
	@IsOptional()
	@IsString()
	externalId?: string;

	@ApiPropertyOptional({
		description: 'Webhook URL for transaction updates',
		example: 'https://example.com/webhook',
	})
	@IsOptional()
	@IsUrl()
	webhookUrl?: string;

	@ApiPropertyOptional({
		description: 'Nome do cliente/comprador',
		example: 'João Silva',
	})
	@IsOptional()
	@IsString()
	@Transform(({ value }) => value?.trim())
	buyerName?: string;
}

export class WithdrawDto extends DepositDto {}

export class TransferDto extends DepositDto {
	@ApiProperty({
		description: 'Destination PIX key',
		example: 'destination@example.com',
	})
	@IsString()
	@Transform(({ value }) => value?.trim())
	destinationPixKey: string;
}

export class TransactionResponseDto {
	@ApiProperty({
		description: 'Transaction ID',
		example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
	})
	id: string;

	@ApiProperty({
		description: 'Transaction type',
		enum: TransactionType,
		example: TransactionType.DEPOSIT,
	})
	type: TransactionType;

	@ApiProperty({
		description: 'Transaction status',
		enum: TransactionStatus,
		example: TransactionStatus.PENDING,
	})
	status: TransactionStatus;

	@ApiProperty({
		description: 'Transaction amount',
		example: 100.5,
	})
	amount: number;

	@ApiProperty({
		description: 'PIX key',
		example: 'user@example.com',
	})
	pixKey: string;

	@ApiPropertyOptional({
		description: 'PIX key type',
		enum: PixKeyType,
		example: PixKeyType.EMAIL,
	})
	pixKeyType?: PixKeyType;

	@ApiPropertyOptional({
		description: 'External transaction ID',
		example: 'EXT-123456',
	})
	externalId?: string;

	@ApiPropertyOptional({
		description: 'Transaction description',
		example: 'Payment for services',
	})
	description?: string;

	@ApiPropertyOptional({
		description: 'Nome do cliente/comprador',
		example: 'João Silva',
	})
	buyerName?: string;

	@ApiPropertyOptional({
		description: 'Transaction metadata',
		example: '{"qrCode": true, "depixAddress": "VJL..."}',
	})
	metadata?: string;

	@ApiPropertyOptional({
		description: 'Error message if transaction failed',
		example: 'Insufficient funds',
	})
	errorMessage?: string;

	@ApiPropertyOptional({
		description: 'Currency code',
		example: 'BRL',
	})
	currency?: string;

	@ApiProperty({
		description: 'Creation timestamp',
		example: new Date(),
	})
	createdAt: Date;

	@ApiProperty({
		description: 'Last update timestamp',
		example: new Date(),
	})
	updatedAt: Date;

	@ApiPropertyOptional({
		description: 'Processing completion timestamp',
		example: new Date(),
	})
	processedAt?: Date;
}

export class TransactionStatusDto {
	@ApiProperty({
		description: 'Transaction ID to query',
		example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
	})
	@IsUUID()
	transactionId: string;
}

export class PaginationDto {
	@ApiPropertyOptional({
		description: 'Number of items to skip',
		example: 0,
		minimum: 0,
	})
	@IsOptional()
	@IsNumber()
	@Min(0)
	@Type(() => Number)
	skip?: number = 0;

	@ApiPropertyOptional({
		description: 'Number of items to take',
		example: 10,
		minimum: 1,
		maximum: 100,
	})
	@IsOptional()
	@IsNumber()
	@Min(1)
	@Type(() => Number)
	take?: number = 10;

	@ApiPropertyOptional({
		description: 'Number of items to return (alias for take)',
		example: 10,
		minimum: 1,
		maximum: 100,
	})
	@IsOptional()
	@IsNumber()
	@Min(1)
	@Type(() => Number)
	limit?: number;

	@ApiPropertyOptional({
		description: 'Number of items to skip (alias for skip)',
		example: 0,
		minimum: 0,
	})
	@IsOptional()
	@IsNumber()
	@Min(0)
	@Type(() => Number)
	offset?: number;
}

export class TransactionFilterDto extends PaginationDto {
	@ApiPropertyOptional({
		description: 'Filter by transaction status',
		enum: TransactionStatus,
	})
	@IsOptional()
	@IsEnum(TransactionStatus)
	status?: TransactionStatus;

	@ApiPropertyOptional({
		description: 'Filter by transaction type',
		enum: TransactionType,
	})
	@IsOptional()
	@IsEnum(TransactionType)
	type?: TransactionType;

	@ApiPropertyOptional({
		description: 'Filter by start date',
		example: '2024-01-01',
	})
	@IsOptional()
	@Type(() => Date)
	startDate?: Date;

	@ApiPropertyOptional({
		description: 'Filter by end date',
		example: '2024-12-31',
	})
	@IsOptional()
	@Type(() => Date)
	endDate?: Date;
}

export class PaginatedResponseDto<T> {
	@ApiProperty({
		description: 'Array of items',
		isArray: true,
	})
	data: T[];

	@ApiProperty({
		description: 'Total number of items',
		example: 100,
	})
	total: number;

	@ApiProperty({
		description: 'Number of items skipped',
		example: 0,
	})
	skip: number;

	@ApiProperty({
		description: 'Number of items taken',
		example: 10,
	})
	take: number;

	@ApiProperty({
		description: 'Whether there are more items',
		example: true,
	})
	hasMore: boolean;
}
