"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const config_1 = require("@nestjs/config");
const app_module_1 = require("./app.module");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const logging_interceptor_1 = require("./common/interceptors/logging.interceptor");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });
    const configService = app.get(config_1.ConfigService);
    const port = configService.get('PORT', 19997);
    const nodeEnv = configService.get('NODE_ENV', 'development');
    app.enableCors({
        origin: '*',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    });
    app.enableVersioning({
        type: common_1.VersioningType.URI,
        defaultVersion: '1',
    });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));
    app.useGlobalFilters(new http_exception_filter_1.HttpExceptionFilter());
    app.useGlobalInterceptors(new logging_interceptor_1.LoggingInterceptor());
    const config = new swagger_1.DocumentBuilder()
        .setTitle('API Atlas Bridge - Gateway de Pagamentos PIX/DePix')
        .setDescription(`

## A Ponte para Sua Soberania Financeira

Esta é a documentação oficial da API do **Atlas Bridge**, a primeira iniciativa da Atlas DAO. Nossa missão é fornecer uma interface de **minimização de confiança** entre o sistema Pix e a Liquid Network, projetada para a sua autonomia.

### Princípios Essenciais:
- **🔐 Autenticação Dupla e Segura**: Suporte a JWT para sessões web e API Keys para integrações de servidor.
- **🌉 Ponte PIX <> DePix**: Conversão instantânea de Reais (BRL) para ativos digitais na Liquid Network.
- **⚖️ Gestão Completa de Transações**: Histórico completo com auditoria e rastreabilidade de ponta a ponta.
- **🇧🇷 Conformidade com Padrões Nacionais**: Integração robusta e segura com o ecossistema PIX.
- **📖 Código Aberto e Auditável**: Construído sob a licença GPLv3 para total transparência e liberdade.

---

### Para Desenvolvedores:
Use esta API como um gateway completo para integrar pagamentos Pix em suas aplicações. Você precisa de uma chave API, solicite em [https://painel.atlasdao.info/api](https://painel.atlasdao.info/api)

*Construído pela Atlas DAO para fortalecer a soberania financeira da comunidade brasileira. 🇧🇷*
    `)
        .setVersion('1.0')
        .addBearerAuth()
        .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' })
        .addTag('Autenticação', 'Gestão de usuários, login e tokens de acesso')
        .addTag('Operações PIX', 'Endpoints para depósitos, saques e transferências via PIX')
        .addTag('Gestão de Transações', 'Consulta de status e histórico de transações')
        .addTag('Gestão de Usuários', 'Perfis de usuário e configurações')
        .addTag('Admin: Limites de Usuários', 'Controle administrativo de limites de transação (Compliance MED)')
        .addTag('Admin: Sistema', 'Gerenciamento e estatísticas do sistema')
        .addTag('Saúde da Conexão PIX', 'Verificação de conectividade com a infraestrutura PIX')
        .setContact('Suporte Atlas DAO', 'https://atlasdao.info', 'contato@atlasdao.info')
        .setLicense('GPLv3', 'https://www.gnu.org/licenses/gpl-3.0.html')
        .setExternalDoc('Comunidade no Telegram', 'https://t.me/+x0no8ursVlZhOTI5')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    const customCss = `
    /* Importa a fonte Inter para um visual mais moderno */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    :root {
      --atlas-dark-bg: #111827;      /* bg-gray-900 */
      --atlas-surface-bg: #1f2937; /* bg-gray-800 */
      --atlas-border: #374151;      /* border-gray-700 */
      --atlas-text-primary: #f9fafb; /* text-gray-50 */
      --atlas-text-secondary: #d1d5db;/* text-gray-300 */
      --atlas-text-muted: #9ca3af;   /* text-gray-400 */
      --atlas-accent: #3b82f6;      /* text-blue-500 */
    }
    
    /* Tema Dark Principal - Estilo Material */
    body, .swagger-ui {
      background-color: var(--atlas-dark-bg) !important;
      color: var(--atlas-text-secondary) !important;
      font-family: 'Inter', sans-serif !important;
    }
    .swagger-ui .scheme-container, .swagger-ui .wrapper {
      background-color: var(--atlas-dark-bg) !important;
    }

    /* Cabeçalho e Títulos com Contraste Alto */
    .swagger-ui .topbar { display: none !important; }
    .swagger-ui .info .title {
      font-size: 28px !important; 
      color: var(--atlas-text-primary) !important;
      font-weight: 700 !important;
    }
    .swagger-ui .info .title small { 
      background: var(--atlas-accent) !important; 
      font-weight: 600 !important;
    }
    .swagger-ui h1, .swagger-ui h2, .swagger-ui h3, .swagger-ui h4, .swagger-ui h5 {
      color: var(--atlas-text-primary) !important;
    }
    .swagger-ui .info .description { color: var(--atlas-text-secondary) !important; }
    .swagger-ui .info .description a { color: #60a5fa !important; }

    /* Blocos de Endpoints (Opblocks) */
    .swagger-ui .opblock, .swagger-ui .opblock .opblock-section-header {
      background: var(--atlas-surface-bg) !important;
      border: 1px solid var(--atlas-border) !important;
    }
    .swagger-ui .opblock.is-open {
      background: var(--atlas-surface-bg) !important;
    }
    .swagger-ui .opblock-summary {
      border-color: var(--atlas-border) !important;
    }
    /* CORREÇÃO DE CONTRASTE: Descrição do endpoint */
    .swagger-ui .opblock-summary-description {
      color: var(--atlas-text-secondary) !important;
    }

    /* Cores dos Métodos HTTP */
    .swagger-ui .opblock-summary-method { border-radius: 4px !important; }
    .swagger-ui .opblock.opblock-post { border-color: #3b82f6 !important; }
    .swagger-ui .opblock.opblock-get { border-color: #22c55e !important; }
    .swagger-ui .opblock.opblock-put { border-color: #eab308 !important; }
    .swagger-ui .opblock.opblock-delete { border-color: #ef4444 !important; }
    .swagger-ui .opblock.opblock-patch { border-color: #f97316 !important; }

    /* Tabelas de Parâmetros e Respostas com Contraste Alto */
    .swagger-ui table thead {
      background: #374151 !important;
      color: var(--atlas-text-primary) !important;
    }
    .swagger-ui .parameters-col_description, .swagger-ui .response-col_description, .swagger-ui td, .swagger-ui th {
      color: var(--atlas-text-secondary) !important;
    }
    .swagger-ui .parameter__name, .swagger-ui .parameter__name.required:after { color: var(--atlas-text-primary) !important; }
    .swagger-ui .parameter__type { color: var(--atlas-text-muted) !important; }
    .swagger-ui .prop-type { color: var(--atlas-text-muted) !important; }
    .swagger-ui .response-col_status { color: var(--atlas-text-primary) !important; }
    
    /* Inputs, Textareas e Botões */
    .swagger-ui input, .swagger-ui textarea, .swagger-ui select {
      background-color: var(--atlas-dark-bg) !important;
      color: var(--atlas-text-primary) !important;
      border: 1px solid #4b5563 !important;
    }
    .swagger-ui .btn.execute { background-color: var(--atlas-accent) !important; border-color: var(--atlas-accent) !important; }
    .swagger-ui .btn.authorize { background-color: #16a34a !important; border-color: #16a34a !important; }
    .swagger-ui .btn { color: #ffffff !important; }
    
    /* Modais */
    .swagger-ui .dialog-ux .modal-ux-content { background: var(--atlas-surface-bg) !important; }
    .swagger-ui .dialog-ux .modal-ux-header { background: #374151 !important; border-bottom-color: #4b5563 !important; }
    
    /* Blocos de Código e Schema */
    .swagger-ui .model, .swagger-ui .highlight-code .microlight, .swagger-ui .responses-inner pre {
      background: #0d1117 !important;
      color: var(--atlas-text-secondary) !important;
    }
    .swagger-ui .model-box {
      background: rgba(0,0,0,0.2) !important;
    }
    /* CORREÇÃO DE CONTRASTE: Texto dentro do Schema */
    .swagger-ui .model .prop .prop-name {
      color: #9cdcfe !important; /* Cor de variável, como no VSCode */
    }
    .swagger-ui .model .prop .prop-type {
      color: #4ec9b0 !important; /* Cor de tipo, como no VSCode */
    }
    .swagger-ui .model .prop .prop-format {
      color: #ce9178 !important; /* Cor de string/formato */
    }
  `;
    swagger_1.SwaggerModule.setup('/api/docs', app, document, {
        customCss,
        customfavIcon: 'https://atlasdao.info/favicon.ico',
        customSiteTitle: 'Documentação API - Atlas Bridge',
        swaggerOptions: {
            persistAuthorization: true,
            tagsSorter: 'alpha',
            operationsSorter: 'alpha',
        },
    });
    logger.log(`Swagger documentation available at http://localhost:${port}/api/docs`);
    app.enableShutdownHooks();
    await app.listen(port);
    logger.log(`🚀 Application is running in ${nodeEnv} mode`);
    logger.log(`🚀 Listening on port ${port}`);
    logger.log(`🚀 API available at http://localhost:${port}/api`);
}
bootstrap();
//# sourceMappingURL=main.js.map