'use client';

import { useState } from 'react';
import Link from 'next/link';
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

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:19997/api/v1';
  const isProduction = apiBaseUrl.includes('atlasdao.info');

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getCodeExamples = () => ({
    quickStart: `// Criar link de pagamento
const response = await fetch('${apiBaseUrl}/payment-links', {
  method: 'POST',
  headers: {
    'X-API-Key': 'SUA_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Produto Exemplo',
    description: 'Descrição do produto',
    amount: 99.90,
    customerEmail: 'cliente@email.com'
  })
});

const paymentLink = await response.json();
console.log('Link:', paymentLink.data.shortUrl);`,


    generateQR: `// Gerar QR Code PIX
const response = await fetch('${apiBaseUrl}/pix/create', {
  method: 'POST',
  headers: {
    'X-API-Key': 'SUA_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: 99.90,
    description: 'Pagamento teste'
  })
});

const pixData = await response.json();
console.log('PIX criado:', pixData.data);`,

    webhook: `// Configurar webhook para link de pagamento
const webhookResponse = await fetch('${apiBaseUrl}/payment-link/LINK_ID/webhook', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Meu Sistema',
    url: 'https://meusite.com/webhook',
    events: ['payment.completed', 'payment.failed'],
    active: true,
    headers: {
      'X-Custom-Header': 'valor'
    },
    retryPolicy: {
      maxRetries: 3,
      retryDelay: 1000
    }
  })
});

const webhook = await webhookResponse.json();
console.log('Webhook criado:', webhook.data);

// Payload do webhook recebido
{
  "id": "event_uuid",
  "type": "payment.completed",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "paymentId": "payment_uuid",
    "paymentLinkId": "link_uuid",
    "amount": 100.00,
    "currency": "BRL",
    "status": "COMPLETED",
    "customer": {
      "name": "Nome do Cliente",
      "email": "cliente@email.com",
      "document": "CPF/CNPJ"
    },
    "metadata": {}
  },
  "signature": "hmac_sha256_signature"
}`,

    authentication: `// Fazer login e obter JWT
const loginResponse = await fetch('${apiBaseUrl}/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'seu@email.com',
    password: 'suasenha'
  })
});

const { data } = await loginResponse.json();
const token = data.accessToken;

// Usar token em requisições autenticadas
const profileResponse = await fetch('${apiBaseUrl}/profile', {
  headers: {
    'Authorization': \`Bearer \${token}\`
  }
});`,

    python: `import requests

# Criar link de pagamento
response = requests.post(
    '${apiBaseUrl}/payment-links',
    headers={
        'X-API-Key': 'SUA_API_KEY',
        'Content-Type': 'application/json'
    },
    json={
        'title': 'Produto Exemplo',
        'amount': 99.90,
        'customerEmail': 'cliente@email.com'
    }
)

payment_link = response.json()
print(f"Link: {payment_link['data']['shortUrl']}")`,

    php: `<?php
$data = [
    'title' => 'Produto Exemplo',
    'amount' => 99.90,
    'customerEmail' => 'cliente@email.com'
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, '${apiBaseUrl}/payment-links');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'X-API-Key: SUA_API_KEY',
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$paymentLink = json_decode($response, true);

echo "Link: " . $paymentLink['data']['shortUrl'];
?>`,

    curl: `# Criar link de pagamento
curl -X POST ${apiBaseUrl}/payment-links \\
  -H "X-API-Key: SUA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Produto Exemplo",
    "amount": 99.90,
    "customerEmail": "cliente@email.com"
  }'

# Criar transação PIX
curl -X POST ${apiBaseUrl}/pix/create \\
  -H "X-API-Key: SUA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"amount": 99.90, "description": "Pagamento teste"}'`
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
      path: '/api/v1/profile',
      description: 'Dados do perfil do usuário',
      category: 'Perfil'
    },
    {
      method: 'POST',
      path: '/api/v1/payment-links',
      description: 'Criar link de pagamento',
      category: 'Pagamentos'
    },
    {
      method: 'GET',
      path: '/api/v1/payment-links',
      description: 'Listar links de pagamento',
      category: 'Pagamentos'
    },
    {
      method: 'GET',
      path: '/api/v1/payment-links/:id',
      description: 'Detalhes de um link específico',
      category: 'Pagamentos'
    },
    {
      method: 'POST',
      path: '/api/v1/payment-link/:linkId/webhook',
      description: 'Criar webhook para link de pagamento',
      category: 'Webhooks'
    },
    {
      method: 'GET',
      path: '/api/v1/payment-link/:linkId/webhooks',
      description: 'Listar webhooks do link',
      category: 'Webhooks'
    },
    {
      method: 'GET',
      path: '/api/v1/webhook/:id',
      description: 'Obter detalhes do webhook',
      category: 'Webhooks'
    },
    {
      method: 'PATCH',
      path: '/api/v1/webhook/:id',
      description: 'Atualizar webhook',
      category: 'Webhooks'
    },
    {
      method: 'DELETE',
      path: '/api/v1/webhook/:id',
      description: 'Deletar webhook',
      category: 'Webhooks'
    },
    {
      method: 'POST',
      path: '/api/v1/webhook/:id/test',
      description: 'Testar webhook',
      category: 'Webhooks'
    },
    {
      method: 'GET',
      path: '/api/v1/payment-link/:linkId/webhook-events',
      description: 'Listar eventos de webhook',
      category: 'Webhooks'
    },
    {
      method: 'POST',
      path: '/api/v1/pix/create',
      description: 'Criar transação PIX',
      category: 'PIX'
    },
    {
      method: 'GET',
      path: '/api/v1/pix/limits',
      description: 'Verificar limites PIX',
      category: 'PIX'
    },
    {
      method: 'GET',
      path: '/api/v1/withdrawals',
      description: 'Listar saques',
      category: 'Saques'
    },
    {
      method: 'POST',
      path: '/api/v1/withdrawals',
      description: 'Solicitar saque',
      category: 'Saques'
    },
    {
      method: 'GET',
      path: '/api/v1/donations',
      description: 'Listar doações',
      category: 'Doações'
    },
    {
      method: 'POST',
      path: '/api/v1/donations',
      description: 'Criar doação',
      category: 'Doações'
    },
    {
      method: 'GET',
      path: '/api/v1/admin/stats',
      description: 'Estatísticas administrativas',
      category: 'Admin'
    },
    {
      method: 'GET',
      path: '/api/v1/admin/users',
      description: 'Listar usuários (admin)',
      category: 'Admin'
    },
  ];

  const navigationSections = [
    { id: 'quick-start', title: 'Início Rápido', icon: Play },
    { id: 'authentication', title: 'Autenticação', icon: Lock },
    { id: 'payment-links', title: 'Links de Pagamento', icon: Code2 },
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
                  <p className={`text-sm mt-4 ${isProduction ? 'text-green-400' : 'text-blue-400'}`}>
                    {isProduction
                      ? '🚀 Ambiente de produção ativo'
                      : '📝 Atualmente em desenvolvimento. A API de produção estará disponível em breve.'}
                  </p>
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
              <h2 className="text-3xl font-bold text-white mb-6">Autenticação</h2>
              <p className="text-gray-300 mb-8">
                A API Atlas utiliza API Keys para autenticação. Todas as requisições devem incluir sua API Key no header X-API-Key.
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
                      A API possui limite de 5 requisições por segundo por API Key. Requisições acima deste limite retornarão erro 429.
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
                    <div className="bg-gray-900 rounded-lg p-4 border border-gray-600">
                      <h4 className="text-white font-medium mb-2">Valor Fixo</h4>
                      <p className="text-gray-400 text-sm">Cliente paga exatamente o valor definido</p>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4 border border-gray-600">
                      <h4 className="text-white font-medium mb-2">Valor Livre</h4>
                      <p className="text-gray-400 text-sm">Cliente escolhe quanto pagar (com limite opcional)</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                    <h3 className="text-xl font-semibold text-white">POST /api/v1/payment-links</h3>
                    <button
                      onClick={() => handleCopyCode('createPaymentLink', codeExamples.quickStart)}
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
                      {codeExamples.quickStart}
                    </code>
                  </pre>
                </div>

                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-xl font-semibold text-white mb-4">Listar Links de Pagamento</h3>
                  <p className="text-gray-300 mb-4">Recupere todos os seus links de pagamento com informações de status e estatísticas.</p>

                  <div className="bg-gray-900 rounded-lg p-4 border border-gray-600">
                    <code className="text-green-400">GET /api/v1/payment-links</code>
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
  "success": true,
  "data": {
    "id": "pl_abc123",
    "shortCode": "ABC123",
    "shortUrl": "painel.atlasdao.info/pay/ABC123",
    "title": "Produto Exemplo",
    "description": "Descrição do produto",
    "amount": 99.90,
    "isCustomAmount": false,
    "status": "active",
    "totalReceived": 0,
    "paymentCount": 0,
    "createdAt": "2024-01-01T00:00:00Z"
  }
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