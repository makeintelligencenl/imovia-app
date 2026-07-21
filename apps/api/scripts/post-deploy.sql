-- Script idempotente de pos-deploy.
-- RLS desabilitado temporariamente; isolamento garantido pela aplicacao (where: { tenantId }).

-- Restaura BYPASSRLS para o usuario de app (caso NOBYPASSRLS tenha sido aplicado anteriormente)
DO $$
BEGIN
  EXECUTE format('ALTER ROLE %I BYPASSRLS', current_user);
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'Sem permissao para ALTER ROLE.';
END;
$$;

-- Desabilita RLS em todas as tabelas
ALTER TABLE IF EXISTS "clientes"        DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "imoveis"         DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "perfis_busca"    DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "pipeline_etapas" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "matches"         DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "match_historico" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "visitas"         DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "comissoes_venda" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "users"           DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "refresh_tokens"  DISABLE ROW LEVEL SECURITY;

-- Remove policies caso existam
DO $$
DECLARE
  tbls TEXT[] := ARRAY['clientes','imoveis','perfis_busca','pipeline_etapas','matches','match_historico','visitas','comissoes_venda','users','refresh_tokens'];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS allow_all ON %I', t);
  END LOOP;
END;
$$;
