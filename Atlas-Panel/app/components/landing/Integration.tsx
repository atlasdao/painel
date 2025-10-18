'use client';

import { useState } from 'react';
import { Code2, Copy, Check, Terminal, Smartphone, Globe } from 'lucide-react';

export default function Integration() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const codeExamples = {
    javascript: {
      label: 'Node.js',
      code: `const atlas = require('@atlas/sdk');

// Inicialize com sua API key
const client = new atlas.Client({
  apiKey: 'sua_api_key_aqui'
});

// Crie um pagamento PIX
const payment = await client.payments.create({
  amount: 10000, // R$ 100,00
  description: 'Venda #123',
  customer: {
    name: 'João Silva',
    taxId: '12345678900'
  }
});

console.log(payment.qrCode);`
    },
    python: {
      label: 'Python',
      code: `import atlas

# Inicialize com sua API key
client = atlas.Client(api_key='sua_api_key_aqui')

# Crie um pagamento PIX
payment = client.payments.create(
    amount=10000,  # R$ 100,00
    description='Venda #123',
    customer={
        'name': 'João Silva',
        'tax_id': '12345678900'
    }
)

print(payment.qr_code)`
    },
    php: {
      label: 'PHP',
      code: `<?php
require_once('vendor/autoload.php');

use Atlas\\Client;

// Inicialize com sua API key
$client = new Client(['apiKey' => 'sua_api_key_aqui']);

// Crie um pagamento PIX
$payment = $client->payments->create([
    'amount' => 10000, // R$ 100,00
    'description' => 'Venda #123',
    'customer' => [
        'name' => 'João Silva',
        'taxId' => '12345678900'
    ]
]);

echo $payment->qrCode;`
    },
    curl: {
      label: 'cURL',
      code: `curl -X POST https://api.atlas.com.br/v1/payments \\
  -H "Authorization: Bearer sua_api_key_aqui" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 10000,
    "description": "Venda #123",
    "customer": {
      "name": "João Silva",
      "taxId": "12345678900"
    }
  }'`
    }
  };

  const platforms = [
    { icon: Globe, name: 'WordPress', status: 'Plugin disponível' },
    { icon: Globe, name: 'WooCommerce', status: 'Integração nativa' },
    { icon: Globe, name: 'Shopify', status: 'App oficial' },
    { icon: Smartphone, name: 'React Native', status: 'SDK mobile' },
    { icon: Smartphone, name: 'Flutter', status: 'Package oficial' },
    { icon: Terminal, name: 'REST API', status: 'Documentação completa' }
  ];

  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Code2 className="w-4 h-4" />
            Integração em minutos
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Integração simples com
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"> qualquer plataforma</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Nossa API foi projetada para desenvolvedores. Clara, bem documentada e fácil de implementar.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Code examples */}
          <div>
            <div className="flex gap-2 mb-4 overflow-x-auto">
              {Object.entries(codeExamples).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => setSelectedLanguage(key)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                    selectedLanguage === key
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {value.label}
                </button>
              ))}
            </div>

            <div className="relative bg-gray-900 rounded-xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <button
                  onClick={() => copyToClipboard(codeExamples[selectedLanguage as keyof typeof codeExamples].code, selectedLanguage)}
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                  {copiedCode === selectedLanguage ? (
                    <>
                      <Check className="w-4 h-4" />
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

              <pre className="text-sm text-gray-300 overflow-x-auto">
                <code>{codeExamples[selectedLanguage as keyof typeof codeExamples].code}</code>
              </pre>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900 mb-2 font-medium">Teste em sandbox</p>
              <p className="text-sm text-blue-700">
                Experimente nossa API sem compromisso. Ambiente de testes com dados simulados disponível.
              </p>
            </div>
          </div>

          {/* Platforms and integrations */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              Compatível com suas ferramentas
            </h3>

            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {platforms.map((platform, index) => {
                const Icon = platform.icon;
                return (
                  <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="w-12 h-12 bg-white rounded-lg shadow-sm flex items-center justify-center">
                      <Icon className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{platform.name}</p>
                      <p className="text-sm text-gray-600">{platform.status}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
              <h4 className="font-semibold text-gray-900 mb-3">Recursos para desenvolvedores</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  Documentação interativa com exemplos
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  Webhooks para eventos em tempo real
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  Ambiente sandbox para testes
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  SDKs em múltiplas linguagens
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  Suporte técnico especializado
                </li>
              </ul>

              <a
                href="/devs"
                className="inline-flex items-center gap-2 mt-6 text-purple-600 font-semibold hover:text-pink-600 transition-colors"
              >
                Explorar documentação completa
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}