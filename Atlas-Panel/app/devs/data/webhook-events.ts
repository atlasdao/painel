export interface WebhookEvent {
  name: string;
  description: string;
  payloadExample: string;
}

export const webhookEvents: WebhookEvent[] = [
  {
    name: 'transaction.created',
    description: 'Disparado quando uma transacao PIX e criada e o QR Code esta disponivel para pagamento.',
    payloadExample: JSON.stringify({
      event: 'transaction.created',
      data: {
        transactionId: 'txn_abc123def456',
        status: 'PENDING',
        amount: 99.90,
        merchantOrderId: 'ORD-2025-12345',
        qrCode: '00020126580014br.gov.bcb.pix0136...',
        createdAt: '2025-01-15T10:30:00.000Z',
        expiresAt: '2025-01-15T11:00:00.000Z',
      },
      timestamp: '2025-01-15T10:30:01.000Z',
      webhookId: 'wh_xyz789',
    }, null, 2),
  },
  {
    name: 'transaction.paid',
    description: 'Disparado quando o pagamento PIX e confirmado. Inclui informacoes de settlement (D+0 ou D+1).',
    payloadExample: JSON.stringify({
      event: 'transaction.paid',
      data: {
        transactionId: 'txn_abc123def456',
        status: 'COMPLETED',
        amount: 99.90,
        merchantOrderId: 'ORD-2025-12345',
        paidAt: '2025-01-15T10:35:00.000Z',
        payerInfo: {
          name: 'Joao Silva',
          taxNumber: '***456789**',
        },
        settlement: {
          type: 'instant',
          scheduledAt: null,
        },
        metadata: null,
      },
      timestamp: '2025-01-15T10:35:01.000Z',
      webhookId: 'wh_xyz789',
    }, null, 2),
  },
  {
    name: 'transaction.failed',
    description: 'Disparado quando o processamento de uma transacao falha.',
    payloadExample: JSON.stringify({
      event: 'transaction.failed',
      data: {
        transactionId: 'txn_abc123def456',
        status: 'FAILED',
        failedAt: '2025-01-15T10:40:00.000Z',
        reason: 'Transaction processing failed',
        metadata: null,
      },
      timestamp: '2025-01-15T10:40:01.000Z',
      webhookId: 'wh_xyz789',
    }, null, 2),
  },
  {
    name: 'transaction.expired',
    description: 'Disparado quando o QR Code PIX expira sem ser pago (geralmente 30 minutos).',
    payloadExample: JSON.stringify({
      event: 'transaction.expired',
      data: {
        transactionId: 'txn_abc123def456',
        status: 'EXPIRED',
        expiredAt: '2025-01-15T11:00:00.000Z',
        amount: 99.90,
        merchantOrderId: 'ORD-2025-12345',
      },
      timestamp: '2025-01-15T11:00:01.000Z',
      webhookId: 'wh_xyz789',
    }, null, 2),
  },
  {
    name: 'transaction.refunded',
    description: 'Disparado quando uma transacao e reembolsada ao pagador.',
    payloadExample: JSON.stringify({
      event: 'transaction.refunded',
      data: {
        transactionId: 'txn_abc123def456',
        status: 'REFUNDED',
        refundedAt: '2025-01-16T14:00:00.000Z',
        amount: 99.90,
        merchantOrderId: 'ORD-2025-12345',
      },
      timestamp: '2025-01-16T14:00:01.000Z',
      webhookId: 'wh_xyz789',
    }, null, 2),
  },
];

export const webhookHeaders = [
  { name: 'Content-Type', value: 'application/json', description: 'Tipo de conteudo do payload' },
  { name: 'X-Atlas-Event', value: 'transaction.paid', description: 'Nome do evento disparado' },
  { name: 'X-Atlas-Webhook-Id', value: 'wh_xyz789', description: 'ID do webhook configurado' },
  { name: 'X-Atlas-Signature', value: 'sha256=abc123...', description: 'Assinatura HMAC-SHA256 para verificacao' },
];
