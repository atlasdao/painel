import {
	Controller,
	Post,
	Body,
	HttpCode,
	HttpStatus,
	Logger,
	Get,
	Query,
	UseGuards,
	Headers,
	UnauthorizedException,
} from '@nestjs/common';
import {
	ApiTags,
	ApiOperation,
	ApiResponse,
	ApiBody,
	ApiQuery,
	ApiBearerAuth,
	ApiHeader,
} from '@nestjs/swagger';
import { WebhookService } from './webhook.service';
import {
	WebhookDepositEventDto,
	WebhookEventResponseDto,
	PixPaymentWebhookDto,
} from '../common/dto/webhook.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('webhooks')
@Controller({ path: 'webhooks', version: '1' })
export class WebhookController {
	private readonly logger = new Logger(WebhookController.name);

	constructor(private readonly webhookService: WebhookService) {}

	@Post('deposit')
	@Public() // Webhooks should be public endpoints
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: 'Receive deposit webhook events from Eulen API',
		description:
			'This endpoint receives webhook notifications when deposit transactions are processed by Eulen/Fitbank',
	})
	@ApiHeader({
		name: 'Authorization',
		description: 'Basic authorization with webhook secret',
		required: true,
	})
	@ApiBody({
		type: WebhookDepositEventDto,
		description: 'Deposit event data from Eulen API',
	})
	@ApiResponse({
		status: 200,
		description: 'Webhook processed successfully',
		type: WebhookEventResponseDto,
	})
	@ApiResponse({
		status: 401,
		description: 'Unauthorized - invalid webhook secret',
	})
	@ApiResponse({
		status: 400,
		description: 'Bad request - invalid webhook data',
	})
	@ApiResponse({
		status: 404,
		description: 'Transaction not found for the provided qrId',
	})
	async receiveDepositWebhook(
		@Headers('authorization') authorization: string,
		@Body() eventData: any,
	): Promise<WebhookEventResponseDto> {
		this.logger.log(
			`🔔 WEBHOOK ENDPOINT: Received deposit webhook`,
		);
		this.logger.log(
			`📦 Raw webhook payload: ${JSON.stringify(eventData, null, 2)}`,
		);

		// Validate webhook authorization
		await this.validateWebhookAuth(authorization);

		// Check if the payload is wrapped in a "response" object (Eulen format)
		const actualData = eventData.response || eventData;

		this.logger.log(
			`🔍 Processed qrId: ${actualData.qrId}`,
		);

		return await this.webhookService.processDepositWebhook(actualData);
	}

	/**
	 * Validate webhook authorization using Basic Auth
	 * Eulen sends: Authorization: Basic base64(secret:)
	 */
	private async validateWebhookAuth(authHeader: string): Promise<void> {
		if (!authHeader) {
			this.logger.error('🔒 WEBHOOK AUTH: Missing Authorization header');
			throw new UnauthorizedException('Missing authorization header');
		}

		// Get webhook secret from service
		const isValid = await this.webhookService.validateWebhookSecret(authHeader);

		if (!isValid) {
			this.logger.error('🔒 WEBHOOK AUTH: Invalid webhook secret');
			throw new UnauthorizedException('Invalid webhook secret');
		}

		this.logger.log('✅ WEBHOOK AUTH: Valid webhook signature');
	}

	@Get('stats')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Get webhook processing statistics',
		description:
			'Returns statistics about webhook events processed by the system (Admin only)',
	})
	@ApiQuery({
		name: 'startDate',
		required: false,
		description: 'Start date for statistics (ISO 8601 format)',
		example: '2025-01-01T00:00:00Z',
	})
	@ApiQuery({
		name: 'endDate',
		required: false,
		description: 'End date for statistics (ISO 8601 format)',
		example: '2025-12-31T23:59:59Z',
	})
	@ApiResponse({
		status: 200,
		description: 'Webhook statistics retrieved successfully',
	})
	async getWebhookStats(
		@Query('startDate') startDate?: string,
		@Query('endDate') endDate?: string,
	) {
		const start = startDate ? new Date(startDate) : undefined;
		const end = endDate ? new Date(endDate) : undefined;

		return await this.webhookService.getWebhookStats(start, end);
	}

	@Post('test')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: 'Test webhook endpoint with sample data',
		description:
			'Allows admins to test the webhook functionality with sample data (Admin only)',
	})
	@ApiBody({
		type: WebhookDepositEventDto,
		description: 'Test webhook data',
	})
	@ApiResponse({
		status: 200,
		description: 'Test webhook processed successfully',
	})
	async testWebhook(
		@Body() eventData: WebhookDepositEventDto,
	): Promise<WebhookEventResponseDto> {
		this.logger.log(
			`🧪 TEST WEBHOOK: Processing test event for qrId: ${eventData.qrId}`,
		);

		return await this.webhookService.processDepositWebhook(eventData);
	}

	@Post('bot/level-update')
	@Public() // Bot webhooks should be public endpoints
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: 'Receive level update webhook from Atlas Bridge Bot',
		description:
			'This endpoint receives webhook notifications when user levels are updated in the bot system',
	})
	@ApiResponse({
		status: 200,
		description: 'Bot level update webhook processed successfully',
	})
	@ApiResponse({
		status: 400,
		description: 'Bad request - invalid webhook data',
	})
	async receiveBotLevelUpdate(
		@Body() eventData: any,
	): Promise<WebhookEventResponseDto> {
		this.logger.log(
			`🤖 BOT WEBHOOK: Received level update for user: ${eventData.userId}`,
		);

		return await this.webhookService.processBotLevelUpdate(eventData);
	}

	@Post('bot/transaction-sync')
	@Public() // Bot webhooks should be public endpoints
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: 'Receive transaction sync webhook from Atlas Bridge Bot',
		description:
			'This endpoint receives webhook notifications when transactions need to be synced from bot to Atlas Painel',
	})
	@ApiResponse({
		status: 200,
		description: 'Bot transaction sync webhook processed successfully',
	})
	@ApiResponse({
		status: 400,
		description: 'Bad request - invalid webhook data',
	})
	async receiveBotTransactionSync(
		@Body() eventData: any,
	): Promise<WebhookEventResponseDto> {
		this.logger.log(
			`🤖 BOT WEBHOOK: Received transaction sync for user: ${eventData.userId}`,
		);

		return await this.webhookService.processBotTransactionSync(eventData);
	}

	@Post('bot/user-link')
	@Public() // Bot webhooks should be public endpoints
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: 'Receive user linking webhook from Atlas Bridge Bot',
		description:
			'This endpoint receives webhook notifications when users are linked between bot and Atlas Painel',
	})
	@ApiResponse({
		status: 200,
		description: 'Bot user linking webhook processed successfully',
	})
	@ApiResponse({
		status: 400,
		description: 'Bad request - invalid webhook data',
	})
	async receiveBotUserLink(
		@Body() eventData: any,
	): Promise<WebhookEventResponseDto> {
		this.logger.log(
			`🤖 BOT WEBHOOK: Received user link for EUID: ${eventData.euid}`,
		);

		return await this.webhookService.processBotUserLink(eventData);
	}

	@Get('bot/status')
	@Public() // Bot status should be publicly accessible
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: 'Get bot integration status',
		description:
			'Returns the current status of the bot integration and sync service',
	})
	@ApiResponse({
		status: 200,
		description: 'Bot integration status retrieved successfully',
	})
	async getBotStatus() {
		this.logger.log('🤖 BOT WEBHOOK: Status check requested');

		return await this.webhookService.getBotStatus();
	}

	@Post('pix/payment-received')
	@Public() // PIX webhooks should be public endpoints
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: 'Receive PIX payment notification webhook',
		description:
			'This endpoint receives webhook notifications when PIX payments are completed by banks',
	})
	@ApiBody({
		type: PixPaymentWebhookDto,
		description: 'PIX payment event data from bank',
	})
	@ApiResponse({
		status: 200,
		description: 'PIX payment webhook processed successfully',
		type: WebhookEventResponseDto,
	})
	@ApiResponse({
		status: 400,
		description: 'Bad request - invalid webhook data',
	})
	@ApiResponse({
		status: 404,
		description: 'User not found for the provided EUID',
	})
	async receivePixPaymentWebhook(
		@Body() eventData: PixPaymentWebhookDto,
	): Promise<WebhookEventResponseDto> {
		this.logger.log(
			`🔔 PIX WEBHOOK: Received payment notification for EUID: ${eventData.userEUID}, amount: R$ ${eventData.amount}`,
		);

		return await this.webhookService.processPixPaymentWebhook(eventData);
	}
}
