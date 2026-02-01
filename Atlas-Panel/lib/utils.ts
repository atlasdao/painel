export const formatCurrency = (value: number | string) => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(numValue);
};

// Timezone de São Paulo para todas as datas
const TIMEZONE = 'America/Sao_Paulo';

export const formatDate = (date: string | Date) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIMEZONE
  }).format(dateObj);
};

export const formatDateShort = (date: string | Date) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIMEZONE
  }).format(dateObj);
};

export const formatDateOnly = (date: string | Date) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: TIMEZONE
  }).format(dateObj);
};

export const formatTimeOnly = (date: string | Date) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIMEZONE
  }).format(dateObj);
};

export const formatRelativeDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 1) {
    const diffInMinutes = Math.floor(diffInHours * 60);
    return `${diffInMinutes}min atrás`;
  } else if (diffInHours < 24) {
    return `${Math.floor(diffInHours)}h atrás`;
  } else {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: TIMEZONE
    }).format(date);
  }
};

export const formatNumber = (value: number) => {
  return new Intl.NumberFormat('pt-BR').format(value);
};

export const cn = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(' ');
};

// Status colors and texts for transactions
export type TransactionStatus = 'PENDING' | 'PROCESSING' | 'IN_REVIEW' | 'COMPLETED' | 'FAILED' | 'EXPIRED' | 'CANCELLED';

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'COMPLETED':
      return 'text-blue-400 bg-blue-400/10'; // Azul para Recebido
    case 'PROCESSING':
      return 'text-green-400 bg-green-400/10'; // Verde para Pago
    case 'IN_REVIEW':
      return 'text-purple-400 bg-purple-400/10';
    case 'PENDING':
      return 'text-yellow-400 bg-yellow-400/10';
    case 'FAILED':
    case 'CANCELLED':
      return 'text-red-400 bg-red-400/10';
    case 'EXPIRED':
      return 'text-orange-400 bg-orange-400/10'; // Laranja para Expirado
    default:
      return 'text-gray-400 bg-gray-400/10';
  }
};

export const getStatusText = (status: string): string => {
  switch (status) {
    case 'COMPLETED':
      return 'Recebido'; // Era "Concluído"
    case 'PROCESSING':
      return 'Pago'; // Era "Processando"
    case 'IN_REVIEW':
      return 'Em Análise';
    case 'PENDING':
      return 'Pendente';
    case 'FAILED':
      return 'Falhou';
    case 'CANCELLED':
      return 'Cancelado';
    case 'EXPIRED':
      return 'Expirado';
    default:
      return 'Desconhecido';
  }
};

// For badge/pill styling
export const getStatusBadgeClass = (status: string): string => {
  switch (status) {
    case 'COMPLETED':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30'; // Azul para Recebido
    case 'PROCESSING':
      return 'bg-green-500/20 text-green-400 border-green-500/30'; // Verde para Pago
    case 'IN_REVIEW':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'PENDING':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'FAILED':
    case 'CANCELLED':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'EXPIRED':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/30'; // Laranja para Expirado
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
};
