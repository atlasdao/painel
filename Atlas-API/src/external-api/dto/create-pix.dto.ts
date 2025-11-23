import {
  IsString,
  IsNumber,
  IsOptional,
  IsObject,
  IsArray,
  IsUrl,
  IsNotEmpty,
  Min,
  MaxLength,
  MinLength,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Webhook events enum
export enum ExternalWebhookEvent {
  TRANSACTION_CREATED = 'transaction.created',
  TRANSACTION_PAID = 'transaction.paid',
  TRANSACTION_FAILED = 'transaction.failed',
  TRANSACTION_EXPIRED = 'transaction.expired',
  TRANSACTION_REFUNDED = 'transaction.refunded',
}

// Webhook configuration DTO
export class WebhookConfigDto {
  @ApiProperty({ description: 'Webhook URL to receive notifications' })
  @IsUrl({}, { message: 'Webhook URL must be a valid URL' })
  @IsNotEmpty()
  url: string;

  @ApiProperty({
    description: 'Events to subscribe to',
    enum: ExternalWebhookEvent,
    isArray: true,
    example: ['transaction.paid', 'transaction.failed'],
  })
  @IsArray()
  @IsEnum(ExternalWebhookEvent, { each: true })
  @IsNotEmpty()
  events: ExternalWebhookEvent[];

  @ApiPropertyOptional({
    description: 'Secret for HMAC signature (min 16 chars). If not provided, one will be generated',
    minLength: 16,
  })
  @IsOptional()
  @IsString()
  @MinLength(16, { message: 'Secret must be at least 16 characters long' })
  @MaxLength(256, { message: 'Secret must not exceed 256 characters' })
  secret?: string;

  @ApiPropertyOptional({
    description: 'Custom headers to send with webhook requests',
    example: { 'X-Custom-Header': 'value' },
  })
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;
}

// Main create PIX DTO
export class CreatePixDto {
  @ApiProperty({
    description: 'Transaction amount in BRL',
    example: 100.5,
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01, { message: 'Amount must be greater than 0' })
  amount: number;

  @ApiPropertyOptional({
    description: 'DEPIX wallet address for receiving funds (optional - if not provided, transaction will be created without QR code)',
    example: 'wallet_abc123',
  })
  @IsOptional()
  @IsString()
  depixAddress?: string;

  @ApiPropertyOptional({
    description: 'Transaction description',
    example: 'Payment for order #12345',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiPropertyOptional({
    description: 'Tax number (CPF/CNPJ) - required for amounts >= R$ 3000',
    example: '123.456.789-01',
  })
  @IsOptional()
  @IsString()
  taxNumber?: string;

  @ApiPropertyOptional({
    description: 'Your internal order ID for tracking',
    example: 'ORD-2025-12345',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  merchantOrderId?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata to store with the transaction',
    example: { customerId: '123', productId: 'abc' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Webhook configuration for receiving transaction notifications',
    type: WebhookConfigDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => WebhookConfigDto)
  webhook?: WebhookConfigDto;

  // Legacy field support (backward compatibility)
  @ApiPropertyOptional({
    description: 'Legacy webhook URL field (deprecated - use webhook.url instead)',
    deprecated: true,
  })
  @IsOptional()
  @IsUrl()
  webhookUrl?: string;
}

// Response DTOs
export class CreatePixResponseDto {
  @ApiProperty({ description: 'Transaction ID' })
  id: string;

  @ApiProperty({ description: 'Transaction status', example: 'PENDING' })
  status: string;

  @ApiProperty({ description: 'Transaction amount in BRL' })
  amount: number;

  @ApiProperty({ description: 'Merchant order ID' })
  merchantOrderId: string;

  @ApiProperty({ description: 'PIX copy-paste code' })
  qrCode: string;

  @ApiProperty({ description: 'Base64 encoded QR code image' })
  qrCodeImage: string;

  @ApiProperty({ description: 'Transaction creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Transaction expiration timestamp' })
  expiresAt: Date;

  @ApiPropertyOptional({ description: 'Webhook configuration details' })
  webhook?: {
    id: string;
    url: string;
    events: string[];
    secretHint: string; // First 4 chars of secret for identification
  };
}