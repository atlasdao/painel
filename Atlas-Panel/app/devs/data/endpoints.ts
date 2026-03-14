export type HttpMethod = 'GET' | 'POST' | 'DELETE';

export interface Param {
  name: string;
  type: string;
  required: boolean;
  description: string;
  example?: string;
}

export interface EndpointDef {
  id: string;
  method: HttpMethod;
  path: string;
  title: string;
  description: string;
  isPublic?: boolean;
  pathParams?: Param[];
  queryParams?: Param[];
  bodyParams?: Param[];
  responseExample: string;
  statusCodes: { code: number; description: string }[];
}

export const BASE_URL = 'https://api.atlasdao.info/api/v1';

export const endpoints: EndpointDef[] = [
  {
    id: 'health-check',
    method: 'GET',
    path: '/external/health',
    title: 'Health Check',
    description: 'Verifica se a API esta online e funcionando. Este endpoint e publico e nao requer autenticacao.',
    isPublic: true,
    responseExample: JSON.stringify({
      status: 'ok',
      timestamp: '2025-01-15T10:30:00.000Z',
      version: '1.0.0',
      service: 'Atlas External API',
    }, null, 2),
    statusCodes: [
      { code: 200, description: 'API esta online e funcionando' },
    ],
  },
  {
    id: 'perfil',
    method: 'GET',
    path: '/external/profile',
    title: 'Perfil do Usuario',
    description: 'Retorna as informacoes do usuario autenticado pela API Key.',
    responseExample: JSON.stringify({
      id: 'usr_abc123',
      username: 'minha_loja',
      email: 'contato@minhaloja.com',
      commerceMode: true,
      paymentLinksEnabled: true,
      isAccountValidated: true,
      createdAt: '2025-01-01T00:00:00.000Z',
    }, null, 2),
    statusCodes: [
      { code: 200, description: 'Perfil retornado com sucesso' },
      { code: 401, description: 'API Key invalida ou ausente' },
    ],
  },
  {
    id: 'criar-transacao',
    method: 'POST',
    path: '/external/pix/create',
    title: 'Criar Transacao PIX',
    description: 'Cria uma nova transacao PIX com QR Code para pagamento. Opcionalmente, configure um webhook para receber notificacoes sobre o status da transacao.',
    bodyParams: [
      { name: 'amount', type: 'number', required: true, description: 'Valor da transacao em BRL (minimo: 0.01)', example: '99.90' },
      { name: 'depixAddress', type: 'string', required: true, description: 'Endereco da wallet DEPIX para receber os fundos', example: 'lq1qq...' },
      { name: 'description', type: 'string', required: false, description: 'Descricao da transacao (max 200 caracteres)', example: 'Pagamento pedido #123' },
      { name: 'taxNumber', type: 'string', required: false, description: 'CPF/CNPJ do pagador. Obrigatorio para valores >= R$ 3.000', example: '123.456.789-01' },
      { name: 'merchantOrderId', type: 'string', required: false, description: 'ID do pedido no seu sistema (max 100 caracteres)', example: 'ORD-2025-12345' },
      { name: 'metadata', type: 'object', required: false, description: 'Metadados adicionais para armazenar com a transacao', example: '{"customerId": "123"}' },
      { name: 'webhook', type: 'WebhookConfig', required: false, description: 'Configuracao do webhook (ver secao Webhooks)', example: '{ url, events, secret?, headers? }' },
    ],
    responseExample: JSON.stringify({
      id: 'txn_abc123def456',
      status: 'PENDING',
      amount: 99.90,
      description: 'Pagamento pedido #123',
      merchantOrderId: 'ORD-2025-12345',
      qrCode: '00020126580014br.gov.bcb.pix0136...',
      qrCodeImage: 'data:image/png;base64,...',
      createdAt: '2025-01-15T10:30:00.000Z',
      expiresAt: '2025-01-15T11:00:00.000Z',
      webhook: {
        id: 'wh_xyz789',
        url: 'https://meusite.com/webhook',
        events: ['transaction.paid'],
        secretHint: 'minh',
      },
    }, null, 2),
    statusCodes: [
      { code: 201, description: 'Transacao criada com sucesso' },
      { code: 400, description: 'Dados invalidos (amount <= 0, taxNumber ausente para >= R$3000)' },
      { code: 401, description: 'API Key invalida ou ausente' },
      { code: 403, description: 'Permissao negada - verifique as permissoes da API Key' },
    ],
  },
  {
    id: 'status-transacao',
    method: 'GET',
    path: '/external/pix/status/:id',
    title: 'Status da Transacao',
    description: 'Consulta o status atual de uma transacao PIX pelo seu ID.',
    pathParams: [
      { name: 'id', type: 'string', required: true, description: 'ID da transacao', example: 'txn_abc123def456' },
    ],
    responseExample: JSON.stringify({
      id: 'txn_abc123def456',
      status: 'COMPLETED',
      type: 'DEPOSIT',
      amount: 99.90,
      description: 'Pagamento pedido #123',
      processedAt: '2025-01-15T10:35:00.000Z',
      createdAt: '2025-01-15T10:30:00.000Z',
      updatedAt: '2025-01-15T10:35:00.000Z',
      merchantOrderId: 'ORD-2025-12345',
      expiresAt: '2025-01-15T11:00:00.000Z',
      metadata: {
        source: 'EXTERNAL_API',
        merchantOrderId: 'ORD-2025-12345',
      },
    }, null, 2),
    statusCodes: [
      { code: 200, description: 'Detalhes da transacao retornados' },
      { code: 401, description: 'API Key invalida ou ausente' },
      { code: 404, description: 'Transacao nao encontrada' },
    ],
  },
  {
    id: 'listar-transacoes',
    method: 'GET',
    path: '/external/pix/transactions',
    title: 'Listar Transacoes',
    description: 'Lista todas as transacoes PIX do usuario com filtros e paginacao.',
    queryParams: [
      { name: 'status', type: 'string', required: false, description: 'Filtrar por status (PENDING, COMPLETED, FAILED, EXPIRED, CANCELLED)', example: 'COMPLETED' },
      { name: 'type', type: 'string', required: false, description: 'Filtrar por tipo de transacao', example: 'PIX' },
      { name: 'startDate', type: 'string', required: false, description: 'Data inicial (ISO 8601)', example: '2025-01-01T00:00:00Z' },
      { name: 'endDate', type: 'string', required: false, description: 'Data final (ISO 8601)', example: '2025-01-31T23:59:59Z' },
      { name: 'merchantOrderId', type: 'string', required: false, description: 'Filtrar por ID do pedido', example: 'ORD-2025-12345' },
      { name: 'page', type: 'number', required: false, description: 'Numero da pagina (padrao: 1)', example: '1' },
      { name: 'limit', type: 'number', required: false, description: 'Itens por pagina (padrao: 20, max: 100)', example: '20' },
    ],
    responseExample: JSON.stringify({
      data: [
        {
          id: 'txn_abc123',
          status: 'COMPLETED',
          type: 'DEPOSIT',
          amount: 99.90,
          description: 'Pagamento pedido #123',
          pixKey: 'lq1qq...',
          processedAt: '2025-01-15T10:35:00.000Z',
          createdAt: '2025-01-15T10:30:00.000Z',
          updatedAt: '2025-01-15T10:35:00.000Z',
          merchantOrderId: 'ORD-2025-12345',
          expiresAt: '2025-01-15T11:00:00.000Z',
          metadata: {
            source: 'EXTERNAL_API',
            merchantOrderId: 'ORD-2025-12345',
          },
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 45,
        totalPages: 3,
      },
    }, null, 2),
    statusCodes: [
      { code: 200, description: 'Lista de transacoes retornada' },
      { code: 401, description: 'API Key invalida ou ausente' },
    ],
  },
  {
    id: 'cancelar-transacao',
    method: 'DELETE',
    path: '/external/pix/cancel/:id',
    title: 'Cancelar Transacao',
    description: 'Cancela uma transacao PIX pendente. Somente transacoes com status PENDING podem ser canceladas.',
    pathParams: [
      { name: 'id', type: 'string', required: true, description: 'ID da transacao a cancelar', example: 'txn_abc123def456' },
    ],
    responseExample: JSON.stringify({
      id: 'txn_abc123def456',
      status: 'CANCELLED',
      message: 'Transaction cancelled successfully',
    }, null, 2),
    statusCodes: [
      { code: 200, description: 'Transacao cancelada com sucesso' },
      { code: 401, description: 'API Key invalida ou ausente' },
      { code: 404, description: 'Transacao nao encontrada ou ja processada' },
    ],
  },
  {
    id: 'criar-link',
    method: 'POST',
    path: '/external/payment-links',
    title: 'Criar Link de Pagamento',
    description: 'Cria um novo link de pagamento. Links podem ter valor fixo ou permitir que o cliente escolha o valor (dentro de um range opcional).',
    bodyParams: [
      { name: 'title', type: 'string', required: true, description: 'Titulo do link (validado pelo servidor)', example: 'Produto Exemplo' },
      { name: 'description', type: 'string', required: false, description: 'Descricao do link (exibida na resposta)', example: 'Descricao do produto' },
      { name: 'amount', type: 'number', required: false, description: 'Valor fixo em BRL (obrigatorio se isCustomAmount = false)', example: '99.90' },
      { name: 'isCustomAmount', type: 'boolean', required: false, description: 'Se true, permite valor livre (padrao: false)', example: 'true' },
      { name: 'minAmount', type: 'number', required: false, description: 'Valor minimo para links com valor livre', example: '10.00' },
      { name: 'maxAmount', type: 'number', required: false, description: 'Valor maximo para links com valor livre', example: '500.00' },
      { name: 'walletAddress', type: 'string', required: true, description: 'Endereco da wallet para recebimento (ou depixAddress)', example: 'lq1qq...' },
    ],
    responseExample: JSON.stringify({
      id: '0c95a1a8-3be9-4f15-a8c5-0320ecbdc376',
      shortCode: '8v6ZOWBH',
      amount: 99.90,
      isCustomAmount: false,
      minAmount: null,
      maxAmount: null,
      description: 'Descricao do produto',
      isActive: true,
      expiresAt: null,
      createdAt: '2025-01-15T10:30:00.000Z',
      paymentUrl: 'https://painel.atlasdao.info/pay/8v6ZOWBH',
    }, null, 2),
    statusCodes: [
      { code: 201, description: 'Link criado com sucesso' },
      { code: 400, description: 'Dados invalidos (titulo ausente, amount invalido)' },
      { code: 401, description: 'API Key invalida ou ausente' },
      { code: 403, description: 'Links de pagamento nao habilitados para este usuario' },
    ],
  },
  {
    id: 'listar-links',
    method: 'GET',
    path: '/external/payment-links',
    title: 'Listar Links de Pagamento',
    description: 'Lista todos os links de pagamento do usuario com filtros e paginacao.',
    queryParams: [
      { name: 'isActive', type: 'boolean', required: false, description: 'Filtrar por status ativo/inativo', example: 'true' },
      { name: 'page', type: 'number', required: false, description: 'Numero da pagina (padrao: 1)', example: '1' },
      { name: 'limit', type: 'number', required: false, description: 'Itens por pagina (padrao: 20, max: 100)', example: '20' },
    ],
    responseExample: JSON.stringify({
      data: [
        {
          id: '0c95a1a8-3be9-4f15-a8c5-0320ecbdc376',
          shortCode: '8v6ZOWBH',
          description: 'Descricao do produto',
          amount: 99.90,
          isCustomAmount: false,
          minAmount: null,
          maxAmount: null,
          totalPayments: 12,
          totalAmount: 1198.80,
          isActive: true,
          expiresAt: null,
          createdAt: '2025-01-15T10:30:00.000Z',
          updatedAt: '2025-01-15T10:30:00.000Z',
          currentUses: 12,
          paymentUrl: 'https://painel.atlasdao.info/pay/8v6ZOWBH',
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 5,
        totalPages: 1,
      },
    }, null, 2),
    statusCodes: [
      { code: 200, description: 'Lista de links retornada' },
      { code: 401, description: 'API Key invalida ou ausente' },
    ],
  },
  {
    id: 'detalhes-link',
    method: 'GET',
    path: '/external/payment-links/:id',
    title: 'Detalhes do Link',
    description: 'Retorna os detalhes completos de um link de pagamento especifico.',
    pathParams: [
      { name: 'id', type: 'string', required: true, description: 'ID do link de pagamento', example: '0c95a1a8-3be9-4f15-a8c5-0320ecbdc376' },
    ],
    responseExample: JSON.stringify({
      id: '0c95a1a8-3be9-4f15-a8c5-0320ecbdc376',
      shortCode: '8v6ZOWBH',
      description: 'Descricao do produto',
      amount: 99.90,
      isCustomAmount: false,
      minAmount: null,
      maxAmount: null,
      currentUses: 12,
      totalAmount: 1198.80,
      isActive: true,
      expiresAt: null,
      createdAt: '2025-01-15T10:30:00.000Z',
      updatedAt: '2025-01-15T10:30:00.000Z',
      paymentUrl: 'https://painel.atlasdao.info/pay/8v6ZOWBH',
    }, null, 2),
    statusCodes: [
      { code: 200, description: 'Detalhes do link retornados' },
      { code: 401, description: 'API Key invalida ou ausente' },
      { code: 404, description: 'Link nao encontrado' },
    ],
  },
  {
    id: 'estatisticas',
    method: 'GET',
    path: '/external/stats/usage',
    title: 'Estatisticas de Uso',
    description: 'Retorna estatisticas de uso da API do usuario para um periodo especificado.',
    queryParams: [
      { name: 'days', type: 'number', required: false, description: 'Numero de dias para incluir (padrao: 30, max: 90)', example: '30' },
    ],
    responseExample: JSON.stringify({
      period: {
        start: '2025-01-01T00:00:00.000Z',
        end: '2025-01-31T23:59:59.000Z',
        days: 30,
      },
      summary: {
        totalRequests: 1240,
        successfulRequests: 1235,
        errorRate: '0.40%',
        transactionsCreated: 156,
        paymentLinksCreated: 12,
      },
      dailyUsage: {
        '2025-01-29': 45,
        '2025-01-30': 52,
        '2025-01-31': 38,
      },
      limits: {
        requestsPerMinute: 100,
        requestsPerDay: 10000,
        usageType: 'MULTIPLE_CPF',
      },
    }, null, 2),
    statusCodes: [
      { code: 200, description: 'Estatisticas retornadas com sucesso' },
      { code: 401, description: 'API Key invalida ou ausente' },
    ],
  },
];
