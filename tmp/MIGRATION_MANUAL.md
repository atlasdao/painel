# 📋 Manual de Migração para V. Alpha 0.2 - Atlas DAO

## ⚠️ AVISO IMPORTANTE
Este manual contém instruções críticas para migração de produção. Siga cada passo cuidadosamente para evitar perda de dados ou downtime.

---

## 📊 Resumo da Migração

### Versão
- **De:** V. Alpha 0.1 (Schema atual de produção)
- **Para:** V. Alpha 0.2 (Nova versão com features expandidas)

### Mudanças Principais
1. **6 Novas Tabelas:**
   - DiscountCoupon (Sistema de cupons de desconto)
   - CouponUsage (Rastreamento de uso de cupons)
   - CommerceApplication (Aplicações para modo commerce)
   - UserLevel (Sistema de níveis de usuário)
   - LevelConfig (Configuração de níveis)
   - LevelHistory (Histórico de mudanças de nível)

2. **Modificações em Tabelas Existentes:**
   - User: 10 novas colunas (2FA, perfil, PIX, etc.)
   - PaymentLink: Suporte para valores customizados

3. **Novos Enums:**
   - CommerceApplicationStatus

---

## 🚀 PRÉ-REQUISITOS

### 1. Verificações Iniciais
- [ ] Acesso SSH ao servidor de produção
- [ ] Credenciais do PostgreSQL de produção
- [ ] Backup automático configurado e funcionando
- [ ] Espaço em disco suficiente (mínimo 2x o tamanho do banco)
- [ ] Janela de manutenção agendada (estimativa: 30 minutos)
- [ ] Time de suporte disponível

### 2. Ferramentas Necessárias
```bash
# Verificar versões
psql --version  # PostgreSQL 12+
node --version  # Node.js 16+
npm --version   # NPM 8+
```

---

## 📁 PASSO 1: BACKUP COMPLETO (OBRIGATÓRIO!)

### 1.1 Criar Backup do Banco de Dados
```bash
# Definir variáveis
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="atlas_db"
BACKUP_DIR="/backups/atlas"
BACKUP_FILE="${BACKUP_DIR}/atlas_backup_${BACKUP_DATE}.sql"

# Criar diretório se não existir
mkdir -p ${BACKUP_DIR}

# Executar backup completo com compressão
pg_dump -h localhost -U atlas_user -d ${DB_NAME} \
  --verbose --format=custom --compress=9 \
  --file="${BACKUP_FILE}.gz"

# Verificar tamanho do backup
ls -lh ${BACKUP_FILE}.gz

# Criar backup adicional em formato plain SQL
pg_dump -h localhost -U atlas_user -d ${DB_NAME} \
  --verbose --format=plain \
  --file="${BACKUP_FILE}"
```

### 1.2 Backup dos Arquivos da Aplicação
```bash
# Backup do código atual
tar -czf ${BACKUP_DIR}/atlas_code_${BACKUP_DATE}.tar.gz \
  /path/to/Atlas-API \
  /path/to/Atlas-Panel
```

### 1.3 Verificar Integridade do Backup
```bash
# Testar restore em banco temporário
createdb -U atlas_user atlas_test_restore
pg_restore -U atlas_user -d atlas_test_restore ${BACKUP_FILE}.gz
dropdb -U atlas_user atlas_test_restore
```

---

## 🔍 PASSO 2: PRÉ-MIGRAÇÃO

### 2.1 Executar Script de Verificação Pré-Migração
```bash
# Navegar para diretório de scripts
cd /path/to/Atlas-Painel/migration-scripts

# Executar verificação (não faz alterações)
psql -U atlas_user -d atlas_db -f 00_pre_migration_check.sql

# Resultado esperado:
# ✓ UUID extension is installed
# ✓ Update trigger function exists
# ✓ Found X users in database
# ✓ Found X transactions in database
# PRE-MIGRATION CHECK PASSED!
```

