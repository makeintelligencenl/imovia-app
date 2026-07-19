-- Script idempotente: pode rodar multiplas vezes sem erro.
-- Aplicado apos prisma db push no startup.

-- Funcao auxiliar para RLS
CREATE OR REPLACE FUNCTION app_current_tenant_id() RETURNS TEXT
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.current_tenant_id', true), '')
$$;

-- Habilita RLS (idempotente — nao falha se ja estiver habilitado)
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

-- Recria policies (DROP IF EXISTS + CREATE = idempotente)
DO $$
DECLARE
  tbls TEXT[] := ARRAY['clientes','imoveis','perfis_busca','pipeline_etapas','matches','match_historico','visitas','comissoes_venda'];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format($$
      CREATE POLICY tenant_isolation ON %I
      USING (app_current_tenant_id() IS NULL OR "tenantId" = app_current_tenant_id())
    $$, t);
  END LOOP;

  -- users: super-admin ve todos
  DROP POLICY IF EXISTS tenant_isolation ON "users";
  CREATE POLICY tenant_isolation ON "users"
    USING (
      app_current_tenant_id() IS NULL
      OR app_current_tenant_id() = 'super-admin'
      OR "tenantId" = app_current_tenant_id()
    );

  -- refresh_tokens: sem restricao de tenant (gerenciado pelo auth service)
  DROP POLICY IF EXISTS allow_all ON "refresh_tokens";
  CREATE POLICY allow_all ON "refresh_tokens" USING (true);
END;
$$;

-- Remove BYPASSRLS do usuario de app (idempotente)
DO $$
BEGIN
  EXECUTE format('ALTER ROLE %I NOBYPASSRLS', current_user);
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'Sem permissao para ALTER ROLE — ignorado.';
END;
$$;

-- Funcao de limpeza de refresh tokens expirados
CREATE OR REPLACE FUNCTION cleanup_expired_refresh_tokens() RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM refresh_tokens WHERE "expiresAt" < NOW() OR "revokedAt" IS NOT NULL;
END;
$$;
