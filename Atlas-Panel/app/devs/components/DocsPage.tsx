'use client';

import { useState, useEffect } from 'react';
import DocsNav from './DocsNav';
import DocsSidebar from './DocsSidebar';
import DocsHero from './DocsHero';
import SectionHeader from './SectionHeader';
import EndpointCard from './EndpointCard';
import WebhookEventCard from './WebhookEventCard';
import CodeBlock from './CodeBlock';
import CodeTabs from './CodeTabs';
import InfoBox from './InfoBox';
import { endpoints, BASE_URL } from '../data/endpoints';
import { codeExamples, type Language } from '../data/code-examples';
import { webhookEvents, webhookHeaders } from '../data/webhook-events';
import { getAllSectionIds } from '../data/navigation';

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('introducao');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeLanguage, setActiveLanguage] = useState<Language>('curl');

  // IntersectionObserver to track active section
  useEffect(() => {
    const ids = getAllSectionIds();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    );

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // Handle deep link on mount
  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.slice(1);
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, []);

  const getEndpoint = (id: string) => endpoints.find((e) => e.id === id)!;
  const getExamples = (id: string) => codeExamples[id];

  return (
    <div className="min-h-screen bg-zinc-950">
      <DocsNav
        onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        mobileMenuOpen={mobileMenuOpen}
      />

      <div className="flex pt-16">
        <DocsSidebar
          activeSection={activeSection}
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        {/* Main content */}
        <main className="flex-1 min-w-0 px-5 sm:px-8 lg:px-12 py-8">
          <div className="max-w-4xl mx-auto">
            <DocsHero />

            {/* ===== GUIA ===== */}

            {/* Introducao */}
            <section className="mt-12 space-y-4">
              <SectionHeader
                id="introducao"
                title="Introducao"
                description="A Atlas API permite que voce integre pagamentos PIX diretamente na sua aplicacao. Crie transacoes, links de pagamento, receba webhooks e consulte estatisticas."
              />
              <div className="space-y-3">
                <InfoBox type="info" title="Base URL">
                  <p>Todas as requisicoes devem ser feitas para:</p>
                  <code className="block mt-1 text-blue-400">{BASE_URL}</code>
                </InfoBox>
                <InfoBox type="tip" title="Versionamento">
                  <p>A API e versionada via URL (<code className="text-blue-400">/api/v1</code>). Mudancas que quebram compatibilidade resultarao em uma nova versao.</p>
                </InfoBox>
                <InfoBox type="info" title="Documentacao para LLMs">
                  <p>Esta documentacao tambem esta disponivel em formato plain-text otimizado para LLMs e agentes de IA em <a href="/devs/llms.md" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">/devs/llms.md</a>.</p>
                </InfoBox>
              </div>
            </section>

            {/* Autenticacao */}
            <section className="mt-12 space-y-4">
              <SectionHeader
                id="autenticacao"
                title="Autenticacao"
                description="Todas as requisicoes (exceto health check) precisam de autenticacao via API Key."
              />
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-4">
                <p className="text-zinc-400 text-sm">
                  Inclua sua API Key no header <code className="text-blue-400">X-API-Key</code> de cada requisicao:
                </p>
                <CodeBlock
                  code={`curl ${BASE_URL}/external/profile \\\n  -H "X-API-Key: atlas_sua_chave_aqui"`}
                  language="cURL"
                />
                <div className="text-zinc-400 text-sm space-y-2 mt-2">
                  <p className="font-semibold text-zinc-300">Como obter sua API Key:</p>
                  <ol className="list-decimal list-inside space-y-1 text-zinc-400">
                    <li><a href="/register" target="_blank" className="text-blue-400 hover:text-blue-300 underline">Crie uma conta</a> no painel Atlas</li>
                    <li>Ative o <strong className="text-zinc-300">Modo Comercio</strong> em Configuracoes</li>
                    <li>Acesse <a href="/settings" target="_blank" className="text-blue-400 hover:text-blue-300 underline">Configuracoes &gt; API</a> e gere sua chave</li>
                  </ol>
                </div>
              </div>
              <InfoBox type="danger" title="Seguranca">
                <p>Nunca exponha sua API Key em codigo frontend ou repositorios publicos. Use variaveis de ambiente no servidor.</p>
              </InfoBox>
            </section>

            {/* Inicio Rapido */}
            <section className="mt-12 space-y-4">
              <SectionHeader
                id="inicio-rapido"
                title="Inicio Rapido"
                description="Crie seu primeiro pagamento PIX em 3 passos."
              />

              <div className="space-y-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
                  <h3 className="text-zinc-50 font-semibold mb-3">1. Obtenha sua API Key</h3>
                  <p className="text-zinc-400 text-sm">Crie uma conta, ative o modo comercio e gere uma API Key em <strong className="text-zinc-300">Configuracoes &gt; API</strong>.</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
                  <h3 className="text-zinc-50 font-semibold mb-3">2. Crie uma transacao PIX</h3>
                  <CodeTabs
                    examples={codeExamples['criar-transacao']}
                    activeLanguage={activeLanguage}
                    onLanguageChange={setActiveLanguage}
                  />
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
                  <h3 className="text-zinc-50 font-semibold mb-3">3. Exiba o QR Code ao cliente</h3>
                  <p className="text-zinc-400 text-sm mb-3">
                    A resposta inclui <code className="text-blue-400">qrCode</code> (copia-e-cola) e <code className="text-blue-400">qrCodeImage</code> (base64 PNG). Mostre ao cliente para pagamento.
                  </p>
                  <InfoBox type="tip" title="Webhook opcional">
                    <p>Configure um webhook no campo <code className="text-blue-400">webhook</code> para receber notificacao automatica quando o pagamento for confirmado.</p>
                  </InfoBox>
                </div>
              </div>
            </section>

            {/* Limites e Taxas */}
            <section className="mt-12 space-y-4">
              <SectionHeader
                id="limites-e-taxas"
                title="Limites e Taxas"
                description="Rate limits e taxas da API Atlas."
              />

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
                  <h3 className="text-zinc-50 font-semibold mb-3">Rate Limits</h3>
                  <ul className="space-y-2 text-sm text-zinc-400">
                    <li className="flex justify-between"><span>Por minuto</span><code className="text-zinc-300">100 requisicoes</code></li>
                    <li className="flex justify-between"><span>Por dia</span><code className="text-zinc-300">10.000 requisicoes</code></li>
                  </ul>
                  <p className="text-xs text-zinc-500 mt-3">Exceder o limite retorna status <code className="text-yellow-400">429</code>.</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
                  <h3 className="text-zinc-50 font-semibold mb-3">Taxas</h3>
                  <ul className="space-y-2 text-sm text-zinc-400">
                    <li className="flex justify-between"><span>Taxa por PIX recebido</span><code className="text-zinc-300">R$ 0,99</code></li>
                    <li className="flex justify-between"><span>Links de pagamento</span><code className="text-zinc-300">Gratis</code></li>
                    <li className="flex justify-between"><span>API Key</span><code className="text-zinc-300">Gratis</code></li>
                  </ul>
                </div>
              </div>

              <InfoBox type="info" title="Settlement">
                <p>Pagamentos sao liquidados em D+0 (instantaneo) ou D+1, dependendo do plano. O campo <code className="text-blue-400">settlement</code> no webhook indica o tipo.</p>
              </InfoBox>
            </section>

            {/* ===== ENDPOINTS ===== */}

            {/* Health Check */}
            <section className="mt-16 space-y-4">
              <SectionHeader id="health-check" title="Health Check" />
              <EndpointCard
                endpoint={getEndpoint('health-check')}
                examples={getExamples('health-check')}
                activeLanguage={activeLanguage}
                onLanguageChange={setActiveLanguage}
              />
            </section>

            {/* Perfil */}
            <section className="mt-12 space-y-4">
              <SectionHeader id="perfil" title="Perfil" />
              <EndpointCard
                endpoint={getEndpoint('perfil')}
                examples={getExamples('perfil')}
                activeLanguage={activeLanguage}
                onLanguageChange={setActiveLanguage}
              />
            </section>

            {/* PIX */}
            <section className="mt-16">
              <SectionHeader
                id="pix"
                title="PIX"
                description="Endpoints para criar, consultar e gerenciar transacoes PIX."
              />
            </section>

            <section className="mt-6 space-y-4">
              <EndpointCard
                endpoint={getEndpoint('criar-transacao')}
                examples={getExamples('criar-transacao')}
                activeLanguage={activeLanguage}
                onLanguageChange={setActiveLanguage}
              />
            </section>

            <section className="mt-6 space-y-4">
              <EndpointCard
                endpoint={getEndpoint('status-transacao')}
                examples={getExamples('status-transacao')}
                activeLanguage={activeLanguage}
                onLanguageChange={setActiveLanguage}
              />
            </section>

            <section className="mt-6 space-y-4">
              <EndpointCard
                endpoint={getEndpoint('listar-transacoes')}
                examples={getExamples('listar-transacoes')}
                activeLanguage={activeLanguage}
                onLanguageChange={setActiveLanguage}
              />
            </section>

            <section className="mt-6 space-y-4">
              <EndpointCard
                endpoint={getEndpoint('cancelar-transacao')}
                examples={getExamples('cancelar-transacao')}
                activeLanguage={activeLanguage}
                onLanguageChange={setActiveLanguage}
              />
            </section>

            {/* Payment Links */}
            <section className="mt-16">
              <SectionHeader
                id="payment-links"
                title="Links de Pagamento"
                description="Crie links compartilhaveis para receber pagamentos PIX com valor fixo ou livre."
              />
            </section>

            <section className="mt-6 space-y-4">
              <EndpointCard
                endpoint={getEndpoint('criar-link')}
                examples={getExamples('criar-link')}
                activeLanguage={activeLanguage}
                onLanguageChange={setActiveLanguage}
              />
            </section>

            <section className="mt-6 space-y-4">
              <EndpointCard
                endpoint={getEndpoint('listar-links')}
                examples={getExamples('listar-links')}
                activeLanguage={activeLanguage}
                onLanguageChange={setActiveLanguage}
              />
            </section>

            <section className="mt-6 space-y-4">
              <EndpointCard
                endpoint={getEndpoint('detalhes-link')}
                examples={getExamples('detalhes-link')}
                activeLanguage={activeLanguage}
                onLanguageChange={setActiveLanguage}
              />
            </section>

            {/* Estatisticas */}
            <section className="mt-12 space-y-4">
              <SectionHeader id="estatisticas" title="Estatisticas" />
              <EndpointCard
                endpoint={getEndpoint('estatisticas')}
                examples={getExamples('estatisticas')}
                activeLanguage={activeLanguage}
                onLanguageChange={setActiveLanguage}
              />
            </section>

            {/* ===== WEBHOOKS & REFERENCIA ===== */}

            {/* Webhook Config */}
            <section className="mt-16 space-y-4">
              <SectionHeader
                id="webhooks"
                title="Webhooks"
                description="Receba notificacoes em tempo real sobre eventos de suas transacoes."
              />
            </section>

            <section className="mt-6 space-y-4">
              <SectionHeader
                id="webhook-configuracao"
                title="Configuracao"
                description="Webhooks sao configurados inline ao criar uma transacao PIX, no campo webhook do POST /external/pix/create."
              />
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-3">
                <h4 className="text-zinc-50 font-semibold text-sm">Campos do webhook</h4>
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-zinc-800/50">
                      <td className="py-2 pr-4"><code className="text-blue-400 font-mono text-xs">url</code></td>
                      <td className="py-2 pr-4"><span className="text-red-400 text-xs">Obrigatorio</span></td>
                      <td className="py-2 text-zinc-400 text-xs">URL que recebera as notificacoes (HTTPS em producao)</td>
                    </tr>
                    <tr className="border-b border-zinc-800/50">
                      <td className="py-2 pr-4"><code className="text-blue-400 font-mono text-xs">events</code></td>
                      <td className="py-2 pr-4"><span className="text-red-400 text-xs">Obrigatorio</span></td>
                      <td className="py-2 text-zinc-400 text-xs">Array de eventos para assinar</td>
                    </tr>
                    <tr className="border-b border-zinc-800/50">
                      <td className="py-2 pr-4"><code className="text-blue-400 font-mono text-xs">secret</code></td>
                      <td className="py-2 pr-4"><span className="text-zinc-600 text-xs">Opcional</span></td>
                      <td className="py-2 text-zinc-400 text-xs">Secret para assinatura HMAC (min 16 chars). Se omitido, um e gerado automaticamente</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4"><code className="text-blue-400 font-mono text-xs">headers</code></td>
                      <td className="py-2 pr-4"><span className="text-zinc-600 text-xs">Opcional</span></td>
                      <td className="py-2 text-zinc-400 text-xs">Headers customizados para enviar junto com o webhook</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Webhook Events */}
            <section className="mt-8 space-y-4">
              <SectionHeader
                id="webhook-eventos"
                title="Eventos Disponiveis"
                description="Cada evento dispara um POST para a URL configurada com o payload correspondente."
              />
              <div className="space-y-4">
                {webhookEvents.map((event) => (
                  <WebhookEventCard key={event.name} event={event} />
                ))}
              </div>
            </section>

            {/* Webhook Payload */}
            <section className="mt-8 space-y-4">
              <SectionHeader
                id="webhook-payload"
                title="Payload"
                description="Todos os webhooks seguem a mesma estrutura de payload."
              />
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-3">
                <p className="text-zinc-400 text-sm">Estrutura geral do payload:</p>
                <CodeBlock
                  code={JSON.stringify({
                    event: 'transaction.paid',
                    data: { '...': 'dados especificos do evento' },
                    timestamp: '2025-01-15T10:35:01.000Z',
                    webhookId: 'wh_xyz789',
                  }, null, 2)}
                  language="JSON"
                />
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
                <h4 className="text-zinc-50 font-semibold text-sm mb-3">Headers enviados</h4>
                <div className="space-y-2">
                  {webhookHeaders.map((h) => (
                    <div key={h.name} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm">
                      <code className="text-blue-400 font-mono text-xs shrink-0">{h.name}</code>
                      <span className="text-zinc-500 text-xs">{h.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Webhook Security */}
            <section className="mt-8 space-y-4">
              <SectionHeader
                id="webhook-seguranca"
                title="Seguranca (HMAC)"
                description="Verifique a assinatura de cada webhook para garantir que veio da Atlas."
              />
              <div className="space-y-4">
                <InfoBox type="warning" title="Sempre verifique a assinatura">
                  <p>O header <code className="text-blue-400">X-Atlas-Signature</code> contem <code className="text-blue-400">sha256=&lt;hmac_hex&gt;</code>. Calcule o HMAC-SHA256 do body com seu secret e compare.</p>
                </InfoBox>
                <CodeTabs
                  examples={codeExamples['webhook-seguranca']}
                  activeLanguage={activeLanguage}
                  onLanguageChange={setActiveLanguage}
                />
              </div>
            </section>

            {/* Status Codes */}
            <section className="mt-12 space-y-4">
              <SectionHeader
                id="codigos-status"
                title="Codigos de Status"
                description="Codigos HTTP retornados pela API."
              />
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left px-5 py-3 text-zinc-400 font-medium">Codigo</th>
                      <th className="text-left px-5 py-3 text-zinc-400 font-medium">Descricao</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { code: 200, desc: 'Requisicao bem sucedida' },
                      { code: 201, desc: 'Recurso criado com sucesso' },
                      { code: 400, desc: 'Dados da requisicao invalidos' },
                      { code: 401, desc: 'API Key invalida ou ausente' },
                      { code: 403, desc: 'Permissao negada para esta operacao' },
                      { code: 404, desc: 'Recurso nao encontrado' },
                      { code: 409, desc: 'Conflito (ex: transacao ja processada)' },
                      { code: 429, desc: 'Rate limit excedido - aguarde antes de tentar novamente' },
                      { code: 500, desc: 'Erro interno do servidor' },
                    ].map((s) => (
                      <tr key={s.code} className="border-b border-zinc-800/50 last:border-0">
                        <td className="px-5 py-2.5">
                          <code className={`font-mono font-bold ${s.code < 300 ? 'text-green-400' : s.code < 500 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {s.code}
                          </code>
                        </td>
                        <td className="px-5 py-2.5 text-zinc-400">{s.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Footer spacing */}
            <div className="h-24" />
          </div>
        </main>
      </div>
    </div>
  );
}
