'use client';

import { useState } from 'react';
import Link from 'next/link';
import { API_URL } from '@/app/lib/api';
import Image from 'next/image';
import {
  Code2,
  Zap,
  Shield,
  ArrowRight,
  Copy,
  Check,
  Terminal,
  FileCode,
  Database,
  Lock,
  Globe,
  ChevronRight,
  Search,
  Book,
  Play,
  Download,
  ExternalLink,
  Activity
} from 'lucide-react';
import Footer from '../components/landing/Footer';

export default function DevsPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('quick-start');
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentLinkType, setPaymentLinkType] = useState<'fixed' | 'custom'>('fixed');

  const apiBaseUrl = API_URL;
  const isProduction = apiBaseUrl.includes('atlasdao.info');

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getCodeExamples = () => ({
    quickStart: `// Criar link de pagamento
const response = await fetch('${apiBaseUrl}/external/payment-links', {
  method: 'POST',
  headers: {
    'X-API-Key': 'SUA_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Produto Exemplo',
    description: 'Descrição do produto',
    amount: 99.90,
    walletAddress: 'your_wallet_address_here'
  })
});

const paymentLink = await response.json();
console.log('Link:', paymentLink.paymentUrl);`,

    paymentLinkFixed: `// Criar link de pagamento com valor fixo
const response = await fetch('${apiBaseUrl}/external/payment-links', {
  method: 'POST',
  headers: {
    'X-API-Key': 'SUA_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Produto Exemplo',
    description: 'Descrição do produto',
    amount: 99.90,
    isCustomAmount: false,
    walletAddress: 'your_wallet_address_here',
    webhookUrl: 'https://example.com/webhook' // opcional
  })
});

const paymentLink = await response.json();
console.log('Link de pagamento:', paymentLink.paymentUrl);
console.log('Valor fixo: R$', paymentLink.amount);`,

    paymentLinkCustom: `// Criar link de pagamento com valor livre (range)
const response = await fetch('${apiBaseUrl}/external/payment-links', {
  method: 'POST',
  headers: {
    'X-API-Key': 'SUA_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Doação Flexível',
    description: 'Contribua com o valor que desejar',
    isCustomAmount: true,
    minAmount: 10.00,    // Valor mínimo permitido
    maxAmount: 500.00,   // Valor máximo permitido (opcional)
    walletAddress: 'your_wallet_address_here',
    webhookUrl: 'https://example.com/webhook' // opcional
  })
});

const paymentLink = await response.json();
console.log('Link de pagamento:', paymentLink.paymentUrl);
console.log('Range permitido: R$', paymentLink.minAmount, '- R$', paymentLink.maxAmount);`,


    generateQR: `// Gerar QR Code PIX com webhook configurado
const response = await fetch('${apiBaseUrl}/external/pix/create', {
  method: 'POST',
  headers: {
    'X-API-Key': 'SUA_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: 99.90,
    description: 'Pagamento teste',
    depixAddress: 'your_wallet_address_here', // opcional - se omitido, cria transação sem QR
    taxNumber: '12345678900', // opcional para valores < R$ 3000
    merchantOrderId: 'ORDER-123', // opcional

    // NOVO: Configuração de webhook
    webhook: {
      url: 'https://meusite.com/webhook',
      events: [
        'transaction.created',  // Quando PIX é gerado
        'transaction.paid',      // Quando pagamento é confirmado
        'transaction.failed',    // Quando pagamento falha
        'transaction.expired'    // Quando PIX expira
      ],
      secret: 'minha-chave-secreta-min-16-chars', // opcional (min 16 caracteres)
      headers: {  // Headers customizados (opcional)
        'X-Custom-Header': 'valor'
      }
    }
  })
});

const pixData = await response.json();
// Resposta inclui QR code e webhook info:
// { id, status, amount, qrCode, qrCodeImage, expiresAt, webhook: { id, url, events, secretHint } }
console.log('QR Code:', pixData.qrCode);
console.log('Webhook ID:', pixData.webhook?.id);`,

    authentication: `// Obter informações do perfil
const profileResponse = await fetch('${apiBaseUrl}/external/profile', {
  headers: {
    'X-API-Key': 'SUA_API_KEY'
  }
});

const profile = await profileResponse.json();
console.log('Perfil:', profile);

// Verificar estatísticas de uso da API
const statsResponse = await fetch('${apiBaseUrl}/external/stats/usage?days=7', {
  headers: {
    'X-API-Key': 'SUA_API_KEY'
  }
});

const stats = await statsResponse.json();
console.log('Estatísticas:', stats);`,

    python: `import requests

# Criar link de pagamento
response = requests.post(
    '${apiBaseUrl}/external/payment-links',
    headers={
        'X-API-Key': 'SUA_API_KEY',
        'Content-Type': 'application/json'
    },
    json={
        'title': 'Produto Exemplo',
        'amount': 99.90,
        'description': 'Descrição do produto',
        'walletAddress': 'your_wallet_address_here'
    }
)

payment_link = response.json()
print(f"Link: {payment_link['paymentUrl']}")`,

    php: `<?php
$data = [
    'title' => 'Produto Exemplo',
    'amount' => 99.90,
    'description' => 'Descrição do produto',
    'walletAddress' => 'your_wallet_address_here'
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, '${apiBaseUrl}/external/payment-links');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'X-API-Key: SUA_API_KEY',
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$paymentLink = json_decode($response, true);

echo "Link: " . $paymentLink['paymentUrl'];
?>`,

    curl: `# Criar link de pagamento
curl -X POST ${apiBaseUrl}/external/payment-links \\
  -H "X-API-Key: SUA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Produto Exemplo",
    "amount": 99.90,
    "description": "Descrição do produto",
    "walletAddress": "your_wallet_address_here"
  }'

# Criar transação PIX com webhook configurado
curl -X POST ${apiBaseUrl}/external/pix/create \\
  -H "X-API-Key: SUA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 99.90,
    "description": "Pagamento teste",
    "depixAddress": "your_wallet_address",
    "merchantOrderId": "ORDER-123",
    "webhook": {
      "url": "https://meusite.com/webhook",
      "events": ["transaction.created", "transaction.paid"],
      "secret": "minha-chave-secreta-min-16-chars"
    }
  }'

# Note: depixAddress é opcional - se omitido, cria transação sem QR
# taxNumber é opcional para valores < R$ 3000
# webhook é opcional mas permite receber notificações em tempo real`,

    createWebhook: `// Criar webhook para payment link
const response = await fetch('${apiBaseUrl}/payment-links/pl_123/webhooks', {
  method: 'POST',
  headers: {
    'X-API-Key': 'SUA_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://meusite.com/webhook',
    events: [
      'payment.created',
      'payment.completed',
      'payment.failed'
    ],
    secret: 'minha-chave-secreta-123'
  })
});

const webhook = await response.json();
console.log('Webhook criado:', webhook);`,

    listWebhooks: `// Listar webhooks de um payment link
const response = await fetch('${apiBaseUrl}/payment-links/pl_123/webhooks', {
  headers: {
    'X-API-Key': 'SUA_API_KEY'
  }
});

const webhooks = await response.json();
console.log('Webhooks:', webhooks);`,

    testWebhook: `// Testar webhook
const response = await fetch('${apiBaseUrl}/payment-links/pl_123/webhooks/wh_456/test', {
  method: 'POST',
  headers: {
    'X-API-Key': 'SUA_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    eventType: 'payment.completed',
    testData: {
      amount: 150.75,
      customerName: 'João Silva',
      productId: 'prod_123'
    }
  })
});

const result = await response.json();
console.log('Teste executado:', result.success);
console.log('Tempo de resposta:', result.responseTime, 'ms');`,

    webhookSecurity: `// Verificação de assinatura HMAC-SHA256
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = 'sha256=' + hmac.digest('hex');

  return signature === expectedSignature;
}

// Uso no seu endpoint webhook
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-atlas-signature'];
  const payload = JSON.stringify(req.body);
  const secret = 'seu-webhook-secret';

  if (verifyWebhookSignature(payload, signature, secret)) {
    console.log('Webhook válido:', req.body);

    // Processar o webhook aqui

    res.status(200).send('OK');
  } else {
    res.status(401).send('Unauthorized');
  }
});`
  });

  const codeExamples = getCodeExamples();

  const features = [
    {
      icon: Zap,
      title: 'PIX Instantâneo',
      description: 'Pagamentos processados em tempo real, 24/7'
    },
    {
      icon: Shield,
      title: 'Segurança Garantida',
      description: 'JWT e API Keys com criptografia robusta'
    },
    {
      icon: Database,
      title: 'Ambiente de Desenvolvimento',
      description: 'Teste completo em localhost'
    }
  ];

  const apiEndpoints = [
    {
      method: 'GET',
      path: '/api/v1/external/profile',
      description: 'Dados do perfil do usuário',
      category: 'Perfil'
    },
    {
      method: 'GET',
      path: '/api/v1/external/health',
      description: 'Health check da API',
      category: 'Sistema'
    },
    {
      method: 'POST',
      path: '/api/v1/external/pix/create',
      description: 'Criar transação PIX',
      category: 'PIX'
    },
    {
      method: 'GET',
      path: '/api/v1/external/pix/status/:id',
      description: 'Verificar status de transação',
      category: 'PIX'
    },
    {
      method: 'GET',
      path: '/api/v1/external/pix/transactions',
      description: 'Listar transações PIX',
      category: 'PIX'
    },
    {
      method: 'DELETE',
      path: '/api/v1/external/pix/cancel/:id',
      description: 'Cancelar transação PIX pendente',
      category: 'PIX'
    },
    {
      method: 'POST',
      path: '/api/v1/external/payment-links',
      description: 'Criar link de pagamento',
      category: 'Payment Links'
    },
    {
      method: 'GET',
      path: '/api/v1/external/payment-links',
      description: 'Listar links de pagamento',
      category: 'Payment Links'
    },
    {
      method: 'GET',
      path: '/api/v1/external/payment-links/:id',
      description: 'Detalhes de um link específico',
      category: 'Payment Links'
    },
    {
      method: 'POST',
      path: '/api/v1/payment-links/:id/webhooks',
      description: 'Criar webhook para payment link',
      category: 'Webhooks'
    },
    {
      method: 'GET',
      path: '/api/v1/payment-links/:id/webhooks',
      description: 'Listar webhooks de um payment link',
      category: 'Webhooks'
    },
    {
      method: 'PATCH',
      path: '/api/v1/payment-links/:paymentLinkId/webhooks/:id',
      description: 'Atualizar webhook existente',
      category: 'Webhooks'
    },
    {
      method: 'DELETE',
      path: '/api/v1/payment-links/:paymentLinkId/webhooks/:id',
      description: 'Deletar webhook',
      category: 'Webhooks'
    },
    {
      method: 'POST',
      path: '/api/v1/payment-links/:paymentLinkId/webhooks/:id/test',
      description: 'Testar envio de webhook',
      category: 'Webhooks'
    },
    {
      method: 'POST',
      path: '/api/v1/payment-links/:id/webhooks/validate-url',
      description: 'Validar URL de webhook',
      category: 'Webhooks'
    },
    {
      method: 'GET',
      path: '/api/v1/payment-links/:id/webhooks/events',
      description: 'Listar eventos disponíveis',
      category: 'Webhooks'
    },
    {
      method: 'GET',
      path: '/api/v1/external/stats/usage',
      description: 'Estatísticas de uso da API',
      category: 'Estatísticas'
    },
  ];

  const navigationSections = [
    { id: 'quick-start', title: 'Início Rápido', icon: Play },
    { id: 'authentication', title: 'Perfil & Stats', icon: Lock },
    { id: 'payment-links', title: 'Links de Pagamento', icon: Code2 },
    { id: 'webhooks', title: 'Webhooks', icon: Globe },
    { id: 'examples', title: 'Exemplos', icon: Terminal },
    { id: 'testing', title: 'Testes', icon: Activity }
  ];

  const filteredEndpoints = apiEndpoints.filter(endpoint =>
    endpoint.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
    endpoint.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    endpoint.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-gray-900/95 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/atlas-logo.jpg"
                alt="Atlas"
                width={40}
                height={40}
                className="rounded-lg"
              />
              <span className="text-xl font-bold text-white">Atlas</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <Link href="/#features" className="text-gray-300 hover:text-white font-medium transition-colors">
                Recursos
              </Link>
              <Link href="/#pricing" className="text-gray-300 hover:text-white font-medium transition-colors">
                Preços
              </Link>
              <Link href="/devs" className="text-white font-medium">
                Desenvolvedores
              </Link>
              <Link href="/status" className="text-gray-300 hover:text-white font-medium transition-colors">
                Status
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="hidden sm:inline-block text-gray-300 hover:text-white font-medium transition-colors"
              >
                Entrar
              </Link>
              <Link
                href="/register"
                className="hidden sm:inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:shadow-lg transition-all duration-300"
              >
                Começar Agora
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-12 px-4 border-b border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-blue-900/50 border border-blue-700/50 text-blue-400 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Book className="w-4 h-4" />
              <span>Documentação da API Atlas</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              Gateway PIX para
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"> Desenvolvedores</span>
            </h1>

            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              API REST moderna para aceitar pagamentos PIX. Integração simples, documentação completa e suporte brasileiro.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => {
                  setActiveSection('quick-start');
                  const element = document.querySelector('main');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-lg font-semibold hover:shadow-xl transition-all duration-300"
              >
                Começar Agora
                <ArrowRight className="w-5 h-5" />
              </button>
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 bg-gray-800 border-2 border-gray-700 text-gray-300 px-8 py-4 rounded-lg font-semibold hover:border-blue-400 hover:text-blue-400 transition-all"
              >
                Criar Conta
                <ExternalLink className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-all"
                >
                  <Icon className="w-10 h-10 text-blue-400 mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Documentation Content */}
      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className="w-64 bg-gray-800 border-r border-gray-700 min-h-screen sticky top-16">
          <div className="p-6">
            <div className="relative mb-6">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar na documentação..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
              />
            </div>

            <nav className="space-y-2">
              {navigationSections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeSection === section.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{section.title}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {activeSection === 'quick-start' && (
            <div className="max-w-4xl">
              <h2 className="text-3xl font-bold text-white mb-6">Guia de Início Rápido</h2>
              <p className="text-gray-300 mb-8">
                Integre a API Atlas em sua aplicação em poucos minutos. Este guia mostra como criar seu primeiro link de pagamento PIX.
              </p>

              <div className="space-y-6">
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-xl font-semibold text-white mb-4">1. Configuração da API</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-gray-300 mb-2">Base URL ({isProduction ? 'Produção' : 'Desenvolvimento'}):</p>
                      <div className="bg-gray-900 rounded-lg p-4 border border-gray-600">
                        <code className={isProduction ? 'text-green-400' : 'text-blue-400'}>{apiBaseUrl}</code>
                      </div>
                    </div>
                    {!isProduction && (
                      <div>
                        <p className="text-gray-300 mb-2">Base URL (Produção - Em breve):</p>
                        <div className="bg-gray-900 rounded-lg p-4 border border-gray-600">
                          <code className="text-yellow-400">https://api.atlasdao.info/api/v1</code>
                        </div>
                      </div>
                    )}
                  </div>
                  {!isProduction && (
                    <p className="text-sm mt-4 text-blue-400">
                      📝 Atualmente em desenvolvimento. A API de produção estará disponível em breve.
                    </p>
                  )}
                </div>

                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                    <h3 className="text-xl font-semibold text-white">2. Criar Link de Pagamento</h3>
                    <button
                      onClick={() => handleCopyCode('quickStart', codeExamples.quickStart)}
                      className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                    >
                      {copiedCode === 'quickStart' ? (
                        <>
                          <Check className="w-4 h-4 text-green-400" />
                          <span className="text-sm">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span className="text-sm">Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-6 overflow-x-auto">
                    <code className="text-sm text-gray-300 font-mono">
                      {codeExamples.quickStart}
                    </code>
                  </pre>
                </div>

                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                    <h3 className="text-xl font-semibold text-white">3. Gerar QR Code PIX</h3>
                    <button
                      onClick={() => handleCopyCode('generateQR', codeExamples.generateQR)}
                      className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                    >
                      {copiedCode === 'generateQR' ? (
                        <>
                          <Check className="w-4 h-4 text-green-400" />
                          <span className="text-sm">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span className="text-sm">Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-6 overflow-x-auto">
                    <code className="text-sm text-gray-300 font-mono">
                      {codeExamples.generateQR}
                    </code>
                  </pre>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'authentication' && (
            <div className="max-w-4xl">
              <h2 className="text-3xl font-bold text-white mb-6">Perfil & Estatísticas</h2>
              <p className="text-gray-300 mb-8">
                Acesse informações do seu perfil e estatísticas de uso da API usando sua API Key.
              </p>

              <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-gray-700">
                  <h3 className="text-xl font-semibold text-white">Autenticação com API Key</h3>
                </div>
                <div className="p-6">
                  <p className="text-gray-300 mb-4">
                    Todas as requisições à API devem incluir o header X-API-Key com sua chave de API:
                  </p>
                  <div className="bg-gray-900 rounded-lg p-4 border border-gray-600">
                    <code className="text-green-400">X-API-Key: sua-api-key-aqui</code>
                  </div>
                </div>
              </div>

              <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-red-400 mt-0.5" />
                  <div>
                    <p className="text-red-400 font-medium">Limite de Taxa</p>
                    <p className="text-gray-300 text-sm mt-1">
                      A API possui limite de 100 requisições por minuto por API Key. Requisições acima deste limite retornarão erro 429.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-blue-400 font-medium">Importante</p>
                    <p className="text-gray-300 text-sm mt-1">
                      Para obter sua API Key, faça uma solicitação através do painel de configurações em /settings {'>'}  API.
                      Mantenha sua API Key segura e nunca a exponha em código frontend.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'payment-links' && (
            <div className="max-w-4xl">
              <h2 className="text-3xl font-bold text-white mb-6">Links de Pagamento</h2>
              <p className="text-gray-300 mb-8">
                Aprenda como criar, gerenciar e utilizar links de pagamento para receber PIX de forma simples e eficiente.
              </p>

              <div className="space-y-6">
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-xl font-semibold text-white mb-4">Criando um Link de Pagamento</h3>
                  <p className="text-gray-300 mb-4">
                    Links de pagamento permitem que você receba PIX sem precisar gerar QR Codes manualmente.
                    Compartilhe o link e o cliente escolhe o valor (se configurado) e efetua o pagamento.
                  </p>

                  <div className="grid md:grid-cols-2 gap-4">
                    <button
                      onClick={() => setPaymentLinkType('fixed')}
                      className={`bg-gray-900 rounded-lg p-4 border transition-all text-left ${
                        paymentLinkType === 'fixed'
                          ? 'border-blue-500 ring-2 ring-blue-500/50'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      <h4 className="text-white font-medium mb-2">Valor Fixo</h4>
                      <p className="text-gray-400 text-sm">Cliente paga exatamente o valor definido</p>
                    </button>
                    <button
                      onClick={() => setPaymentLinkType('custom')}
                      className={`bg-gray-900 rounded-lg p-4 border transition-all text-left ${
                        paymentLinkType === 'custom'
                          ? 'border-blue-500 ring-2 ring-blue-500/50'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      <h4 className="text-white font-medium mb-2">Valor Livre</h4>
                      <p className="text-gray-400 text-sm">Cliente escolhe quanto pagar (com limite opcional)</p>
                    </button>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                    <h3 className="text-xl font-semibold text-white">
                      POST /api/v1/external/payment-links
                      <span className="ml-3 text-sm text-gray-400">
                        ({paymentLinkType === 'fixed' ? 'Valor Fixo' : 'Valor Livre'})
                      </span>
                    </h3>
                    <button
                      onClick={() => handleCopyCode(
                        'createPaymentLink',
                        paymentLinkType === 'fixed' ? codeExamples.paymentLinkFixed : codeExamples.paymentLinkCustom
                      )}
                      className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                    >
                      {copiedCode === 'createPaymentLink' ? (
                        <>
                          <Check className="w-4 h-4 text-green-400" />
                          <span className="text-sm">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span className="text-sm">Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-6 overflow-x-auto">
                    <code className="text-sm text-gray-300 font-mono">
                      {paymentLinkType === 'fixed' ? codeExamples.paymentLinkFixed : codeExamples.paymentLinkCustom}
                    </code>
                  </pre>
                </div>

                {paymentLinkType === 'custom' && (
                  <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Code2 className="w-5 h-5 text-blue-400 mt-0.5" />
                      <div>
                        <p className="text-blue-400 font-medium">Parâmetros Opcionais para Valor Livre</p>
                        <p className="text-gray-300 text-sm mt-1">
                          <code className="text-blue-400">minAmount</code>: Define o valor mínimo que o cliente pode pagar (opcional, padrão: 0.01)<br />
                          <code className="text-blue-400">maxAmount</code>: Define o valor máximo que o cliente pode pagar (opcional, sem limite se não definido)
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-xl font-semibold text-white mb-4">Listar Links de Pagamento</h3>
                  <p className="text-gray-300 mb-4">Recupere todos os seus links de pagamento com informações de status e estatísticas.</p>

                  <div className="bg-gray-900 rounded-lg p-4 border border-gray-600">
                    <code className="text-green-400">GET /api/v1/external/payment-links</code>
                    <div className="mt-3 text-gray-400 text-sm">
                      <p><strong>Parâmetros opcionais:</strong></p>
                      <ul className="mt-2 space-y-1">
                        <li>• <code className="text-blue-400">page</code>: Página (padrão: 1)</li>
                        <li>• <code className="text-blue-400">limit</code>: Itens por página (padrão: 10)</li>
                        <li>• <code className="text-blue-400">status</code>: active, inactive, expired</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-xl font-semibold text-white mb-4">Estrutura de Resposta</h3>
                  <div className="bg-gray-900 rounded-lg p-4 border border-gray-600">
                    <pre className="text-sm text-gray-300">
{`{
  "id": "0c95a1a8-3be9-4f15-a8c5-0320ecbdc376",
  "shortCode": "8v6ZOWBH",
  "amount": 99.90,
  "isCustomAmount": false,
  "minAmount": null,
  "maxAmount": null,
  "description": "Descrição do produto",
  "isActive": true,
  "expiresAt": null,
  "createdAt": "2024-01-01T00:00:00Z",
  "paymentUrl": "https://painel.atlasdao.info/pay/8v6ZOWBH"
}`}
                    </pre>
                  </div>
                </div>

                <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Code2 className="w-5 h-5 text-blue-400 mt-0.5" />
                    <div>
                      <p className="text-blue-400 font-medium">Dica</p>
                      <p className="text-gray-300 text-sm mt-1">
                        Os links ficam ativos por padrão e podem receber pagamentos imediatamente após a criação.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'webhooks' && (
            <div className="max-w-4xl">
              <h2 className="text-3xl font-bold text-white mb-6">Webhooks</h2>
              <p className="text-gray-300 mb-8">
                Configure webhooks para receber notificações automáticas de eventos de pagamento.
                Gerencie URLs, eventos e assinaturas de segurança programaticamente.
              </p>

              <div className="space-y-6">
                {/* Criar Webhook */}
                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                    <h3 className="text-xl font-semibold text-white">Criar Webhook</h3>
                    <button
                      onClick={() => handleCopyCode('createWebhook', codeExamples.createWebhook)}
                      className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                    >
                      {copiedCode === 'createWebhook' ? (
                        <>
                          <Check className="w-4 h-4 text-green-400" />
                          <span className="text-sm">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span className="text-sm">Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-6 overflow-x-auto">
                    <code className="text-sm text-gray-300 font-mono">
                      {codeExamples.createWebhook}
                    </code>
                  </pre>
                </div>

                {/* Listar Webhooks */}
                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                    <h3 className="text-xl font-semibold text-white">Listar Webhooks</h3>
                    <button
                      onClick={() => handleCopyCode('listWebhooks', codeExamples.listWebhooks)}
                      className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                    >
                      {copiedCode === 'listWebhooks' ? (
                        <>
                          <Check className="w-4 h-4 text-green-400" />
                          <span className="text-sm">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span className="text-sm">Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-6 overflow-x-auto">
                    <code className="text-sm text-gray-300 font-mono">
                      {codeExamples.listWebhooks}
                    </code>
                  </pre>
                </div>

                {/* Testar Webhook */}
                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                    <h3 className="text-xl font-semibold text-white">Testar Webhook</h3>
                    <button
                      onClick={() => handleCopyCode('testWebhook', codeExamples.testWebhook)}
                      className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                    >
                      {copiedCode === 'testWebhook' ? (
                        <>
                          <Check className="w-4 h-4 text-green-400" />
                          <span className="text-sm">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span className="text-sm">Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-6 overflow-x-auto">
                    <code className="text-sm text-gray-300 font-mono">
                      {codeExamples.testWebhook}
                    </code>
                  </pre>
                </div>

                {/* Eventos Disponíveis */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-xl font-semibold text-white mb-4">Eventos Disponíveis</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-900 rounded">
                      <code className="text-blue-400">payment.created</code>
                      <span className="text-gray-400 text-sm">Quando um novo pagamento é criado</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-900 rounded">
                      <code className="text-green-400">payment.completed</code>
                      <span className="text-gray-400 text-sm">Quando um pagamento é confirmado</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-900 rounded">
                      <code className="text-red-400">payment.failed</code>
                      <span className="text-gray-400 text-sm">Quando um pagamento falha</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-900 rounded">
                      <code className="text-yellow-400">payment.expired</code>
                      <span className="text-gray-400 text-sm">Quando um pagamento expira</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-900 rounded">
                      <code className="text-purple-400">payment.refunded</code>
                      <span className="text-gray-400 text-sm">Quando um pagamento é estornado</span>
                    </div>
                  </div>
                </div>

                {/* Segurança HMAC */}
                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                    <h3 className="text-xl font-semibold text-white">Verificação de Segurança (HMAC-SHA256)</h3>
                    <button
                      onClick={() => handleCopyCode('webhookSecurity', codeExamples.webhookSecurity)}
                      className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                    >
                      {copiedCode === 'webhookSecurity' ? (
                        <>
                          <Check className="w-4 h-4 text-green-400" />
                          <span className="text-sm">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span className="text-sm">Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-6 overflow-x-auto">
                    <code className="text-sm text-gray-300 font-mono">
                      {codeExamples.webhookSecurity}
                    </code>
                  </pre>
                </div>

                {/* Notas Importantes */}
                <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                  <h3 className="text-blue-400 font-semibold mb-2 flex items-center">
                    <Shield className="w-4 h-4 mr-2" />
                    Notas Importantes sobre Webhooks
                  </h3>
                  <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
                    <li>Todos os webhooks incluem header <code className="text-blue-400">X-Atlas-Signature</code> para verificação HMAC-SHA256</li>
                    <li>O secret do webhook é criptografado e armazenado com segurança no banco de dados</li>
                    <li>URLs devem responder com status 2xx para serem consideradas bem-sucedidas</li>
                    <li>Webhooks com falhas consecutivas podem ser automaticamente desativados</li>
                    <li>Use a função de teste para validar sua implementação antes de ativar</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'examples' && (
            <div className="max-w-4xl">
              <h2 className="text-3xl font-bold text-white mb-6">Exemplos de Código</h2>
              <p className="text-gray-300 mb-8">
                Exemplos práticos em diferentes linguagens de programação.
              </p>

              <div className="space-y-6">
                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                    <h3 className="text-xl font-semibold text-white">Python</h3>
                    <button
                      onClick={() => handleCopyCode('python', codeExamples.python)}
                      className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                    >
                      {copiedCode === 'python' ? (
                        <>
                          <Check className="w-4 h-4 text-green-400" />
                          <span className="text-sm">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span className="text-sm">Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-6 overflow-x-auto">
                    <code className="text-sm text-gray-300 font-mono">
                      {codeExamples.python}
                    </code>
                  </pre>
                </div>

                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                    <h3 className="text-xl font-semibold text-white">PHP</h3>
                    <button
                      onClick={() => handleCopyCode('php', codeExamples.php)}
                      className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                    >
                      {copiedCode === 'php' ? (
                        <>
                          <Check className="w-4 h-4 text-green-400" />
                          <span className="text-sm">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span className="text-sm">Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-6 overflow-x-auto">
                    <code className="text-sm text-gray-300 font-mono">
                      {codeExamples.php}
                    </code>
                  </pre>
                </div>

                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                    <h3 className="text-xl font-semibold text-white">cURL</h3>
                    <button
                      onClick={() => handleCopyCode('curl', codeExamples.curl)}
                      className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                    >
                      {copiedCode === 'curl' ? (
                        <>
                          <Check className="w-4 h-4 text-green-400" />
                          <span className="text-sm">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span className="text-sm">Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-6 overflow-x-auto">
                    <code className="text-sm text-gray-300 font-mono">
                      {codeExamples.curl}
                    </code>
                  </pre>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'testing' && (
            <div className="max-w-4xl">
              <h2 className="text-3xl font-bold text-white mb-6">Status da API</h2>
              <p className="text-gray-300 mb-8">
                A API Atlas está em desenvolvimento ativo. Solicite acesso antecipado através do painel de configurações.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-4">API em Desenvolvimento</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-400">Base URL atual</p>
                      <code className={isProduction ? 'text-green-400' : 'text-blue-400'}>{apiBaseUrl}</code>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Status</p>
                      <code className={isProduction ? 'text-green-400' : 'text-blue-400'}>
                        {isProduction ? 'Produção Ativa' : 'Desenvolvimento Ativo'}
                      </code>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Limite</p>
                      <code className="text-green-400">5 req/sec por API Key</code>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-4">Recursos</h3>
                  <div className="space-y-3">
                    <Link
                      href="/status"
                      className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <Activity className="w-4 h-4" />
                      <span>Status da API</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                    <Link
                      href="/settings?tab=api"
                      className="inline-flex items-center gap-2 text-green-400 hover:text-green-300 transition-colors"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Solicitar API Key</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* API Endpoints Reference */}
          {searchQuery && (
            <div className="max-w-4xl mt-8">
              <h3 className="text-2xl font-bold text-white mb-6">Resultados da Busca</h3>
              <div className="space-y-4">
                {filteredEndpoints.map((endpoint, index) => (
                  <div key={index} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center gap-4 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-mono ${
                        endpoint.method === 'GET' ? 'bg-green-900 text-green-400' :
                        endpoint.method === 'POST' ? 'bg-blue-900 text-blue-400' :
                        endpoint.method === 'PATCH' ? 'bg-yellow-900 text-yellow-400' :
                        'bg-gray-900 text-gray-400'
                      }`}>
                        {endpoint.method}
                      </span>
                      <code className="text-blue-400">{endpoint.path}</code>
                      <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                        {endpoint.category}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm">{endpoint.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}