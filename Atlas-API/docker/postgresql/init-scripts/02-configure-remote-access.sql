-- Configurações adicionais para acesso remoto

-- Criar extensões úteis se necessário
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Configurar permissões de acesso remoto
ALTER USER atlas CONNECTION LIMIT -1;
ALTER USER erick CONNECTION LIMIT -1;

-- Permitir que o usuário atlas crie tabelas temporárias
GRANT TEMP ON DATABASE atlas_db TO atlas;

-- Log de configuração concluída
DO $$
BEGIN
    RAISE NOTICE 'Configurações de acesso remoto aplicadas com sucesso!';
    RAISE NOTICE 'PostgreSQL está pronto para aceitar conexões remotas na porta 5432';
END $$;