### 2.2 Anotar Métricas Atuais
```sql
-- Conectar ao banco
psql -U atlas_user -d atlas_db

-- Salvar contagens para validação posterior
SELECT COUNT(*) AS user_count FROM "User";
SELECT COUNT(*) AS transaction_count FROM "Transaction";
SELECT COUNT(*) AS withdrawal_count FROM "WithdrawalRequest";
SELECT COUNT(*) AS payment_link_count FROM "PaymentLink";

-- Sair
\q
```

---

## 🔨 PASSO 3: EXECUTAR MIGRAÇÃO

### 3.1 Colocar Aplicação em Modo de Manutenção
```bash
# Parar serviços (mantendo banco acessível)
systemctl stop atlas-api
systemctl stop atlas-panel

# Ou usando PM2
pm2 stop atlas-api
pm2 stop atlas-panel
```

### 3.2 Executar Script de Migração Principal
```bash
# Executar migração com log detalhado
psql -U atlas_user -d atlas_db \
  -f 01_migrate_to_v0.2.sql \
  2>&1 | tee migration_${BACKUP_DATE}.log

# Resultado esperado:
# Created enum CommerceApplicationStatus
# Updated User table with new columns
# Created DiscountCoupon table
# Created CouponUsage table
# Created CommerceApplication table
# Created UserLevel table
# Created LevelConfig table
# Created LevelHistory table
# Migration to V. Alpha 0.2 completed successfully!
```

### 3.3 Verificar Sucesso da Migração
```bash
# Executar script de verificação pós-migração
psql -U atlas_user -d atlas_db -f 03_post_migration_check.sql

# Resultado esperado:
# ✓ DiscountCoupon table created successfully
# ✓ All X users have UserLevel records
# POST-MIGRATION CHECK PASSED SUCCESSFULLY!
```

---

## ✅ PASSO 4: VALIDAÇÃO E TESTES

### 4.1 Verificar Estrutura do Banco
```sql
-- Conectar ao banco
psql -U atlas_user -d atlas_db

-- Verificar novas tabelas
\dt "DiscountCoupon"
\dt "CouponUsage"
\dt "CommerceApplication"
\dt "UserLevel"
\dt "LevelConfig"
\dt "LevelHistory"

-- Verificar novas colunas em User
\d "User"

-- Verificar dados migrados
SELECT COUNT(*) FROM "UserLevel";
SELECT * FROM "LevelConfig";
```

### 4.2 Atualizar e Testar Aplicação
```bash
# Navegar para API
cd /path/to/Atlas-API

# Instalar dependências (se houver novas)
npm install

# Gerar cliente Prisma atualizado
npx prisma generate

# Executar testes
npm test

# Iniciar em modo desenvolvimento para teste
npm run start:dev
```

### 4.3 Testes Funcionais Críticos
```bash
# Teste de login
curl -X POST http://localhost:19997/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"test"}'

# Teste de criação de transação
curl -X POST http://localhost:19997/api/v1/pix/create \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount":100,"pixKey":"test@email.com"}'

# Verificar níveis de usuário
curl -X GET http://localhost:19997/api/v1/profile/level \
  -H "Authorization: Bearer TOKEN"
```

---

## 🚨 PASSO 5: ROLLBACK (SE NECESSÁRIO)

### ⚠️ EXECUTAR APENAS EM CASO DE PROBLEMAS GRAVES

### 5.1 Parar Serviços Imediatamente
```bash
# Parar tudo
systemctl stop atlas-api atlas-panel
# ou
pm2 stop all
```

### 5.2 Executar Script de Rollback
```bash
# ATENÇÃO: Isto removerá TODOS os dados das novas tabelas!
psql -U atlas_user -d atlas_db -f 02_rollback_v0.2.sql

# Resultado esperado:
# Dropped all new tables
# Removed new columns from User table
# Rollback from V. Alpha 0.2 completed successfully!
```

### 5.3 Restaurar Backup Completo (Última Opção)
```bash
# Apenas se rollback script falhar
dropdb -U atlas_user atlas_db
createdb -U atlas_user atlas_db
pg_restore -U atlas_user -d atlas_db ${BACKUP_FILE}.gz

# Reiniciar aplicação com versão anterior
cd /path/to/Atlas-API
git checkout v0.1.0  # ou tag anterior
npm install
npm run start:prod
```

