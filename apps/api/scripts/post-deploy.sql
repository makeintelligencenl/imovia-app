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

-- Atribui EtapaTipo a etapas existentes (idempotente — só toca etapas ainda como PADRAO)
-- Convenção: última por ordem = ENCERRADO, penúltima = FECHADO, nome contém 'visita' = VISITA
DO $$
DECLARE
  tid TEXT;
  last_id TEXT;
  second_last_id TEXT;
BEGIN
  -- Verifica se a coluna tipo existe antes de executar (guard para deploy incremental)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pipeline_etapas' AND column_name = 'tipo'
  ) THEN
    RETURN;
  END IF;

  FOR tid IN SELECT DISTINCT "tenantId" FROM pipeline_etapas WHERE ativo = true LOOP
    -- Última etapa → ENCERRADO
    SELECT id INTO last_id
    FROM pipeline_etapas
    WHERE "tenantId" = tid AND ativo = true
    ORDER BY ordem DESC LIMIT 1;

    IF last_id IS NOT NULL THEN
      UPDATE pipeline_etapas SET tipo = 'ENCERRADO'
      WHERE id = last_id AND tipo = 'PADRAO';
    END IF;

    -- Penúltima etapa → FECHADO
    SELECT id INTO second_last_id
    FROM pipeline_etapas
    WHERE "tenantId" = tid AND ativo = true AND id <> last_id
    ORDER BY ordem DESC LIMIT 1;

    IF second_last_id IS NOT NULL THEN
      UPDATE pipeline_etapas SET tipo = 'FECHADO'
      WHERE id = second_last_id AND tipo = 'PADRAO';
    END IF;

    -- Etapas com 'visita' no nome → VISITA (se ainda como PADRAO)
    UPDATE pipeline_etapas SET tipo = 'VISITA'
    WHERE "tenantId" = tid AND ativo = true
      AND tipo = 'PADRAO'
      AND lower(nome) LIKE '%visita%';
  END LOOP;
END;
$$;

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
