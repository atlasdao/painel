export const WEBHOOK_EVENTS = [
  'payment.created',
  'payment.processing',
  'payment.completed',
  'payment.failed',
  'payment.refunded',
  'payment.expired',
] as const;

export type WebhookEventType = typeof WEBHOOK_EVENTS[number];

export interface WebhookConfig {
  id?: string;
  name: string;
  url: string;
  events: WebhookEventType[];
  active?: boolean;
  headers?: Record<string, string>;
  retryPolicy?: {
    maxRetries?: number;
    retryDelay?: number;
  };
}

export interface Webhook extends WebhookConfig {
  id: string;
  paymentLinkId: string;
  secret?: string;
  lastTriggeredAt?: Date;
  failureCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookEvent {
  id: string;
  paymentLinkId: string;
  webhookId: string;
  eventType: string;
  payload: any;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
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

export const webhookEventDescriptions: Record<WebhookEventType, string> = {
  'payment.created': 'Quando um pagamento é criado',
  'payment.processing': 'Quando o pagamento está sendo processado',
  'payment.completed': 'Quando o pagamento é concluído com sucesso',
  'payment.failed': 'Quando o pagamento falha',
  'payment.refunded': 'Quando o pagamento é reembolsado',
  'payment.expired': 'Quando o pagamento expira'
};