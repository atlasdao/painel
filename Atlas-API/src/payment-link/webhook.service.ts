import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionUtil } from '../common/utils/encryption.util';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import {
	CreateWebhookDto,
	UpdateWebhookDto,
	WebhookResponseDto,
} from './dto/webhook.dto';

@Injectable()
export class WebhookService {
	private readonly logger = new Logger(WebhookService.name);

	constructor(
		private prisma: PrismaService,
		private encryptionUtil: EncryptionUtil,
		private httpService: HttpService,
	) {}

	async create(
		paymentLinkId: string,
		userId: string,
		dto: CreateWebhookDto,
	): Promise<WebhookResponseDto> {
		// Verify payment link exists and belongs to user
		const paymentLink = await this.prisma.paymentLink.findFirst({
			where: {
				id: paymentLinkId,
				userId: userId,
			},
		});

		if (!paymentLink) {
			throw new HttpException(
				'Payment link not found',
				HttpStatus.NOT_FOUND,
			);
		}

		// Encrypt secret if provided
		let encryptedSecret: string | null = null;
		if (dto.secret && dto.secret.trim()) {
			encryptedSecret = this.encryptionUtil.encrypt(dto.secret);
		}

		const webhook = await this.prisma.paymentLinkWebhook.create({
			data: {
				paymentLinkId,
				name: `Webhook ${new Date().toISOString()}`,
				url: dto.url,
				events: dto.events,
				secret: encryptedSecret,
				active: true,
			},
		});

		return this.mapToResponseDto(webhook);
	}

	async findByPaymentLinkId(
		paymentLinkId: string,
		userId: string,
	): Promise<WebhookResponseDto[]> {
		// Verify payment link belongs to user
		const paymentLink = await this.prisma.paymentLink.findFirst({
			where: {
				id: paymentLinkId,
				userId: userId,
			},
		});

		if (!paymentLink) {
			throw new HttpException(
				'Payment link not found',
				HttpStatus.NOT_FOUND,
			);
		}

		const webhooks = await this.prisma.paymentLinkWebhook.findMany({
			where: {
				paymentLinkId,
			},
			orderBy: {
				createdAt: 'desc',
			},
		});

		return webhooks.map((webhook) => this.mapToResponseDto(webhook));
	}

	async update(
		id: string,
		paymentLinkId: string,
		userId: string,
		dto: UpdateWebhookDto,
	): Promise<WebhookResponseDto> {
		// Verify webhook exists and belongs to user's payment link
		const webhook = await this.prisma.paymentLinkWebhook.findFirst({
			where: {
				id,
				paymentLinkId,
				paymentLink: {
					userId,
				},
			},
		});

		if (!webhook) {
			throw new HttpException('Webhook not found', HttpStatus.NOT_FOUND);
		}

		// Prepare update data
		const updateData: any = {};

		if (dto.url) updateData.url = dto.url;
		if (dto.events) updateData.events = dto.events;
		if (dto.hasOwnProperty('isActive')) updateData.active = dto.isActive;

		// Handle secret encryption
		if (dto.secret !== undefined) {
			if (dto.secret === '') {
				updateData.secret = null;
			} else {
				updateData.secret = this.encryptionUtil.encrypt(dto.secret);
			}
		}

		const updatedWebhook = await this.prisma.paymentLinkWebhook.update({
			where: { id },
			data: updateData,
		});

		return this.mapToResponseDto(updatedWebhook);
	}

	async delete(
		id: string,
		paymentLinkId: string,
		userId: string,
	): Promise<void> {
		// Verify webhook exists and belongs to user's payment link
		const webhook = await this.prisma.paymentLinkWebhook.findFirst({
			where: {
				id,
				paymentLinkId,
				paymentLink: {
					userId,
				},
			},
		});

		if (!webhook) {
			throw new HttpException('Webhook not found', HttpStatus.NOT_FOUND);
		}

		await this.prisma.paymentLinkWebhook.delete({
			where: { id },
		});
	}

	private mapToResponseDto(webhook: any): WebhookResponseDto {
		return {
			id: webhook.id,
			url: webhook.url,
			events: webhook.events,
			isActive: webhook.active,
			secret: webhook.secret ? '••••••••' : undefined,
			createdAt: webhook.createdAt.toISOString(),
			lastTriggered: webhook.lastTriggeredAt?.toISOString(),
			status: this.getWebhookStatus(webhook),
		};
	}

	private getWebhookStatus(webhook: any): 'active' | 'failed' | 'pending' {
		if (!webhook.active) return 'pending';
		if (webhook.lastTriggeredAt) return 'active';
		return 'pending';
	}

	async triggerWebhooks(paymentLinkId: string, event: string, payload: any): Promise<void> {
		this.logger.log(`🔗 Triggering webhooks for payment link ${paymentLinkId}, event: ${event}`);

		const webhooks = await this.prisma.paymentLinkWebhook.findMany({
			where: {
				paymentLinkId,
				active: true,
			},
		});

		this.logger.log(`📡 Found ${webhooks.length} active webhooks`);

		const webhooksToTrigger = webhooks.filter(webhook =>
			webhook.events.includes(event)
		);

		this.logger.log(`🎯 Found ${webhooksToTrigger.length} webhooks for event "${event}"`);

		for (const webhook of webhooksToTrigger) {
			try {
				await this.sendWebhook(webhook, event, payload);
			} catch (error) {
				this.logger.error(`Failed to send webhook ${webhook.id}:`, error);
			}
		}
	}

