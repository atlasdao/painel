import {
	Controller,
	Get,
	Post,
	Delete,
	Patch,
	Body,
	Param,
	UseGuards,
	Req,
	HttpException,
	HttpStatus,
	Query,
} from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
	CreateWebhookDto,
	UpdateWebhookDto,
	WebhookResponseDto,
	WebhookTestDto,
	WebhookTestResponseDto,
	WebhookEventsDto,
	WebhookValidationDto,
} from './dto/webhook.dto';
import {
	ApiTags,
	ApiOperation,
	ApiResponse,
	ApiBearerAuth,
	ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Payment Link Webhooks')
@Controller('payment-links/:paymentLinkId/webhooks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WebhookController {
	constructor(private readonly webhookService: WebhookService) {}

	@Post()
	@ApiOperation({ summary: 'Create a new webhook for payment link' })
	@ApiResponse({
		status: 201,
		description: 'Webhook created successfully',
	})
	async createWebhook(
		@Req() req: any,
		@Param('paymentLinkId') paymentLinkId: string,
		@Body() dto: CreateWebhookDto,
	): Promise<WebhookResponseDto> {
		const userId = req.user?.id || req.user?.sub;
		if (!userId) {
			throw new HttpException(
				'User not authenticated',
				HttpStatus.UNAUTHORIZED,
			);
		}

		return await this.webhookService.create(paymentLinkId, userId, dto);
	}

	@Get()
	@ApiOperation({ summary: 'Get all webhooks for payment link' })
	@ApiResponse({ status: 200, description: 'Returns all webhooks' })
	async getWebhooks(
		@Req() req: any,
		@Param('paymentLinkId') paymentLinkId: string,
	): Promise<WebhookResponseDto[]> {
		const userId = req.user?.id || req.user?.sub;
		if (!userId) {
			throw new HttpException(
				'User not authenticated',
				HttpStatus.UNAUTHORIZED,
			);
		}

		return this.webhookService.findByPaymentLinkId(paymentLinkId, userId);
	}

	@Patch(':id')
	@ApiOperation({ summary: 'Update a webhook' })
	@ApiResponse({
		status: 200,
		description: 'Webhook updated successfully',
	})
	async updateWebhook(
		@Req() req: any,
		@Param('paymentLinkId') paymentLinkId: string,
		@Param('id') id: string,
		@Body() dto: UpdateWebhookDto,
	): Promise<WebhookResponseDto> {
		const userId = req.user?.id || req.user?.sub;
		if (!userId) {
			throw new HttpException(
				'User not authenticated',
				HttpStatus.UNAUTHORIZED,
			);
		}

		return await this.webhookService.update(id, paymentLinkId, userId, dto);
	}

	@Delete(':id')
	@ApiOperation({ summary: 'Delete a webhook' })
	@ApiResponse({
		status: 200,
		description: 'Webhook deleted successfully',
	})
	async deleteWebhook(
		@Req() req: any,
		@Param('paymentLinkId') paymentLinkId: string,
		@Param('id') id: string,
	): Promise<{ message: string }> {
		const userId = req.user?.id || req.user?.sub;
		if (!userId) {
			throw new HttpException(
				'User not authenticated',
				HttpStatus.UNAUTHORIZED,
			);
		}

		await this.webhookService.delete(id, paymentLinkId, userId);
		return { message: 'Webhook deleted successfully' };
	}

	@Post(':id/test')
	@ApiOperation({ summary: 'Test a webhook endpoint' })
	@ApiResponse({
		status: 200,
		description: 'Webhook test executed',
		type: WebhookTestResponseDto,
	})
	async testWebhook(
		@Req() req: any,
		@Param('paymentLinkId') paymentLinkId: string,
		@Param('id') id: string,
		@Body() dto: WebhookTestDto,
	): Promise<WebhookTestResponseDto> {
		const userId = req.user?.id || req.user?.sub;
		if (!userId) {
			throw new HttpException(
				'User not authenticated',
				HttpStatus.UNAUTHORIZED,
			);
		}

		return await this.webhookService.testWebhook(
			id,
			paymentLinkId,
			userId,
			dto.eventType,
			dto.testData,
		);
	}

	@Post('validate-url')
	@ApiOperation({ summary: 'Validate webhook URL accessibility' })
	@ApiResponse({
		status: 200,
		description: 'URL validation completed',
		type: WebhookValidationDto,
	})
	async validateWebhookUrl(
		@Req() req: any,
		@Body('url') url: string,
	): Promise<WebhookValidationDto> {
		const userId = req.user?.id || req.user?.sub;
		if (!userId) {
			throw new HttpException(
				'User not authenticated',
				HttpStatus.UNAUTHORIZED,
			);
		}

		if (!url) {
			throw new HttpException('URL is required', HttpStatus.BAD_REQUEST);
		}

		return await this.webhookService.validateWebhookUrl(url);
	}

	@Get('events')
	@ApiOperation({ summary: 'Get available webhook events' })
	@ApiResponse({
		status: 200,
		description: 'Returns available webhook events',
		type: WebhookEventsDto,
	})
	async getAvailableEvents(): Promise<WebhookEventsDto> {
		return this.webhookService.getAvailableEvents();
	}
}