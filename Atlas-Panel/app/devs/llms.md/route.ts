import { NextResponse } from 'next/server';
import { endpoints, BASE_URL } from '../data/endpoints';
import { webhookEvents, webhookHeaders } from '../data/webhook-events';

function buildMarkdown(): string {
  const lines: string[] = [];
  const add = (s: string = '') => lines.push(s);

  add('# Atlas API Documentation');
  add();
  add('> LLM-friendly documentation for the Atlas PIX payment API.');
  add();

  // Overview
  add('## Overview');
  add();
  add('Atlas API is a REST API for accepting PIX payments in Brazil and converting to DEPIX (tokenized BRL on Liquid Network).');
  add(`Base URL: ${BASE_URL}`);
  add();
  add('Key capabilities:');
  add('- Create PIX payment QR codes');
  add('- Track transaction status in real-time');
  add('- Receive webhook notifications');
  add('- Manage reusable payment links');
  add('- View usage statistics');
  add();

  // Authentication
  add('## Authentication');
  add();
  add('All endpoints (except GET /external/health) require authentication via API Key.');
  add('Include the header `X-API-Key: <your_api_key>` in every request.');
  add();
  add('API Keys have the prefix `atlas_` followed by a 64-character hex string.');
  add('Example: `atlas_943cb2cc2421eac94e7ac5e59a5a8f88f4080de4402b6381c5c4e5598260bda2`');
  add();
  add('### How to get an API Key');
  add();
  add('1. Create an account at https://painel.atlasdao.info/register');
  add('2. Enable Commerce Mode in Settings');
  add('3. Go to Settings > API (https://painel.atlasdao.info/settings) and generate your key');
  add();

  // Rate limits
  add('## Rate Limits');
  add();
  add('- 100 requests per minute per API Key');
  add('- 10,000 requests per day per API Key');
  add('- Exceeding the limit returns HTTP 429');
  add();

  // Error format
  add('## Error Response Format');
  add();
  add('All errors follow this structure:');
  add('```json');
  add(JSON.stringify({
    statusCode: 400,
    message: 'Description of what went wrong',
    error: 'Bad Request',
  }, null, 2));
  add('```');
  add();
  add('For validation errors, `message` may be an array of validation messages.');
  add();

  // Transaction statuses
  add('## Transaction Statuses');
  add();
  add('- `PENDING` - Transaction created, awaiting PIX payment');
  add('- `COMPLETED` - Payment confirmed and processed');
  add('- `FAILED` - Payment processing failed');
  add('- `EXPIRED` - QR Code expired without payment (typically 30 minutes)');
  add('- `CANCELLED` - Transaction cancelled by the user via API');
  add();

  // Endpoints
  add('## Endpoints');
  add();

  for (const ep of endpoints) {
    add(`### ${ep.method} ${ep.path}`);
    add();
    add(ep.description);
    if (ep.isPublic) add('**Public endpoint** - no authentication required.');
    add();

    if (ep.pathParams && ep.pathParams.length > 0) {
      add('**Path Parameters:**');
      for (const p of ep.pathParams) {
        const ex = p.example ? ` (e.g. \`${p.example}\`)` : '';
        add(`- \`${p.name}\` (${p.type}, ${p.required ? 'required' : 'optional'}): ${p.description}${ex}`);
      }
      add();
    }

    if (ep.queryParams && ep.queryParams.length > 0) {
      add('**Query Parameters:**');
      for (const p of ep.queryParams) {
        const ex = p.example ? ` (e.g. \`${p.example}\`)` : '';
        add(`- \`${p.name}\` (${p.type}, ${p.required ? 'required' : 'optional'}): ${p.description}${ex}`);
      }
      add();
    }

    if (ep.bodyParams && ep.bodyParams.length > 0) {
      add('**Request Body (JSON):**');
      for (const p of ep.bodyParams) {
        const ex = p.example ? ` (e.g. \`${p.example}\`)` : '';
        add(`- \`${p.name}\` (${p.type}, ${p.required ? 'required' : 'optional'}): ${p.description}${ex}`);
      }
      add();
    }

    add('**Response Example:**');
    add('```json');
    add(ep.responseExample);
    add('```');
    add();

    add('**Status Codes:**');
    for (const sc of ep.statusCodes) {
      add(`- ${sc.code}: ${sc.description}`);
    }
    add();
    add('---');
    add();
  }

  // Webhooks
  add('## Webhooks');
  add();
  add('Webhooks are configured inline when creating a PIX transaction (POST /external/pix/create), via the `webhook` field.');
  add();
  add('### Webhook Configuration Fields');
  add('- `url` (string, required): URL to receive notifications (HTTPS in production)');
  add('- `events` (string[], required): Events to subscribe to');
  add('- `secret` (string, optional): HMAC secret (min 16 chars). Auto-generated if omitted');
  add('- `headers` (object, optional): Custom headers to send with webhook');
  add();

  add('### Webhook Headers');
  add();
  for (const h of webhookHeaders) {
    add(`- \`${h.name}\`: ${h.description}`);
  }
  add();

  add('### Webhook Events');
  add();
  for (const event of webhookEvents) {
    add(`#### ${event.name}`);
    add();
    add(event.description);
    add();
    add('```json');
    add(event.payloadExample);
    add('```');
    add();
  }

  // Security
  add('### HMAC Signature Verification');
  add();
  add('The `X-Atlas-Signature` header contains `sha256=<hmac_hex>`.');
  add('Compute HMAC-SHA256 of the raw request body using your webhook secret and compare.');
  add();
  add('### Webhook Delivery Details');
  add();
  add('- Timeout: 15 seconds per delivery attempt');
  add('- Retry: 1 retry after 60 seconds on failure');
  add('- A response with HTTP status 2xx is considered successful');
  add('- Non-2xx responses are logged as failed deliveries');
  add('- Webhook URLs must use HTTPS in production');
  add('- Private/localhost URLs are blocked in production');
  add();

  // Status codes
  add('## HTTP Status Codes');
  add();
  add('- 200: Success');
  add('- 201: Created');
  add('- 400: Bad Request');
  add('- 401: Unauthorized (invalid/missing API Key)');
  add('- 403: Forbidden');
  add('- 404: Not Found');
  add('- 409: Conflict');
  add('- 429: Rate Limit Exceeded');
  add('- 500: Internal Server Error');
  add();

  // Links
  add('## Links');
  add();
  add('- Human docs: https://painel.atlasdao.info/devs');
  add('- Status page: https://painel.atlasdao.info/status');
  add('- Create account: https://painel.atlasdao.info/register');

  return lines.join('\n');
}

export async function GET() {
  const markdown = buildMarkdown();
  return new NextResponse(markdown, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
