-- ============================================================
-- Row-Level Security (RLS) — segunda camada de isolamento multi-tenant
--
-- Como funciona:
--   1. O app seta `app.current_tenant_id` via SET LOCAL dentro de uma transaction.
--   2. A policy verifica se o tenantId da row bate com a config da sessão.
--   3. Se o app esquecer de filtrar por tenantId, o banco bloqueia o acesso.
--
-- ATENÇÃO: Para que o RLS seja efetivo, o usuário do banco usado pelo Prisma
-- NÃO deve ter BYPASSRLS. No Railway, execute:
--   ALTER ROLE <app_db_user> NOBYPASSRLS;
-- Substitua <app_db_user> pelo usuário da DATABASE_URL (geralmente "postgres").
-- ============================================================

-- Habilita RLS nas tabelas com tenantId
ALTER TABLE "clientes"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "imoveis"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "perfis_busca"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pipeline_etapas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "matches"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "match_historico"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "visitas"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "comissoes_venda" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "refresh_tokens"  ENABLE ROW LEVEL SECURITY;

-- ── Função auxiliar ──────────────────────────────────────────────────────────
-- Retorna o tenant ativo ou NULL (sem forçar erro quando não está definido,
-- para permitir operações de sistema/super-admin que não setam a variável).
CREATE OR REPLACE FUNCTION app_current_tenant_id() RETURNS TEXT
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.current_tenant_id', true), '')
$$;

-- ── Policies: clientes ───────────────────────────────────────────────────────
CREATE POLICY tenant_isolation ON "clientes"
  USING (
    app_current_tenant_id() IS NULL              -- sistema/super-admin: sem restrição
    OR "tenantId" = app_current_tenant_id()
  );

-- ── Policies: imoveis ────────────────────────────────────────────────────────
CREATE POLICY tenant_isolation ON "imoveis"
  USING (
    app_current_tenant_id() IS NULL
    OR "tenantId" = app_current_tenant_id()
  );

-- ── Policies: perfis_busca ───────────────────────────────────────────────────
CREATE POLICY tenant_isolation ON "perfis_busca"
  USING (
    app_current_tenant_id() IS NULL
    OR "tenantId" = app_current_tenant_id()
  );

-- ── Policies: pipeline_etapas ────────────────────────────────────────────────
CREATE POLICY tenant_isolation ON "pipeline_etapas"
  USING (
    app_current_tenant_id() IS NULL
    OR "tenantId" = app_current_tenant_id()
  );

-- ── Policies: matches ────────────────────────────────────────────────────────
CREATE POLICY tenant_isolation ON "matches"
  USING (
    app_current_tenant_id() IS NULL
    OR "tenantId" = app_current_tenant_id()
  );

-- ── Policies: match_historico ────────────────────────────────────────────────
CREATE POLICY tenant_isolation ON "match_historico"
  USING (
    app_current_tenant_id() IS NULL
    OR "tenantId" = app_current_tenant_id()
  );

-- ── Policies: visitas ────────────────────────────────────────────────────────
CREATE POLICY tenant_isolation ON "visitas"
  USING (
    app_current_tenant_id() IS NULL
    OR "tenantId" = app_current_tenant_id()
  );

-- ── Policies: comissoes_venda ────────────────────────────────────────────────
CREATE POLICY tenant_isolation ON "comissoes_venda"
  USING (
    app_current_tenant_id() IS NULL
    OR "tenantId" = app_current_tenant_id()
  );

-- ── Policies: users ──────────────────────────────────────────────────────────
-- super-admin (tenantId = 'super-admin') pode ver todos os users.
CREATE POLICY tenant_isolation ON "users"
  USING (
    app_current_tenant_id() IS NULL
    OR app_current_tenant_id() = 'super-admin'
    OR "tenantId" = app_current_tenant_id()
  );

-- ── Policies: refresh_tokens ─────────────────────────────────────────────────
-- RLS via userId: só enxerga tokens do próprio user.
-- Como refresh_tokens não tem tenantId, join via users é necessário.
-- Simplificação: sem restrição (tabela acessada apenas internamente pelo auth service).
CREATE POLICY allow_all ON "refresh_tokens" USING (true);
