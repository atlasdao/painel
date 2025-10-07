import {
	IsString,
	IsNotEmpty,
	IsUrl,
	IsOptional,
	IsEnum,
	IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiKeyRequestStatus, ApiKeyUsageType } from '@prisma/client';

export class CreateApiKeyRequestDto {
	@ApiProperty({
		description: 'Reason for requesting API access',
		example: 'Integrating PIX payments into my e-commerce platform',
	})
	@IsString()
	@IsNotEmpty()
	usageReason: string;

	@ApiProperty({
		description: 'URL of the service that will use the API',
		example: 'https://mystore.com',
	})
	@IsUrl()
	@IsNotEmpty()
	serviceUrl: string;

	@ApiProperty({
		description: 'Estimated monthly payment volume',
		example: '100-500 transactions per month',
	})
	@IsString()
	@IsNotEmpty()
	estimatedVolume: string;

	@ApiProperty({
		description: 'Type of API usage - single CPF/CNPJ or multiple',
		enum: ApiKeyUsageType,
		example: ApiKeyUsageType.SINGLE_CPF,
	})
	@IsEnum(ApiKeyUsageType)
	usageType: ApiKeyUsageType;
}

export class ApproveApiKeyRequestDto {
	@ApiPropertyOptional({
		description: 'Admin notes about the approval',
		example: 'Verified business legitimacy, approved for production use',
	})
	@IsString()
	@IsOptional()
	approvalNotes?: string;

	@ApiPropertyOptional({
		description: 'API key expiration date (optional)',
		example: '2025-12-31T23:59:59Z',
	})
	@IsOptional()
	apiKeyExpiresAt?: Date;
}

export class RejectApiKeyRequestDto {
	@ApiProperty({
		description: 'Reason for rejection',
		example: 'Insufficient business information provided',
	})
	@IsString()
	@IsNotEmpty()
	approvalNotes: string;
}

export class FilterApiKeyRequestsDto {
	@ApiPropertyOptional({
		enum: ApiKeyRequestStatus,
		description: 'Filter by request status',
	})
	@IsEnum(ApiKeyRequestStatus)
	@IsOptional()
	status?: ApiKeyRequestStatus;

	@ApiPropertyOptional({
		description: 'Filter by user ID',
	})
	@IsUUID()
	@IsOptional()
	userId?: string;
}

export class ApiKeyRequestResponseDto {
	id: string;
	userId: string;
	usageReason: string;
	serviceUrl: string;
	estimatedVolume: string;
	usageType: ApiKeyUsageType;
	status: ApiKeyRequestStatus;
	approvedBy?: string;
	approvalNotes?: string;
	approvedAt?: Date;
	rejectedAt?: Date;
	createdAt: Date;
	updatedAt: Date;
	user?: {
		id: string;
		email: string;
		username: string;
	};
}
