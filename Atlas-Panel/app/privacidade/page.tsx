'use client';

import Link from 'next/link';
import Image from 'next/image';
import Footer from '../components/landing/Footer';

export default function PrivacyPage() {
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
            <h1 className="text-3xl font-bold text-white mb-8">Política de Privacidade</h1>

            <div className="space-y-8 text-gray-300">
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">1. Informações Gerais</h2>
                <div className="space-y-3 text-sm leading-relaxed">
                  <p>
                    A Atlas respeita sua privacidade e está comprometida com a proteção de seus dados pessoais.
                    Esta política explica como coletamos, usamos, armazenamos e protegemos suas informações.
                  </p>
                  <p>
                    Operamos sob jurisdição internacional com total conformidade às leis de proteção de dados
                    aplicáveis, incluindo a LGPD (Lei Geral de Proteção de Dados) do Brasil.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">2. Dados Coletados</h2>
                <div className="space-y-4 text-sm leading-relaxed">
                  <div>
                    <h3 className="font-semibold text-white mb-2">Dados de Cadastro:</h3>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Nome de usuário</li>
                      <li>Endereço de email</li>
                      <li>Senha (armazenada criptografada)</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-white mb-2">Dados de Uso:</h3>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Endereço IP e localização aproximada</li>
                      <li>Informações do dispositivo e navegador</li>
                      <li>Páginas visitadas e tempo de uso</li>
                      <li>Ações realizadas na plataforma</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-white mb-2">Dados de Transações:</h3>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Valores e datas de pagamentos</li>
                      <li>Códigos PIX gerados</li>
                      <li>Status de transações</li>
                      <li>Dados do pagador (quando fornecidos)</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">3. Como Usamos Seus Dados</h2>
                <div className="space-y-3 text-sm leading-relaxed">
                  <h3 className="font-semibold text-white mb-2">Finalidades Principais:</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Processar transações e pagamentos PIX</li>
                    <li>Manter e melhorar nossos serviços</li>
                    <li>Prevenir fraudes e garantir segurança</li>
                    <li>Comunicar sobre atualizações importantes</li>
                    <li>Oferecer suporte técnico</li>
                    <li>Cumprir obrigações legais e regulatórias</li>
                  </ul>

                  <h3 className="font-semibold text-white mb-2 mt-4">Marketing (Opcional):</h3>
                  <p>
                    Enviamos comunicações promocionais apenas com seu consentimento explícito.
                    Você pode cancelar a qualquer momento através do link de descadastro.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">4. Base Legal para Processamento</h2>
                <div className="space-y-3 text-sm leading-relaxed">
                  <ul className="list-disc pl-6 space-y-1">
                    <li><strong>Execução de Contrato:</strong> Para fornecer nossos serviços de pagamento</li>
                    <li><strong>Interesse Legítimo:</strong> Para prevenir fraudes e melhorar a plataforma</li>
                    <li><strong>Obrigação Legal:</strong> Para cumprir regulamentações financeiras</li>
                    <li><strong>Consentimento:</strong> Para comunicações de marketing e cookies não essenciais</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">5. Compartilhamento de Dados</h2>
                <div className="space-y-3 text-sm leading-relaxed">
                  <p><strong>Não vendemos seus dados.</strong> Compartilhamos informações apenas quando necessário:</p>

                  <h3 className="font-semibold text-white mb-2">Provedores de Serviço:</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Instituições financeiras para processamento PIX</li>
                    <li>Provedores de segurança e antifraude</li>
                    <li>Serviços de hospedagem e infraestrutura</li>
                    <li>Ferramentas de suporte e comunicação</li>
                  </ul>

                  <h3 className="font-semibold text-white mb-2 mt-4">Autoridades:</h3>
                  <p>
                    Quando exigido por lei, ordem judicial ou para proteger direitos legais,
                    compartilhamos informações com autoridades competentes.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">6. Segurança dos Dados</h2>
                <div className="space-y-3 text-sm leading-relaxed">
                  <h3 className="font-semibold text-white mb-2">Medidas Técnicas:</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Criptografia SSL/TLS em todas as comunicações</li>
                    <li>Senhas protegidas com hash e salt</li>
                    <li>Dados sensíveis criptografados no banco</li>
                    <li>Autenticação de dois fatores (2FA)</li>
                    <li>Monitoramento contínuo de segurança</li>
                  </ul>

                  <h3 className="font-semibold text-white mb-2 mt-4">Medidas Organizacionais:</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Acesso limitado a dados por função</li>
                    <li>Treinamento regular da equipe</li>
                    <li>Auditorias periódicas de segurança</li>
                    <li>Backups seguros e criptografados</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">7. Retenção de Dados</h2>
                <div className="space-y-3 text-sm leading-relaxed">
                  <ul className="list-disc pl-6 space-y-1">
                    <li><strong>Dados de Conta:</strong> Mantidos enquanto a conta estiver ativa</li>
                    <li><strong>Dados Transacionais:</strong> Armazenados por 5 anos (exigência legal)</li>
                    <li><strong>Logs de Acesso:</strong> Mantidos por 12 meses</li>
                    <li><strong>Dados de Marketing:</strong> Removidos ao cancelar consentimento</li>
                  </ul>
                  <p>
                    Após os períodos de retenção, dados são anonimizados ou excluídos de forma segura,
                    exceto quando a manutenção for exigida por lei.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">8. Seus Direitos</h2>
                <div className="space-y-3 text-sm leading-relaxed">
                  <p>Conforme a LGPD e outras leis aplicáveis, você tem direito a:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li><strong>Acesso:</strong> Solicitar cópia dos seus dados</li>
                    <li><strong>Retificação:</strong> Corrigir dados incorretos</li>
                    <li><strong>Exclusão:</strong> Solicitar remoção dos dados</li>
                    <li><strong>Portabilidade:</strong> Receber dados em formato estruturado</li>
                    <li><strong>Oposição:</strong> Contestar o processamento</li>
                    <li><strong>Limitação:</strong> Restringir certas atividades de processamento</li>
                    <li><strong>Revogação:</strong> Retirar consentimento a qualquer momento</li>
                  </ul>

                  <p className="mt-4">
                    Para exercer esses direitos, entre em contato através do Telegram:
                    <a href="https://t.me/atlasDAO_support" className="text-blue-400 hover:text-blue-300">
                      @atlasDAO_support
                    </a>
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">9. Transferência Internacional</h2>
                <div className="space-y-3 text-sm leading-relaxed">
                  <p>
                    Seus dados podem ser transferidos e processados fora do Brasil, onde a Atlas opera.
                    Garantimos proteção adequada através de:
                  </p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Contratos de proteção de dados</li>
                    <li>Certificações de segurança</li>
                    <li>Conformidade com padrões internacionais</li>
                    <li>Medidas técnicas e organizacionais adequadas</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">10. Cookies e Tecnologias Similares</h2>
                <div className="space-y-3 text-sm leading-relaxed">
                  <h3 className="font-semibold text-white mb-2">Cookies Essenciais:</h3>
                  <p>Necessários para funcionamento básico da plataforma (login, segurança, preferências).</p>

                  <h3 className="font-semibold text-white mb-2 mt-4">Cookies Analíticos:</h3>
                  <p>
                    Usados para entender como você interage com nossa plataforma e melhorar a experiência.
                    Você pode optar por não recebê-los.
                  </p>

                  <p className="mt-4">
                    Gerencia suas preferências de cookies através das configurações do seu navegador.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">11. Menores de Idade</h2>
                <div className="space-y-3 text-sm leading-relaxed">
                  <p>
                    Nossos serviços são destinados a maiores de 18 anos. Não coletamos intencionalmente
                    dados de menores de idade.
                  </p>
                  <p>
                    Se identificarmos dados de menor coletados inadvertidamente, tomaremos medidas
                    para removê-los prontamente.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">12. Alterações na Política</h2>
                <div className="space-y-3 text-sm leading-relaxed">
                  <p>
                    Esta política pode ser atualizada para refletir mudanças em nossos serviços
                    ou requisitos legais.
                  </p>
                  <p>
                    Alterações significativas serão comunicadas por email com 30 dias de antecedência.
                    Continuidade do uso após alterações constitui aceitação da nova política.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">13. Contato e Encarregado</h2>
                <div className="space-y-3 text-sm leading-relaxed">
                  <p>Para questões sobre privacidade e proteção de dados:</p>
                  <ul className="list-none space-y-1">
                    <li><strong>Telegram:</strong> <a href="https://t.me/atlasDAO_support" className="text-blue-400 hover:text-blue-300">@atlasDAO_support</a></li>
                    <li><strong>GitHub:</strong> <a href="https://github.com/atlasdao" className="text-blue-400 hover:text-blue-300">github.com/atlasdao</a></li>
                  </ul>

                  <p className="mt-4">
                    Se não ficar satisfeito com nossa resposta, você pode registrar reclamação
                    junto à Autoridade Nacional de Proteção de Dados (ANPD).
                  </p>
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