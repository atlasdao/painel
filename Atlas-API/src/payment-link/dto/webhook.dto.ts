import {
  IsString,
  IsArray,
  IsOptional,
  IsBoolean,
  IsObject,
  IsUrl,
  IsNotEmpty,
  ArrayMinSize,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export const WEBHOOK_EVENTS = [
  'payment.created',
  'payment.processing',
  'payment.completed',
  'payment.failed',
  'payment.refunded',
  'payment.expired',
] as const;

export type WebhookEventType = typeof WEBHOOK_EVENTS[number];

export class CreateWebhookDto {
  @ApiPropertyOptional({
    description: 'ID do webhook (ignorado na criação)',
    example: 'uuid-string',
  })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiProperty({
    description: 'Nome do webhook',
    example: 'Meu Webhook',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'URL do endpoint do webhook',
    example: 'https://example.com/webhook',
  })
  @IsUrl()
  @IsNotEmpty()
  url: string;

  @ApiProperty({
    description: 'Eventos para enviar ao webhook',
    example: ['payment.completed', 'payment.failed'],
    enum: WEBHOOK_EVENTS,
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(WEBHOOK_EVENTS, { each: true })
  events: WebhookEventType[];

  @ApiPropertyOptional({
    description: 'Webhook ativo ou inativo',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({
    description: 'Headers customizados para enviar com o webhook',
    example: { 'X-Custom-Header': 'value' },
  })
  @IsObject()
  @IsOptional()
  headers?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Política de retry do webhook',
    example: { maxRetries: 3, retryDelay: 1000 },
  })
  @IsObject()
  @IsOptional()
  retryPolicy?: {
    maxRetries?: number;
    retryDelay?: number;
  };
}

export class UpdateWebhookDto {
  @ApiPropertyOptional({
    description: 'Nome do webhook',
    example: 'Webhook Atualizado',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'URL do endpoint do webhook',
    example: 'https://example.com/webhook/updated',
  })
  @IsUrl()
  @IsOptional()
  url?: string;

  @ApiPropertyOptional({
    description: 'Eventos para enviar ao webhook',
    example: ['payment.completed'],
    enum: WEBHOOK_EVENTS,
    isArray: true,
  })
  @IsArray()
  @IsOptional()
  @ArrayMinSize(1)
  @IsIn(WEBHOOK_EVENTS, { each: true })
  events?: WebhookEventType[];

  @ApiPropertyOptional({
    description: 'Webhook ativo ou inativo',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({
    description: 'Headers customizados para enviar com o webhook',
    example: { 'X-Custom-Header': 'new-value' },
  })
  @IsObject()
  @IsOptional()
  headers?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Política de retry do webhook',
    example: { maxRetries: 5, retryDelay: 2000 },
  })
  @IsObject()
  @IsOptional()
  retryPolicy?: {
    maxRetries?: number;
    retryDelay?: number;
  };
}

export class WebhookResponseDto {
  id: string;
  paymentLinkId: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  secret: string;
  headers?: any;
  retryPolicy?: any;
  lastTriggeredAt?: Date;
  failureCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class WebhookEventResponseDto {
  id: string;
  paymentLinkId: string;
  webhookId: string;
  eventType: string;
  payload: any;
  status: string;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: Date;
  responseCode?: number;
  responseBody?: string;
  nextRetryAt?: Date;
  signature?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class TestWebhookDto {
  @ApiPropertyOptional({
    description: 'Tipo de evento de teste',
    example: 'payment.completed',
    enum: WEBHOOK_EVENTS,
  })
  @IsOptional()
  @IsIn(WEBHOOK_EVENTS)
  eventType?: WebhookEventType;
}