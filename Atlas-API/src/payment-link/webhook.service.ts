import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionUtil } from '../common/utils/encryption.util';
import {
  CreateWebhookDto,
  UpdateWebhookDto,
  WebhookResponseDto,
  WebhookEventType,
  WebhookEventResponseDto
} from './dto/webhook.dto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly encryptionUtil: EncryptionUtil,
  ) {}

  async createWebhook(
    paymentLinkId: string,
    userId: string,
    dto: CreateWebhookDto,
  ): Promise<WebhookResponseDto> {
    // Verificar se o link de pagamento pertence ao usuário
    const paymentLink = await this.prisma.paymentLink.findFirst({
      where: {
        id: paymentLinkId,
        userId,
      },
    });

    if (!paymentLink) {
      throw new HttpException(
        'Link de pagamento não encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    // Validar URL do webhook (não permitir localhost ou IPs privados em produção)
    this.validateWebhookUrl(dto.url);

    // Gerar secret para validação de assinatura
    const secret = this.generateWebhookSecret();
    const encryptedSecret = this.encryptionUtil.encrypt(secret) || '';

    // Criar webhook (excluindo o id do DTO se fornecido)
    const { id: _, ...webhookData } = dto;
    const webhook = await this.prisma.paymentLinkWebhook.create({
      data: {
        paymentLinkId,
        name: webhookData.name,
        url: webhookData.url,
        events: webhookData.events,
        active: webhookData.active ?? true,
        secret: encryptedSecret,
        headers: webhookData.headers || {},
        retryPolicy: webhookData.retryPolicy || {
          maxRetries: 3,
          retryDelay: 1000,
        },
      },
    });

    return {
      ...webhook,
      secret, // Retornar o secret não criptografado apenas na criação
      lastTriggeredAt: webhook.lastTriggeredAt || undefined,
    };
  }

  async getWebhooks(
    paymentLinkId: string,
    userId: string,
  ): Promise<WebhookResponseDto[]> {
    // Verificar se o link de pagamento pertence ao usuário
    const paymentLink = await this.prisma.paymentLink.findFirst({
      where: {
        id: paymentLinkId,
        userId,
      },
      include: {
        webhooks: true,
      },
    });

    if (!paymentLink) {
      throw new HttpException(
        'Link de pagamento não encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    // Não retornar o secret nas listagens
    return paymentLink.webhooks.map(webhook => ({
      ...webhook,
      secret: '***', // Ocultar o secret
      lastTriggeredAt: webhook.lastTriggeredAt || undefined,
    }));
  }

  async getWebhookById(
    webhookId: string,
    userId: string,
  ): Promise<WebhookResponseDto> {
    const webhook = await this.prisma.paymentLinkWebhook.findFirst({
      where: {
        id: webhookId,
        paymentLink: {
          userId,
        },
      },
    });

    if (!webhook) {
      throw new HttpException(
        'Webhook não encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      ...webhook,
      secret: '***', // Ocultar o secret
      lastTriggeredAt: webhook.lastTriggeredAt || undefined,
    };
  }

  async updateWebhook(
    webhookId: string,
    userId: string,
    dto: UpdateWebhookDto,
  ): Promise<WebhookResponseDto> {
    // Verificar se o webhook pertence ao usuário
    const webhook = await this.prisma.paymentLinkWebhook.findFirst({
      where: {
        id: webhookId,
        paymentLink: {
          userId,
        },
      },
    });

    if (!webhook) {
      throw new HttpException(
        'Webhook não encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    // Validar URL se estiver sendo atualizada
    if (dto.url) {
      this.validateWebhookUrl(dto.url);
    }

    // Atualizar webhook
    const updatedWebhook = await this.prisma.paymentLinkWebhook.update({
      where: { id: webhookId },
      data: {
        name: dto.name,
        url: dto.url,
        events: dto.events,
        active: dto.active,
        headers: dto.headers,
        retryPolicy: dto.retryPolicy,
      },
    });

    return {
      ...updatedWebhook,
      secret: '***',
      lastTriggeredAt: updatedWebhook.lastTriggeredAt || undefined,
    };
  }

  async deleteWebhook(
    webhookId: string,
    userId: string,
  ): Promise<void> {
    // Verificar se o webhook pertence ao usuário
    const webhook = await this.prisma.paymentLinkWebhook.findFirst({
      where: {
        id: webhookId,
        paymentLink: {
          userId,
        },
      },
    });

    if (!webhook) {
      throw new HttpException(
        'Webhook não encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.prisma.paymentLinkWebhook.delete({
      where: { id: webhookId },
    });
  }

  async testWebhook(
    webhookId: string,
    userId: string,
    eventType: WebhookEventType = 'payment.completed',
  ): Promise<{ success: boolean; response?: any; error?: string }> {
    // Verificar se o webhook pertence ao usuário
    const webhook = await this.prisma.paymentLinkWebhook.findFirst({
      where: {
        id: webhookId,
        paymentLink: {
          userId,
        },
      },
      include: {
        paymentLink: true,
      },
    });

    if (!webhook) {
      throw new HttpException(
        'Webhook não encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    // Criar payload de teste
    const testPayload = {
      id: `test_${Date.now()}`,
      type: eventType,
      timestamp: new Date().toISOString(),
      data: {
        paymentId: 'test_payment_123',
        paymentLinkId: webhook.paymentLinkId,
        amount: 100.00,
        currency: 'BRL',
        status: 'COMPLETED',
        customer: {
          name: 'Cliente Teste',
          email: 'teste@example.com',
          document: '12345678900',
        },
        metadata: {
          test: true,
        },
      },
    };

    // Gerar assinatura
    const decryptedSecret = this.encryptionUtil.decrypt(webhook.secret) || '';
    const signature = this.generateSignature(testPayload, decryptedSecret);

    try {
      const response = await this.sendWebhookRequest(
        webhook.url,
        testPayload,
        signature,
        webhook.headers as Record<string, string>,
      );

      return {
        success: true,
        response: {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
          headers: response.headers,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async triggerWebhookEvent(
    paymentLinkId: string,
    eventType: WebhookEventType,
    paymentData: any,
  ): Promise<void> {
    // Buscar webhooks ativos para este link de pagamento e evento
    const webhooks = await this.prisma.paymentLinkWebhook.findMany({
      where: {
        paymentLinkId,
        active: true,
        events: {
          has: eventType,
        },
      },
    });

    // Criar eventos de webhook para cada webhook configurado
    for (const webhook of webhooks) {
      const payload = {
        id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        type: eventType,
        timestamp: new Date().toISOString(),
        data: paymentData,
      };

      // Gerar assinatura
      const decryptedSecret = this.encryptionUtil.decrypt(webhook.secret) || '';
      const signature = this.generateSignature(payload, decryptedSecret);

      // Criar evento no banco
      await this.prisma.paymentLinkWebhookEvent.create({
        data: {
          paymentLinkId,
          webhookId: webhook.id,
          eventType,
          payload,
          signature,
          status: 'PENDING',
          nextRetryAt: new Date(), // Processar imediatamente
        },
      });
    }

    // Processar eventos pendentes (pode ser movido para um job/queue)
    this.processPendingWebhooks();
  }

  async processPendingWebhooks(): Promise<void> {
    // Buscar eventos pendentes para processar
    // Usar raw query para comparar attempts < maxAttempts
    const events = await this.prisma.paymentLinkWebhookEvent.findMany({
      where: {
        status: 'PENDING',
        OR: [
          { nextRetryAt: null },
          { nextRetryAt: { lte: new Date() } },
        ],
      },
      include: {
        webhook: true,
      },
      take: 50, // Processar mais eventos por vez, filtraremos depois
    });

    // Filtrar eventos que ainda podem ser reprocessados
    const eligibleEvents = events.filter(event => event.attempts < event.maxAttempts);

    for (const event of eligibleEvents) {
      await this.processWebhookEvent(event);
    }
  }

  private async processWebhookEvent(event: any): Promise<void> {
    const { webhook } = event;

    try {
      // Enviar requisição
      const response = await this.sendWebhookRequest(
        webhook.url,
        event.payload,
        event.signature,
        webhook.headers as Record<string, string>,
      );

      // Atualizar evento como sucesso
      await this.prisma.paymentLinkWebhookEvent.update({
        where: { id: event.id },
        data: {
          status: 'SUCCESS',
          attempts: event.attempts + 1,
          lastAttemptAt: new Date(),
          responseCode: response.status,
          responseBody: JSON.stringify(response.data).substring(0, 1000), // Limitar tamanho
        },
      });

      // Atualizar webhook com último trigger
      await this.prisma.paymentLinkWebhook.update({
        where: { id: webhook.id },
        data: {
          lastTriggeredAt: new Date(),
          failureCount: 0, // Resetar contador de falhas
        },
      });
    } catch (error) {
      const attempts = event.attempts + 1;
      const retryPolicy = webhook.retryPolicy as any || { maxRetries: 3, retryDelay: 1000 };

      // Calcular próximo retry com backoff exponencial
      const nextRetryDelay = retryPolicy.retryDelay * Math.pow(2, attempts);
      const nextRetryAt = attempts < event.maxAttempts
        ? new Date(Date.now() + nextRetryDelay)
        : null;

      // Atualizar evento com falha
      await this.prisma.paymentLinkWebhookEvent.update({
        where: { id: event.id },
        data: {
          status: attempts >= event.maxAttempts ? 'FAILED' : 'PENDING',
          attempts,
          lastAttemptAt: new Date(),
          responseCode: error.response?.status || 0,
          responseBody: error.message,
          nextRetryAt,
        },
      });

      // Incrementar contador de falhas do webhook
      await this.prisma.paymentLinkWebhook.update({
        where: { id: webhook.id },
        data: {
          failureCount: (webhook.failureCount || 0) + 1,
        },
      });

      this.logger.error(`Webhook event ${event.id} failed: ${error.message}`);
    }
  }

  private async sendWebhookRequest(
    url: string,
    payload: any,
    signature: string,
    customHeaders?: Record<string, string>,
  ): Promise<any> {
    const headers = {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Webhook-Timestamp': Date.now().toString(),
      ...customHeaders,
    };

    const response = await firstValueFrom(
      this.httpService.post(url, payload, {
        headers,
        timeout: 30000, // 30 segundos
      }),
    );

    return response;
  }

  private generateSignature(payload: any, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
  }

  private generateWebhookSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private validateWebhookUrl(url: string): void {
    const parsedUrl = new URL(url);

    // Em produção, não permitir localhost ou IPs privados
    if (process.env.NODE_ENV === 'production') {
      const hostname = parsedUrl.hostname.toLowerCase();

      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.')
      ) {
        throw new HttpException(
          'URL do webhook inválida. Não é permitido usar localhost ou IPs privados.',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // Verificar se é HTTPS em produção
    if (process.env.NODE_ENV === 'production' && parsedUrl.protocol !== 'https:') {
      throw new HttpException(
        'URL do webhook deve usar HTTPS em produção',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getWebhookEvents(
    paymentLinkId: string,
    userId: string,
    webhookId?: string,
  ): Promise<WebhookEventResponseDto[]> {
    // Verificar se o link de pagamento pertence ao usuário
    const paymentLink = await this.prisma.paymentLink.findFirst({
      where: {
        id: paymentLinkId,
        userId,
      },
    });

    if (!paymentLink) {
      throw new HttpException(
        'Link de pagamento não encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    const where: any = { paymentLinkId };
    if (webhookId) {
      where.webhookId = webhookId;
    }

    const events = await this.prisma.paymentLinkWebhookEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100, // Limitar a 100 eventos mais recentes
    });

    return events.map(event => ({
      ...event,
      lastAttemptAt: event.lastAttemptAt || undefined,
      responseCode: event.responseCode || undefined,
      responseBody: event.responseBody || undefined,
      nextRetryAt: event.nextRetryAt || undefined,
      signature: event.signature || undefined,
    }));
  }
}