-- ============================================================
-- SCRIPT MANUAL — NÃO É MIGRATION.
-- Fica fora de prisma/migrations de propósito: o prisma migrate
-- não executa este arquivo. Rode no SQL Editor do Supabase,
-- logado como postgres (dono do banco), somente uma vez por ambiente.
--
-- Objetivo: a API roda com imovia_user, que só consegue DML
-- (SELECT/INSERT/UPDATE/DELETE). Sem CREATE/ALTER/DROP/TRUNCATE,
-- então um "db push" ou SQL errado vindo da API não altera o schema.
--
-- Pré-requisito: a migration 20260727000001_create_imovia_user
-- já criou o role imovia_user.
--
-- Este script NÃO muda RLS nem BYPASSRLS (decisão separada).
-- ============================================================

-- 1) Garantir que o role existe (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imovia_user') THEN
    RAISE EXCEPTION 'Role imovia_user não existe. Aplique antes a migration 20260727000001.';
  END IF;
END $$;

-- 2) Sem criação de objetos no schema public
REVOKE CREATE ON SCHEMA public FROM imovia_user;

-- 3) Sem operações de DDL-like em tabelas existentes
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM imovia_user;

-- 4) DML garantido (idempotente, caso algo tenha sido removido)
GRANT USAGE ON SCHEMA public TO imovia_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO imovia_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO imovia_user;

-- 5) Tabelas criadas no futuro pelo postgres: só DML para o runtime
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO imovia_user;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO imovia_user;

-- ============================================================
-- 6) TROCAR A SENHA — execute manualmente com uma senha forte nova.
--    NÃO cole a senha em chat, commit ou arquivo versionado.
--    A senha 'imovia_changeme' da migration 20260727000001 está
--    no histórico do git: troque-a sempre.
--
-- ALTER ROLE imovia_user WITH PASSWORD '<NOVA_SENHA_FORTE>';
-- ============================================================

-- ============================================================
-- 7) VERIFICAÇÃO — o esperado está em cada comentário
-- ============================================================

-- Esperado: false (não pode criar objetos em public)
SELECT has_schema_privilege('imovia_user', 'public', 'CREATE') AS pode_criar_em_public;

-- Esperado: 0 linhas (nenhuma tabela pertence ao runtime)
SELECT tablename FROM pg_tables
 WHERE schemaname = 'public' AND tableowner = 'imovia_user';

-- Esperado: true para as quatro operações de DML
SELECT t.tablename,
       has_table_privilege('imovia_user', format('public.%I', t.tablename), 'SELECT') AS select_ok,
       has_table_privilege('imovia_user', format('public.%I', t.tablename), 'INSERT') AS insert_ok,
       has_table_privilege('imovia_user', format('public.%I', t.tablename), 'UPDATE') AS update_ok,
       has_table_privilege('imovia_user', format('public.%I', t.tablename), 'DELETE') AS delete_ok,
       has_table_privilege('imovia_user', format('public.%I', t.tablename), 'TRUNCATE') AS truncate_ok -- esperado: false
  FROM pg_tables t
 WHERE t.schemaname = 'public'
 ORDER BY t.tablename;
