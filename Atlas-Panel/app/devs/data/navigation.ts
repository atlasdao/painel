export interface NavItem {
  id: string;
  label: string;
  children?: NavItem[];
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const navigation: NavGroup[] = [
  {
    title: 'GUIA',
    items: [
      { id: 'introducao', label: 'Introducao' },
      { id: 'autenticacao', label: 'Autenticacao' },
      { id: 'inicio-rapido', label: 'Inicio Rapido' },
      { id: 'limites-e-taxas', label: 'Limites e Taxas' },
    ],
  },
  {
    title: 'ENDPOINTS',
    items: [
      { id: 'health-check', label: 'Health Check' },
      { id: 'perfil', label: 'Perfil' },
      {
        id: 'pix',
        label: 'PIX',
        children: [
          { id: 'criar-transacao', label: 'Criar Transacao' },
          { id: 'status-transacao', label: 'Status da Transacao' },
          { id: 'listar-transacoes', label: 'Listar Transacoes' },
          { id: 'cancelar-transacao', label: 'Cancelar Transacao' },
        ],
      },
      {
        id: 'payment-links',
        label: 'Links de Pagamento',
        children: [
          { id: 'criar-link', label: 'Criar Link' },
          { id: 'listar-links', label: 'Listar Links' },
          { id: 'detalhes-link', label: 'Detalhes do Link' },
        ],
      },
      { id: 'estatisticas', label: 'Estatisticas' },
    ],
  },
  {
    title: 'WEBHOOKS & REFERENCIA',
    items: [
      {
        id: 'webhooks',
        label: 'Webhooks',
        children: [
          { id: 'webhook-configuracao', label: 'Configuracao' },
          { id: 'webhook-eventos', label: 'Eventos Disponiveis' },
          { id: 'webhook-payload', label: 'Payload' },
          { id: 'webhook-seguranca', label: 'Seguranca (HMAC)' },
        ],
      },
      { id: 'codigos-status', label: 'Codigos de Status' },
    ],
  },
];

export function getAllSectionIds(): string[] {
  const ids: string[] = [];
  for (const group of navigation) {
    for (const item of group.items) {
      ids.push(item.id);
      if (item.children) {
        for (const child of item.children) {
          ids.push(child.id);
        }
      }
    }
  }
  return ids;
}
