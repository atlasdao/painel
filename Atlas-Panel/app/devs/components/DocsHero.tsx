import { Zap, LinkIcon, Webhook, BarChart3 } from 'lucide-react';

const cards = [
  { icon: Zap, title: 'PIX Instantaneo', description: 'QR Codes e pagamentos em tempo real', anchor: 'criar-transacao' },
  { icon: LinkIcon, title: 'Links de Pagamento', description: 'Links compartilhaveis com valor fixo ou livre', anchor: 'criar-link' },
  { icon: Webhook, title: 'Webhooks', description: 'Notificacoes em tempo real de eventos', anchor: 'webhook-configuracao' },
  { icon: BarChart3, title: 'Estatisticas', description: 'Metricas de uso e volume', anchor: 'estatisticas' },
];

export default function DocsHero() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="py-12 border-b border-zinc-800">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold text-zinc-50 mb-3">
          Atlas <span className="text-blue-400">API</span>
        </h1>
        <p className="text-lg text-zinc-400 mb-6 max-w-2xl">
          Integre pagamentos PIX na sua aplicacao em minutos.
        </p>

        {/* Base URL */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 mb-8 inline-flex items-center gap-3">
          <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Base URL</span>
          <code className="text-blue-400 text-sm font-mono">https://api.atlasdao.info/api/v1</code>
        </div>

        {/* Discovery cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.anchor}
                onClick={() => scrollTo(card.anchor)}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-left hover:border-zinc-700 transition-colors group"
              >
                <Icon className="w-8 h-8 text-blue-400 mb-3 group-hover:text-blue-300 transition-colors" />
                <h3 className="text-sm font-semibold text-zinc-50 mb-1">{card.title}</h3>
                <p className="text-xs text-zinc-500">{card.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
