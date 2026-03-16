// Traduções para status de transações
export const transactionStatusTranslations: Record<string, string> = {
  // Transaction Status
  'PENDING': 'Pendente',
  'PROCESSING': 'Pago', // Era "Processando"
  'IN_REVIEW': 'Em Análise',
  'COMPLETED': 'Recebido', // Era "Concluído"
  'FAILED': 'Falhou',
  'CANCELLED': 'Cancelado',
  'EXPIRED': 'Expirado',
  
  // API Key Request Status
  'APPROVED': 'Aprovado',
  'REJECTED': 'Rejeitado',
  'REVOKED': 'Revogado',
  
  // Additional statuses that might appear
  'SUCCESS': 'Sucesso',
  'ERROR': 'Erro',
  'ACTIVE': 'Ativo',
  'INACTIVE': 'Inativo',
  'WAITING': 'Aguardando',
  'CONFIRMED': 'Confirmado',
  'REFUNDED': 'Reembolsado',
};

// Função helper para traduzir status
export function translateStatus(status: string | undefined | null): string {
  if (!status) return '-';
  return transactionStatusTranslations[status.toUpperCase()] || status;
}

// Cores para cada status
export const statusColors: Record<string, string> = {
  'PENDING': 'bg-yellow-100 text-yellow-800',
  'PROCESSING': 'bg-green-100 text-green-800', // Verde para Pago
  'IN_REVIEW': 'bg-purple-100 text-purple-800',
  'COMPLETED': 'bg-blue-100 text-blue-800', // Azul para Recebido
  'FAILED': 'bg-red-100 text-red-800',
  'CANCELLED': 'bg-gray-100 text-gray-800',
  'EXPIRED': 'bg-orange-100 text-orange-800',
  'APPROVED': 'bg-green-100 text-green-800',
  'REJECTED': 'bg-red-100 text-red-800',
  'REVOKED': 'bg-purple-100 text-purple-800',
  'SUCCESS': 'bg-green-100 text-green-800',
  'ERROR': 'bg-red-100 text-red-800',
  'ACTIVE': 'bg-green-100 text-green-800',
  'INACTIVE': 'bg-gray-100 text-gray-800',
  'WAITING': 'bg-yellow-100 text-yellow-800',
  'CONFIRMED': 'bg-green-100 text-green-800',
  'REFUNDED': 'bg-indigo-100 text-indigo-800',
};

// Função helper para obter a cor do status
export function getStatusColor(status: string | undefined | null): string {
  if (!status) return 'bg-gray-100 text-gray-800';
  return statusColors[status.toUpperCase()] || 'bg-gray-100 text-gray-800';
}

// Ícones para cada status (opcional, se quiser usar)
export const statusIcons: Record<string, string> = {
  'PENDING': '⏳',
  'PROCESSING': '⚙️',
  'IN_REVIEW': '🔍',
  'COMPLETED': '✅',
  'FAILED': '❌',
  'CANCELLED': '🚫',
  'EXPIRED': '⏰',
  'APPROVED': '✅',
  'REJECTED': '❌',
  'REVOKED': '🔒',
  'SUCCESS': '✅',
  'ERROR': '❌',
  'ACTIVE': '🟢',
  'INACTIVE': '⚫',
  'WAITING': '⏳',
  'CONFIRMED': '✔️',
  'REFUNDED': '💰',
};

// Função helper para obter o ícone do status
export function getStatusIcon(status: string | undefined | null): string {
  if (!status) return '';
  return statusIcons[status.toUpperCase()] || '';
}