	async testWebhook(
		webhookId: string,
		paymentLinkId: string,
		userId: string,
		eventType: string,
		testData?: any,
	): Promise<any> {
		// Verify webhook exists and belongs to user's payment link
		const webhook = await this.prisma.paymentLinkWebhook.findFirst({
			where: {
				id: webhookId,
				paymentLinkId,
				paymentLink: {
					userId,
				},
			},
		});

		if (!webhook) {
			throw new HttpException('Webhook not found', HttpStatus.NOT_FOUND);
		}

		// Create test payload
		const testPayload = testData || {
			paymentLinkId,
			transactionId: `test_${Date.now()}`,
			amount: 100.50,
			status: 'COMPLETED',
			timestamp: new Date().toISOString(),
			isTest: true,
		};

		try {
			const startTime = Date.now();
			await this.sendWebhook(webhook, eventType, testPayload);
			const responseTime = Date.now() - startTime;

			return {
				success: true,
				message: 'Webhook test enviado com sucesso',
				responseTime,
				httpStatus: 200,
			};
		} catch (error) {
			return {
				success: false,
				message: 'Falha ao enviar webhook test',
				error: error.message,
				httpStatus: error.response?.status || 0,
			};
		}
	}

	async validateWebhookUrl(url: string): Promise<any> {
		const messages: string[] = [];
		let urlValid = false;
		let urlAccessible = false;
		let responseTime: number | undefined;

		// Basic URL validation
		try {
			new URL(url);
			urlValid = true;
			messages.push('URL format is valid');
		} catch {
			messages.push('URL format is invalid');
		}

		// Test URL accessibility
		if (urlValid) {
			try {
				const startTime = Date.now();
				const response = await firstValueFrom(
					this.httpService.post(url, { test: true }, {
						timeout: 10000,
						headers: {
							'Content-Type': 'application/json',
							'User-Agent': 'Atlas-Webhook-Validator/1.0',
						},
					})
				);
				responseTime = Date.now() - startTime;
				urlAccessible = true;
				messages.push(`URL is accessible (${response.status})`);
			} catch (error) {
				messages.push(`URL is not accessible: ${error.message}`);
			}
		}

		return {
			urlValid,
			urlAccessible,
			responseTime,
			messages,
		};
	}

	getAvailableEvents(): any {
		const events = [
			'payment.created',
			'payment.completed',
			'payment.failed',
			'payment.expired',
			'payment.refunded',
		];

		const descriptions = {
			'payment.created': 'Disparado quando um novo pagamento é criado',
			'payment.completed': 'Disparado quando um pagamento é confirmado',
			'payment.failed': 'Disparado quando um pagamento falha',
			'payment.expired': 'Disparado quando um pagamento expira',
			'payment.refunded': 'Disparado quando um pagamento é estornado',
		};

		return {
			events,
			descriptions,
		};
	}

	private async sendWebhook(webhook: any, event: string, payload: any): Promise<void> {
		this.logger.log(`🚀 Sending webhook to ${webhook.url}`);

		const webhookPayload = {
			event,
			data: payload,
			timestamp: new Date().toISOString(),
			webhookId: webhook.id,
		};

		let headers: any = {
			'Content-Type': 'application/json',
			'User-Agent': 'Atlas-Webhook/1.0',
		};

		if (webhook.secret) {
			this.logger.log(`🔐 Webhook has secret, length: ${webhook.secret.length}`);
			try {
				const decryptedSecret = this.encryptionUtil.decrypt(webhook.secret);
				if (decryptedSecret) {
					this.logger.log(`✅ Secret decrypted successfully, length: ${decryptedSecret.length}`);
					const signature = crypto
						.createHmac('sha256', decryptedSecret)
						.update(JSON.stringify(webhookPayload))
						.digest('hex');
					headers['X-Atlas-Signature'] = `sha256=${signature}`;
					this.logger.log(`🔑 Added X-Atlas-Signature header: sha256=${signature.substring(0, 16)}...`);
				} else {
					this.logger.warn('⚠️ Secret decryption returned null/empty');
				}
			} catch (error) {
				this.logger.error('❌ Failed to decrypt webhook secret:', error);
			}
		} else {
			this.logger.log('ℹ️ No secret configured for webhook');
		}

		try {
			const response = await firstValueFrom(
				this.httpService.post(webhook.url, webhookPayload, {
					headers,
					timeout: 15000, // 15 seconds timeout
				})
			);

			this.logger.log(`✅ Webhook sent successfully to ${webhook.url}, status: ${response.status}`);

			await this.prisma.paymentLinkWebhook.update({
				where: { id: webhook.id },
				data: { lastTriggeredAt: new Date() },
			});

		} catch (error) {
			this.logger.error(`❌ Failed to send webhook to ${webhook.url}:`, error.message);

			await this.prisma.paymentLinkWebhookEvent.create({
				data: {
					webhookId: webhook.id,
					paymentLinkId: webhook.paymentLinkId,
					eventType: event,
					payload: webhookPayload,
					status: 'FAILED',
					attempts: 1,
					responseBody: error.message,
				},
			});
		}
	}
}