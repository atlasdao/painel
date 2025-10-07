# Atlas API - Gateway de Pagamentos PIX/DePix

## 📋 Sobre o Projeto

Atlas API é um gateway de pagamentos robusto que integra PIX com DePix (Liquid Network), permitindo conversões instantâneas entre moeda fiduciária brasileira e ativos digitais. O sistema oferece uma solução completa para processamento de pagamentos, com suporte a múltiplos níveis de usuário e autenticação via JWT e API Keys.

## 🚀 Características Principais

- **Integração PIX/DePix**: Conversão automática entre PIX e ativos na Liquid Network
- **Autenticação Dupla**: Suporte para JWT (sessões web) e API Keys (integrações)
- **Gestão de Transações**: Histórico completo com rastreamento e metadados
- **Painel Administrativo**: Interface para gerenciamento de usuários e transações
- **Conformidade**: Limites de transação conforme regulamentações MED/Plebank
- **Recuperação de Senha**: Sistema completo com envio de código por email
- **API RESTful**: Documentação Swagger integrada

## 🛠️ Tecnologias Utilizadas

- **Backend**: NestJS com TypeScript
- **Banco de Dados**: SQLite com Prisma ORM
- **Autenticação**: JWT + bcrypt para API Keys
- **Email**: Nodemailer com suporte SMTP
- **Integração Externa**: Eulen API para processamento PIX
- **Documentação**: Swagger/OpenAPI

## 📦 Instalação

### Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- SQLite3

### Configuração do Ambiente

1. Clone o repositório:
```bash
git clone https://github.com/atlasdao/atlas-api.git
cd atlas-api
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

4. Edite o arquivo `.env` com suas configurações:
```env
# Configurações do Servidor
PORT=19997
NODE_ENV=development

# Banco de Dados
DATABASE_URL="file:./prisma/dev.db"

# JWT
JWT_SECRET=sua_chave_secreta_aqui
JWT_EXPIRATION=24h
JWT_REFRESH_SECRET=sua_chave_refresh_aqui
JWT_REFRESH_EXPIRATION=7d

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu_email@gmail.com
SMTP_PASS=sua_senha_app
SMTP_FROM="AtlasDAO <noreply@atlasdao.com>"

# Eulen API
EULEN_API_URL=https://api.eulen.app
EULEN_API_KEY=sua_chave_eulen

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

5. Execute as migrações do banco de dados:
```bash
npx prisma migrate dev
npx prisma db seed
```

6. Inicie o servidor:
```bash
npm run start:dev
```

## 🔑 Autenticação

### JWT (Para aplicações web)

```typescript
// Login
POST /api/v1/auth/login
{
  "emailOrUsername": "user@example.com",
  "password": "senha123"
}

// Resposta
{
  "accessToken": "eyJhbGci...",
  "tokenType": "Bearer",
  "expiresIn": 86400,
  "user": { ... }
}
```

### API Keys (Para integrações)

```bash
# Gerar API Key (autenticado via JWT)
POST /api/v1/auth/api-key
Authorization: Bearer seu_jwt_token

# Usar API Key
curl -X POST https://atlas2.orion.moe/api/v1/pix/qrcode \
  -H "X-API-Key: atlas_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.50,
    "depixAddress": "lq1qq...",
    "description": "Pagamento"
  }'
```

## 📡 Endpoints Principais

### Autenticação
- `POST /api/v1/auth/register` - Criar nova conta
- `POST /api/v1/auth/login` - Fazer login
- `POST /api/v1/auth/api-key` - Gerar API Key
- `DELETE /api/v1/auth/api-key` - Revogar API Key
- `POST /api/v1/auth/forgot-password` - Solicitar recuperação de senha
- `POST /api/v1/auth/reset-password` - Redefinir senha com código

### PIX/DePix
- `POST /api/v1/pix/qrcode` - Gerar QR Code PIX
- `POST /api/v1/pix/payment` - Processar pagamento PIX
- `GET /api/v1/pix/status/:id` - Verificar status da transação
- `GET /api/v1/pix/transactions` - Listar transações do usuário

### Administração
- `GET /api/v1/admin/users` - Listar todos usuários
- `GET /api/v1/admin/transactions` - Listar todas transações
- `POST /api/v1/admin/users/:id/role` - Alterar papel do usuário
- `DELETE /api/v1/admin/users/:id` - Desativar usuário

## 🏗️ Estrutura do Projeto

```
atlas-api/
├── src/
│   ├── auth/           # Autenticação e autorização
│   ├── pix/            # Módulo PIX/DePix
│   ├── admin/          # Painel administrativo
│   ├── common/         # DTOs e utilitários compartilhados
│   ├── repositories/   # Camada de acesso a dados
│   ├── services/       # Serviços de negócio
│   └── main.ts         # Entrada da aplicação
├── prisma/
│   ├── schema.prisma   # Esquema do banco de dados
│   └── migrations/     # Migrações do banco
├── test/               # Testes
└── package.json
```

## 🔒 Segurança

- Todas as senhas são hasheadas com bcrypt
- API Keys são armazenadas hasheadas no banco de dados
- Rate limiting implementado para prevenir abuso
- Validação de entrada em todos os endpoints
- CORS configurado para domínios permitidos
- Logs de auditoria para ações sensíveis

## 📊 Limites de Transação

Conforme regulamentação MED/Plebank:
- **Mínimo**: R$ 0,01
- **Máximo por transação**: R$ 35.000,00
- **Máximo mensal**: R$ 35.000,00

## 🧪 Testes

```bash
# Testes unitários
npm run test

# Testes e2e
npm run test:e2e

# Cobertura de testes
npm run test:cov
```

## 📚 Documentação da API

A documentação Swagger está disponível em:
```
https://atlas2.orion.moe/api/docs
```

Para desenvolvimento local:
```
http://localhost:19997/api/docs
```

## 🐳 Docker

```bash
# Construir imagem
docker build -t atlas-api .

# Executar container
docker run -p 19997:19997 --env-file .env atlas-api
```

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 👥 Equipe

- **AtlasDAO Team** - Desenvolvimento e manutenção

## 📞 Suporte

Para suporte, envie um email para support@atlasdao.com ou abra uma issue no GitHub.

## 🔄 Status do Projeto

🟢 **Ativo** - Em desenvolvimento e manutenção contínua

---

<div align="center">
  <strong>Desenvolvido com ❤️ pela AtlasDAO</strong>
</div>