---

## 🎯 PASSO 6: FINALIZAÇÃO

### 6.1 Reiniciar Serviços em Produção
```bash
# Usando systemctl
systemctl start atlas-api
systemctl start atlas-panel
systemctl status atlas-api atlas-panel

# Ou usando PM2
pm2 start atlas-api
pm2 start atlas-panel
pm2 status
```

### 6.2 Monitoramento Pós-Migração
```bash
# Verificar logs por erros
tail -f /var/log/atlas-api/error.log

# Monitorar performance do banco
psql -U atlas_user -d atlas_db -c "
SELECT query, calls, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;"

# Verificar conexões ativas
psql -U atlas_user -d atlas_db -c "
SELECT count(*) FROM pg_stat_activity;"
```

### 6.3 Checklist Pós-Migração
- [ ] Todos os serviços rodando sem erros
- [ ] Login funcionando normalmente
- [ ] Transações PIX funcionando
- [ ] Níveis de usuário aparecendo corretamente
- [ ] Performance normal (sem queries lentas)
- [ ] Logs sem erros críticos
- [ ] Backup pós-migração criado

---

## 📞 CONTATOS DE EMERGÊNCIA

### Time de Desenvolvimento
- **Lead Developer:** [CONTATO]
- **DevOps:** [CONTATO]
- **DBA:** [CONTATO]

### Procedimento de Escalonamento
1. Tentar rollback via script (5 min)
2. Se falhar, restaurar backup (15 min)
3. Se crítico, contatar lead developer imediatamente

---

## 📊 MÉTRICAS DE SUCESSO

### KPIs para Validar Migração
- Tempo de migração: < 30 minutos
- Downtime: < 15 minutos
- Erros pós-migração: 0 críticos
- Performance degradation: < 5%
- Todos usuários mantêm acesso
- Dados históricos preservados

---

## 🔧 TROUBLESHOOTING

### Problema: Script de migração falha com erro de permissão
```sql
-- Solução: Executar como superuser
sudo -u postgres psql -d atlas_db -f 01_migrate_to_v0.2.sql
```

### Problema: Tabela já existe
```sql
-- Verificar e limpar se necessário
DROP TABLE IF EXISTS "DiscountCoupon" CASCADE;
-- Então re-executar migração
```

### Problema: Timeout durante migração
```sql
-- Aumentar timeout
SET statement_timeout = '30min';
-- Re-executar script
```

### Problema: Aplicação não conecta após migração
```bash
# Verificar connection string
cat .env | grep DATABASE_URL

# Testar conexão
psql -U atlas_user -d atlas_db -c "SELECT 1;"

# Regenerar Prisma client
npx prisma generate
```

---

## 📝 NOTAS FINAIS

1. **SEMPRE faça backup antes de qualquer migração**
2. **TESTE em ambiente de staging primeiro**
3. **Mantenha logs de todas as operações**
4. **Tenha plano de rollback pronto**
5. **Comunique usuários sobre janela de manutenção**

---

**Última Atualização:** 2025-10-07
**Versão do Manual:** 1.0
**Autor:** Atlas DAO Development Team

---

## ⚡ COMANDOS RÁPIDOS

```bash
# Backup rápido
pg_dump -U atlas_user -d atlas_db > backup_$(date +%Y%m%d).sql

# Migração completa
psql -U atlas_user -d atlas_db -f 00_pre_migration_check.sql
psql -U atlas_user -d atlas_db -f 01_migrate_to_v0.2.sql
psql -U atlas_user -d atlas_db -f 03_post_migration_check.sql

# Rollback emergencial
psql -U atlas_user -d atlas_db -f 02_rollback_v0.2.sql

# Verificação rápida
psql -U atlas_user -d atlas_db -c "SELECT COUNT(*) FROM \"UserLevel\";"
```

---

⚠️ **LEMBRE-SE:** Em caso de dúvida, NÃO PROSSIGA. Entre em contato com o time de desenvolvimento.