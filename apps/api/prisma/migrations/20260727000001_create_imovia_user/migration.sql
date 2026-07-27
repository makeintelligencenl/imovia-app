-- ============================================================
-- Cria o usuário imovia_user com permissões mínimas para o app.
-- O superuser (postgres) continua sendo usado APENAS para migrations.
--
-- Após aplicar esta migration:
--   1. Defina DATABASE_URL com imovia_user no serviço web/api do Railway
--   2. Defina MIGRATION_DATABASE_URL com postgres (superuser) — usado só pelo prisma migrate
--   3. Execute: ALTER ROLE imovia_user NOBYPASSRLS;  (Passo 2 do rollout)
-- ============================================================

-- Cria o usuário se ainda não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imovia_user') THEN
    -- A senha deve ser rotacionada após criação via Railway dashboard ou psql
    CREATE ROLE imovia_user WITH LOGIN PASSWORD 'imovia_changeme';
  END IF;
END $$;

-- Garante BYPASSRLS inicialmente (Passo 1 do rollout — sem impacto em produção)
ALTER ROLE imovia_user BYPASSRLS;

-- Permissão para conectar ao banco
GRANT CONNECT ON DATABASE postgres TO imovia_user;

-- Permissão para usar o schema public
GRANT USAGE ON SCHEMA public TO imovia_user;

-- DML nas tabelas da aplicação (sem DDL — não pode criar/dropar tabelas)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO imovia_user;

-- Permissão em sequences (necessário para IDs auto-incrementados, se houver)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO imovia_user;

-- Garante permissões em tabelas criadas futuramente por migrations
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO imovia_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO imovia_user;

-- Permissão para executar a função auxiliar de RLS
GRANT EXECUTE ON FUNCTION app_current_tenant_id() TO imovia_user;
