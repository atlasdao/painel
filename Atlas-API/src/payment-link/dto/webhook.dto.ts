import { IsString, IsArray, IsUrl, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWebhookDto {
	@ApiProperty({
		description: 'Webhook URL to receive events',
		example: 'https://sua-api.com/webhook',
	})
	@IsUrl({}, { message: 'URL deve ser válida' })
	url: string;

	@ApiProperty({
		description: 'List of events to subscribe to',
		example: ['payment.created', 'payment.confirmed'],
	})
	@IsArray({ message: 'Eventos devem ser uma lista' })
	@IsString({ each: true, message: 'Cada evento deve ser uma string' })
	events: string[];

	@ApiProperty({
		description: 'Secret key for webhook validation',
		required: false,
	})
	@IsOptional()
	@IsString({ message: 'Secret deve ser uma string' })
	secret?: string;
}

export class UpdateWebhookDto {
	@ApiProperty({
		description: 'Webhook URL to receive events',
		required: false,
	})
	@IsOptional()
	@IsUrl({}, { message: 'URL deve ser válida' })
	url?: string;

	@ApiProperty({
		description: 'List of events to subscribe to',
		required: false,
	})
	@IsOptional()
	@IsArray({ message: 'Eventos devem ser uma lista' })
	@IsString({ each: true, message: 'Cada evento deve ser uma string' })
	events?: string[];

	@ApiProperty({
		description: 'Secret key for webhook validation',
		required: false,
	})
	@IsOptional()
	@IsString({ message: 'Secret deve ser uma string' })
	secret?: string;

	@ApiProperty({
		description: 'Whether the webhook is active',
		required: false,
	})
	@IsOptional()
	@IsBoolean({ message: 'isActive deve ser um booleano' })
	isActive?: boolean;
}

export class WebhookResponseDto {
	@ApiProperty({
		description: 'Webhook ID',
	})
	id: string;

	@ApiProperty({
		description: 'Webhook URL',
	})
	url: string;

	@ApiProperty({
		description: 'Subscribed events',
	})
	events: string[];

	@ApiProperty({
		description: 'Whether the webhook is active',
	})
	isActive: boolean;

	@ApiProperty({
		description: 'Masked secret key',
		required: false,
	})
	secret?: string;

	@ApiProperty({
		description: 'Creation date',
	})
	createdAt: string;

	@ApiProperty({
		description: 'Last triggered date',
		required: false,
	})
	lastTriggered?: string;

	@ApiProperty({
		description: 'Webhook status',
		enum: ['active', 'failed', 'pending'],
	})
	status: 'active' | 'failed' | 'pending';
}

export class WebhookTestDto {
	@ApiProperty({
		description: 'Event type to test',
		example: 'payment.created',
	})
	@IsString({ message: 'Tipo de evento deve ser uma string' })
	eventType: string;

	@ApiProperty({
		description: 'Test payload data',
		required: false,
		example: {
			paymentLinkId: 'abc123',
			transactionId: 'tx_456',
			amount: 100.50,
			status: 'COMPLETED'
		},
	})
	@IsOptional()
	testData?: any;
}

export class WebhookTestResponseDto {
	@ApiProperty({
		description: 'Test execution status',
	})
	success: boolean;

	@ApiProperty({
		description: 'Status message',
	})
	message: string;

	@ApiProperty({
		description: 'HTTP response code from webhook URL',
		required: false,
	})
	httpStatus?: number;

	@ApiProperty({
		description: 'Response time in milliseconds',
		required: false,
	})
	responseTime?: number;

	@ApiProperty({
		description: 'Response body from webhook URL',
		required: false,
	})
	responseBody?: any;

	@ApiProperty({
		description: 'Error details if test failed',
		required: false,
	})
	error?: string;
}

export class WebhookEventsDto {
	@ApiProperty({
		description: 'List of all available webhook events',
	})
	events: string[];

	@ApiProperty({
		description: 'Event descriptions',
	})
	descriptions: { [key: string]: string };
}

export class WebhookValidationDto {
	@ApiProperty({
		description: 'URL validation result',
	})
	urlValid: boolean;

	@ApiProperty({
		description: 'URL accessibility result',
	})
	urlAccessible: boolean;

	@ApiProperty({
		description: 'Response time in milliseconds',
		required: false,
	})
	responseTime?: number;

	@ApiProperty({
		description: 'Validation messages',
	})
	messages: string[];
}