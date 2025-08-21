-- Script de inicialização do PostgreSQL para Atlas DAO
-- Cria usuários e configura permissões

-- Criar usuario do sistema Atlas
CREATE USER atlas WITH PASSWORD 'Op1Yw1xcTzwIqLaFLxJYypKk34yYcchTJk7eoey5h0CJcmUGYSD6';

-- Criar usuario administrador remoto (erick)
CREATE USER erickatlas WITH PASSWORD 'zrift6N6Z1ky3PykKEYnNuBsL1rBSk9yCYC0bDJ0L1o5IVsoZegW6LbLBm' SUPERUSER CREATEDB CREATEROLE;

-- Criar database para o Atlas se não existir
CREATE DATABASE atlaspanel_db OWNER atlas;

-- Conectar ao database atlaspanel_db
\c atlaspanel_db;

-- Garantir todas as permissões para o usuário atlas no database atlas_db
ALTER DATABASE atlaspanel_db OWNER TO atlas;
GRANT USAGE, CREATE ON SCHEMA public TO atlas;
GRANT ALL PRIVILEGES ON DATABASE atlaspanel_db TO atlas;
GRANT ALL ON SCHEMA public TO atlas;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO atlas;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO atlas;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO atlas;

-- Permitir conexões remotas para o usuário erick
GRANT CONNECT ON DATABASE atlaspanel_db TO erick;
GRANT CONNECT ON DATABASE postgres TO erickatlas;

-- Configurar permissões para criar esquemas
GRANT CREATE ON DATABASE atlaspanel_db TO atlas;

-- Criar esquema para o Prisma se necessário
CREATE SCHEMA IF NOT EXISTS public AUTHORIZATION atlas;

-- Mensagem de confirmação
DO $$
BEGIN
    RAISE NOTICE 'Usuarios criados com sucesso:';
    RAISE NOTICE '  - atlas: usuario do sistema';
    RAISE NOTICE '  - erickatlas: administrador remoto';
    RAISE NOTICE 'Database atlaspanel_db configurado com sucesso!';
END $$;
