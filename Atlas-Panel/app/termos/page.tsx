'use client';

import Link from 'next/link';
import Image from 'next/image';
import Footer from '../components/landing/Footer';

export default function TermsPage() {
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

            <div className="flex items-center gap-6">
              <Link href="/" className="text-gray-300 hover:text-white font-medium transition-colors">
                Voltar ao Site
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
            <h1 className="text-3xl font-bold text-white mb-8">Termos de Uso</h1>

            <div className="space-y-8 text-gray-300">
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">1. Sobre o Serviço</h2>
                <div className="space-y-3 text-sm leading-relaxed">
                  <p>
                    A Atlas é uma plataforma de pagamentos digitais que facilita transações PIX para comerciantes brasileiros.
                    Operamos sob jurisdição internacional, proporcionando serviços seguros e eficientes.
                  </p>
                  <p>
                    Nosso serviço permite criar links de pagamento, gerar QR Codes PIX e receber pagamentos instantâneos
                    com taxa fixa de R$ 0,99 por transação.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">2. Aceitação dos Termos</h2>
                <div className="space-y-3 text-sm leading-relaxed">
                  <p>
                    Ao criar uma conta ou usar nossos serviços, você concorda com estes termos integralmente.
                    Se não concordar, não utilize a plataforma.
                  </p>
                  <p>
                    Reservamo-nos o direito de alterar estes termos a qualquer momento, notificando usuários
                    através do email cadastrado com 30 dias de antecedência.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">3. Elegibilidade e Cadastro</h2>
                <div className="space-y-3 text-sm leading-relaxed">
                  <p>Para usar nossos serviços, você deve:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Ser maior de 18 anos ou ter autorização legal</li>
                    <li>Fornecer informações verdadeiras e atualizadas</li>
                    <li>Ter uma conta bancária brasileira ativa (para recebimento via PIX)</li>
                    <li>Não estar em listas de restrição financeira</li>
                  </ul>
                  <p>
                    Você é responsável pela segurança de sua conta e senha. Notifique-nos imediatamente
                    sobre qualquer uso não autorizado.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">4. Serviços Oferecidos</h2>
                <div className="space-y-3 text-sm leading-relaxed">
                  <p><strong>Links de Pagamento:</strong> Criação de URLs personalizadas para recebimento via PIX.</p>
                  <p><strong>QR Codes:</strong> Geração automática de códigos PIX para pagamentos instantâneos.</p>
                  <p><strong>Painel de Controle:</strong> Interface para gerenciar transações e acompanhar recebimentos.</p>
                  <p><strong>API:</strong> Integração técnica para desenvolvedores (mediante solicitação).</p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">5. Taxas e Pagamentos</h2>
                <div className="space-y-3 text-sm leading-relaxed">
                  <p>
                    <strong>Taxa por Transação:</strong> R$ 0,99 por pagamento recebido com sucesso.
                  </p>
                  <p>
                    <strong>Sem Taxa de Adesão:</strong> Não cobramos mensalidade ou taxa de cadastro.
                  </p>
                  <p>
                    <strong>Repasse:</strong> O valor líquido (valor pago - R$ 0,99) é creditado
                    instantaneamente em sua conta PIX cadastrada.
                  </p>
                  <p>
                    As taxas podem ser alteradas a qualquer momento com aviso prévio de 7 dias via email.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">6. Uso Proibido</h2>
                <div className="space-y-3 text-sm leading-relaxed">
                  <p>É expressamente proibido usar nossos serviços para:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Atividades ilegais ou que violem leis brasileiras</li>
                    <li>Venda de produtos proibidos (drogas, armas, etc.)</li>
                    <li>Lavagem de dinheiro ou financiamento de atividades ilícitas</li>
                    <li>Fraudes, golpes ou atividades enganosas</li>
                    <li>Violação de direitos autorais ou propriedade intelectual</li>
                    <li>Spam ou comunicações não solicitadas</li>
                  </ul>
                  <p>
                    Violações resultam em suspensão imediata e possível retenção de fundos
                    para investigação.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">7. Segurança e Responsabilidades</h2>
                <div className="space-y-3 text-sm leading-relaxed">
                  <p>
                    <strong>Nossa Responsabilidade:</strong> Manter a plataforma segura, processar transações
                    corretamente e proteger dados conforme nossa Política de Privacidade.
                  </p>
                  <p>
                    <strong>Sua Responsabilidade:</strong> Proteger credenciais de acesso, usar a plataforma
                    conforme os termos e notificar sobre problemas.
                  </p>
                  <p>
                    <strong>Limitação:</strong> Não nos responsabilizamos por perdas decorrentes de uso
                    inadequado, força maior ou falhas de terceiros (bancos, internet, etc.).
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">8. Suspensão e Encerramento</h2>
                <div className="space-y-3 text-sm leading-relaxed">
                  <p>
                    <strong>Bloqueio de Contas:</strong> Reservamo-nos o direito de bloquear qualquer conta
                    por qualquer motivo, sem aviso prévio. Se existirem fundos na conta:
                  </p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li><strong>Fundos legítimos:</strong> Serão devolvidos ao usuário</li>
                    <li><strong>Fundos ilegítimos:</strong> Serão estornados aos pagadores originais ou mantidos conforme determinação legal</li>
                  </ul>
                  <p>
                    Podemos suspender ou encerrar contas em casos de violação dos termos,
                    atividade suspeita, determinação legal ou a nosso critério exclusivo.
                  </p>
                  <p>
                    Você pode encerrar sua conta a qualquer momento através do painel de controle
                    ou solicitação por email.
                  </p>
                  <p>
                    O processamento de fundos após bloqueio ou encerramento pode levar até 30 dias
                    para investigações e procedimentos de segurança.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">9. Propriedade Intelectual</h2>
                <div className="space-y-3 text-sm leading-relaxed">
                  <p>
                    Todos os direitos sobre a plataforma Atlas, incluindo software, design,
                    marcas e conteúdo, pertencem à Atlas ou seus licenciadores.
                  </p>
                  <p>
                    É concedida licença limitada para uso dos serviços conforme estes termos.
                    Não é permitido copiar, modificar ou redistribuir nossa tecnologia.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">10. Resolução de Disputas</h2>
                <div className="space-y-3 text-sm leading-relaxed">
                  <p>
                    Para disputas relacionadas ao serviço, entre em contato pelo Telegram:
                    <a href="https://t.me/atlasDAO_support" className="text-blue-400 hover:text-blue-300">
                      @atlasDAO_support
                    </a>
                  </p>
                  <p>
                    Disputas não resolvidas serão submetidas à arbitragem conforme a jurisdição
                    internacional da Atlas, respeitando direitos do consumidor brasileiro.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">11. Jurisdição e Lei Aplicável</h2>
                <div className="space-y-3 text-sm leading-relaxed">
                  <p>
                    A Atlas opera sob jurisdição internacional. Para usuários brasileiros,
                    aplicam-se as leis de proteção ao consumidor do Brasil quando cabível.
                  </p>
                  <p>
                    Estes termos são regidos pelas leis da jurisdição da Atlas, com ressalvas
                    aos direitos inalienáveis do consumidor brasileiro.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">12. Contato</h2>
                <div className="space-y-3 text-sm leading-relaxed">
                  <p>Para dúvidas sobre estes termos ou nossos serviços:</p>
                  <ul className="list-none space-y-1">
                    <li><strong>Telegram:</strong> <a href="https://t.me/atlasDAO_support" className="text-blue-400 hover:text-blue-300">@atlasDAO_support</a></li>
                    <li><strong>GitHub:</strong> <a href="https://github.com/atlasdao" className="text-blue-400 hover:text-blue-300">github.com/atlasdao</a></li>
                  </ul>
                </div>
              </section>

              <div className="text-center pt-8 border-t border-gray-700">
                <p className="text-sm text-gray-400">
                  Última atualização: {new Date().toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}