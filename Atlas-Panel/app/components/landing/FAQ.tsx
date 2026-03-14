'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    q: 'Quanto custa usar a Atlas?',
    a: 'Voce paga apenas 0,5% + R$ 0,99 por transacao no D+1, ou 0,8% + R$ 0,99 com recebimento instantaneo. Nao existe mensalidade, taxa de adesao ou custos ocultos. Voce so paga quando recebe.',
  },
  {
    q: 'Preciso enviar documentos para comecar?',
    a: 'Nao. Basta criar uma conta com email e senha e voce ja pode comecar a receber pagamentos imediatamente. Sem documentos, sem analise de credito, sem tempo de espera.',
  },
  {
    q: 'Como meus clientes pagam?',
    a: 'Voce cria um link de pagamento e compartilha com seu cliente por WhatsApp, Instagram, email ou qualquer outro canal. O cliente abre o link, ve o QR Code do PIX e paga pelo app do banco dele. Simples assim.',
  },
  {
    q: 'Qual a diferenca entre D+1 e Instantaneo?',
    a: 'No D+1 (taxa de 0,5%), o valor da venda e liberado 24 horas apos a transacao. Fazemos duas remessas por dia: as 6h da manha e as 6h da tarde. Seu dinheiro cai na remessa mais proxima apos completar as 24h. No instantaneo (taxa de 0,8%), o dinheiro cai na sua conta em minutos. Ambas as opcoes incluem todas as funcionalidades.',
  },
  {
    q: 'Meus dados financeiros ficam seguros?',
    a: 'Sim. Diferente de outros gateways, a Atlas nunca vende ou compartilha seus dados. Privacidade e nosso compromisso principal. Seus dados pessoais e financeiros ficam protegidos e nunca sao usados para fins comerciais.',
  },
  {
    q: 'Posso usar a Atlas para vender pelo Instagram e WhatsApp?',
    a: 'Sim! Essa e uma das formas mais comuns de uso. Voce cria um link de pagamento no painel, copia e envia diretamente para o cliente na conversa. Funciona perfeitamente para vendas por redes sociais e mensageiros.',
  },
  {
    q: 'Tem limite de vendas ou de transacoes?',
    a: 'Nao impomos limites artificiais. Voce pode criar quantos links de pagamento quiser e receber quantas transacoes precisar. A Atlas foi feita para acompanhar o crescimento do seu negocio.',
  },
  {
    q: 'E se eu tiver problemas, tem suporte?',
    a: 'Sim, nosso suporte funciona 24/7. Voce pode entrar em contato a qualquer momento e nossa equipe vai te ajudar com rapidez.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (i: number) => {
    setOpenIndex(openIndex === i ? null : i);
  };

  return (
    <section id="faq" className="py-16 sm:py-24 md:py-32">
      <div className="max-w-2xl mx-auto px-5 sm:px-6">
        <div className="text-center mb-10 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-zinc-50">
            Perguntas frequentes
          </h2>
          <p className="text-zinc-400 mt-3 text-sm sm:text-base">
            Tire suas duvidas antes de comecar.
          </p>
        </div>

        <div className="divide-y divide-zinc-800">
          {faqs.map((faq, i) => (
            <div key={i} className="py-4 sm:py-5">
              <button
                onClick={() => toggle(i)}
                className="w-full flex items-center justify-between text-left gap-4"
              >
                <span className="text-sm sm:text-base text-zinc-50 font-medium">{faq.q}</span>
                <ChevronDown
                  className={`w-5 h-5 text-zinc-500 shrink-0 transition-transform duration-200 ${
                    openIndex === i ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === i ? 'max-h-48 mt-3' : 'max-h-0'
                }`}
              >
                <p className="text-zinc-400 text-sm leading-relaxed">{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
