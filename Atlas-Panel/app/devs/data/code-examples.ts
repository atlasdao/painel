export type Language = 'curl' | 'javascript' | 'python';

export interface CodeExample {
  curl: string;
  javascript: string;
  python: string;
}

const BASE = 'https://api.atlasdao.info/api/v1';

export const codeExamples: Record<string, CodeExample> = {
  'health-check': {
    curl: `curl ${BASE}/external/health`,
    javascript: `const response = await fetch('${BASE}/external/health');
const data = await response.json();
console.log(data.status); // "ok"`,
    python: `import requests

response = requests.get('${BASE}/external/health')
data = response.json()
print(data['status'])  # "ok"`,
  },

  'perfil': {
    curl: `curl ${BASE}/external/profile \\
  -H "X-API-Key: SUA_API_KEY"`,
    javascript: `const response = await fetch('${BASE}/external/profile', {
  headers: {
    'X-API-Key': 'SUA_API_KEY'
  }
});

const profile = await response.json();
console.log(profile.username);`,
    python: `import requests

response = requests.get(
    '${BASE}/external/profile',
    headers={'X-API-Key': 'SUA_API_KEY'}
)

profile = response.json()
print(profile['username'])`,
  },

  'criar-transacao': {
    curl: `curl -X POST ${BASE}/external/pix/create \\
  -H "X-API-Key: SUA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 99.90,
    "description": "Pagamento pedido #123",
    "depixAddress": "lq1qq...",
    "merchantOrderId": "ORD-2025-12345",
    "webhook": {
      "url": "https://meusite.com/webhook",
      "events": ["transaction.paid", "transaction.failed"],
      "secret": "minha-chave-secreta-min-16-chars"
    }
  }'`,
    javascript: `const response = await fetch('${BASE}/external/pix/create', {
  method: 'POST',
  headers: {
    'X-API-Key': 'SUA_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: 99.90,
    description: 'Pagamento pedido #123',
    depixAddress: 'lq1qq...',
    merchantOrderId: 'ORD-2025-12345',
    webhook: {
      url: 'https://meusite.com/webhook',
      events: ['transaction.paid', 'transaction.failed'],
      secret: 'minha-chave-secreta-min-16-chars'
    }
  })
});

const pix = await response.json();
console.log('QR Code:', pix.qrCode);
console.log('Expira em:', pix.expiresAt);`,
    python: `import requests

response = requests.post(
    '${BASE}/external/pix/create',
    headers={
        'X-API-Key': 'SUA_API_KEY',
        'Content-Type': 'application/json'
    },
    json={
        'amount': 99.90,
        'description': 'Pagamento pedido #123',
        'depixAddress': 'lq1qq...',
        'merchantOrderId': 'ORD-2025-12345',
        'webhook': {
            'url': 'https://meusite.com/webhook',
            'events': ['transaction.paid', 'transaction.failed'],
            'secret': 'minha-chave-secreta-min-16-chars'
        }
    }
)

pix = response.json()
print(f"QR Code: {pix['qrCode']}")
print(f"Expira em: {pix['expiresAt']}")`,
  },

  'status-transacao': {
    curl: `curl ${BASE}/external/pix/status/txn_abc123def456 \\
  -H "X-API-Key: SUA_API_KEY"`,
    javascript: `const txId = 'txn_abc123def456';
const response = await fetch(\`${BASE}/external/pix/status/\${txId}\`, {
  headers: {
    'X-API-Key': 'SUA_API_KEY'
  }
});

const tx = await response.json();
console.log('Status:', tx.status);`,
    python: `import requests

tx_id = 'txn_abc123def456'
response = requests.get(
    f'${BASE}/external/pix/status/{tx_id}',
    headers={'X-API-Key': 'SUA_API_KEY'}
)

tx = response.json()
print(f"Status: {tx['status']}")`,
  },

  'listar-transacoes': {
    curl: `curl "${BASE}/external/pix/transactions?status=COMPLETED&page=1&limit=20" \\
  -H "X-API-Key: SUA_API_KEY"`,
    javascript: `const params = new URLSearchParams({
  status: 'COMPLETED',
  page: '1',
  limit: '20'
});

const response = await fetch(\`${BASE}/external/pix/transactions?\${params}\`, {
  headers: {
    'X-API-Key': 'SUA_API_KEY'
  }
});

const { data, pagination } = await response.json();
console.log(\`Pagina \${pagination.page} de \${pagination.totalPages}\`);
data.forEach(tx => console.log(tx.id, tx.amount));`,
    python: `import requests

response = requests.get(
    '${BASE}/external/pix/transactions',
    headers={'X-API-Key': 'SUA_API_KEY'},
    params={
        'status': 'COMPLETED',
        'page': 1,
        'limit': 20
    }
)

result = response.json()
for tx in result['data']:
    print(f"{tx['id']}: R$ {tx['amount']}")`,
  },

  'cancelar-transacao': {
    curl: `curl -X DELETE ${BASE}/external/pix/cancel/txn_abc123def456 \\
  -H "X-API-Key: SUA_API_KEY"`,
    javascript: `const txId = 'txn_abc123def456';
const response = await fetch(\`${BASE}/external/pix/cancel/\${txId}\`, {
  method: 'DELETE',
  headers: {
    'X-API-Key': 'SUA_API_KEY'
  }
});

const result = await response.json();
console.log('Status:', result.status); // "CANCELLED"
console.log(result.message);`,
    python: `import requests

tx_id = 'txn_abc123def456'
response = requests.delete(
    f'${BASE}/external/pix/cancel/{tx_id}',
    headers={'X-API-Key': 'SUA_API_KEY'}
)

result = response.json()
print(f"Status: {result['status']}")  # "CANCELLED"
print(result['message'])`,
  },

  'criar-link': {
    curl: `curl -X POST ${BASE}/external/payment-links \\
  -H "X-API-Key: SUA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Produto Exemplo",
    "description": "Descricao do produto",
    "amount": 99.90,
    "walletAddress": "lq1qq..."
  }'`,
    javascript: `const response = await fetch('${BASE}/external/payment-links', {
  method: 'POST',
  headers: {
    'X-API-Key': 'SUA_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Produto Exemplo',
    description: 'Descricao do produto',
    amount: 99.90,
    walletAddress: 'lq1qq...'
  })
});

const link = await response.json();
console.log('URL:', link.paymentUrl);`,
    python: `import requests

response = requests.post(
    '${BASE}/external/payment-links',
    headers={
        'X-API-Key': 'SUA_API_KEY',
        'Content-Type': 'application/json'
    },
    json={
        'title': 'Produto Exemplo',
        'description': 'Descricao do produto',
        'amount': 99.90,
        'walletAddress': 'lq1qq...'
    }
)

link = response.json()
print(f"URL: {link['paymentUrl']}")`,
  },

  'listar-links': {
    curl: `curl "${BASE}/external/payment-links?isActive=true&page=1&limit=20" \\
  -H "X-API-Key: SUA_API_KEY"`,
    javascript: `const response = await fetch('${BASE}/external/payment-links?isActive=true', {
  headers: {
    'X-API-Key': 'SUA_API_KEY'
  }
});

const { data, pagination } = await response.json();
data.forEach(link => console.log(link.description, link.paymentUrl));`,
    python: `import requests

response = requests.get(
    '${BASE}/external/payment-links',
    headers={'X-API-Key': 'SUA_API_KEY'},
    params={'isActive': 'true', 'page': 1}
)

result = response.json()
for link in result['data']:
    print(f"{link['description']}: {link['paymentUrl']}")`,
  },

  'detalhes-link': {
    curl: `curl ${BASE}/external/payment-links/0c95a1a8-3be9-4f15-a8c5-0320ecbdc376 \\
  -H "X-API-Key: SUA_API_KEY"`,
    javascript: `const linkId = '0c95a1a8-3be9-4f15-a8c5-0320ecbdc376';
const response = await fetch(\`${BASE}/external/payment-links/\${linkId}\`, {
  headers: {
    'X-API-Key': 'SUA_API_KEY'
  }
});

const link = await response.json();
console.log('Pagamentos:', link.currentUses);
console.log('Total:', link.totalAmount);`,
    python: `import requests

link_id = '0c95a1a8-3be9-4f15-a8c5-0320ecbdc376'
response = requests.get(
    f'${BASE}/external/payment-links/{link_id}',
    headers={'X-API-Key': 'SUA_API_KEY'}
)

link = response.json()
print(f"Pagamentos: {link['currentUses']}")
print(f"Total: R$ {link['totalAmount']}")`,
  },

  'estatisticas': {
    curl: `curl "${BASE}/external/stats/usage?days=30" \\
  -H "X-API-Key: SUA_API_KEY"`,
    javascript: `const response = await fetch('${BASE}/external/stats/usage?days=30', {
  headers: {
    'X-API-Key': 'SUA_API_KEY'
  }
});

const stats = await response.json();
console.log('Total transacoes:', stats.summary.transactionsCreated);
console.log('Taxa de erro:', stats.summary.errorRate);`,
    python: `import requests

response = requests.get(
    '${BASE}/external/stats/usage',
    headers={'X-API-Key': 'SUA_API_KEY'},
    params={'days': 30}
)

stats = response.json()
print(f"Total transacoes: {stats['summary']['transactionsCreated']}")
print(f"Taxa de erro: {stats['summary']['errorRate']}")`,
  },

  'webhook-seguranca': {
    curl: `# Verificacao de assinatura no seu servidor
# O header X-Atlas-Signature contem: sha256=<hmac_hex>
# Calcule o HMAC-SHA256 do body com seu secret e compare`,
    javascript: `const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expected = 'sha256=' + hmac.digest('hex');
  return signature === expected;
}

// No seu endpoint webhook:
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-atlas-signature'];
  const payload = JSON.stringify(req.body);
  const secret = 'seu-webhook-secret';

  if (verifyWebhookSignature(payload, signature, secret)) {
    const { event, data } = req.body;
    console.log('Evento:', event);
    // Processar o evento...
    res.status(200).send('OK');
  } else {
    res.status(401).send('Assinatura invalida');
  }
});`,
    python: `import hmac
import hashlib
from flask import Flask, request

app = Flask(__name__)

def verify_signature(payload: bytes, signature: str, secret: str) -> bool:
    expected = 'sha256=' + hmac.new(
        secret.encode(), payload, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected)

@app.route('/webhook', methods=['POST'])
def webhook():
    signature = request.headers.get('X-Atlas-Signature', '')
    payload = request.get_data()
    secret = 'seu-webhook-secret'

    if verify_signature(payload, signature, secret):
        data = request.get_json()
        print(f"Evento: {data['event']}")
        # Processar o evento...
        return 'OK', 200
    else:
        return 'Assinatura invalida', 401`,
  },
};
