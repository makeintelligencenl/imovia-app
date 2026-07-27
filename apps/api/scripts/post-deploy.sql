-- Script idempotente de pós-deploy.
-- RLS ativo com isolamento por tenant via nestjs-cls + SET LOCAL por request.

-- Garante NOBYPASSRLS no usuário de app (imovia_user não pode escapar das policies)
DO $$
BEGIN
  EXECUTE format('ALTER ROLE %I NOBYPASSRLS', current_user);
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'Sem permissão para ALTER ROLE — ignorando.';
END;
$$;

-- Habilita RLS nas tabelas com tenantId
ALTER TABLE IF EXISTS "clientes"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "imoveis"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "perfis_busca"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "pipeline_etapas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "matches"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "match_historico" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "visitas"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "comissoes_venda" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "users"           ENABLE ROW LEVEL SECURITY;

-- Habilita RLS nas tabelas globais (sem tenantId) com allow_all
ALTER TABLE IF EXISTS "refresh_tokens"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "tenants"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "cidades"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "estados"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "tipos_imovel"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "demo_requests"   ENABLE ROW LEVEL SECURITY;

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

-- Recria policies de isolamento por tenant (idempotente)
DO $$
DECLARE
  tenant_tbls TEXT[] := ARRAY['clientes','imoveis','perfis_busca','pipeline_etapas','matches','match_historico','visitas','comissoes_venda','users'];
  global_tbls TEXT[] := ARRAY['refresh_tokens','tenants','cidades','estados','tipos_imovel','demo_requests'];
  t TEXT;
BEGIN
  -- Tabelas com tenantId: isola por tenant
  FOREACH t IN ARRAY tenant_tbls LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS allow_all ON %I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING ("tenantId" = current_setting(''app.current_tenant_id'')::text) WITH CHECK ("tenantId" = current_setting(''app.current_tenant_id'')::text)',
      t
    );
  END LOOP;

  -- Tabelas globais: acesso livre (não têm tenantId)
  FOREACH t IN ARRAY global_tbls LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS allow_all ON %I', t);
    EXECUTE format('CREATE POLICY allow_all ON %I USING (true) WITH CHECK (true)', t);
  END LOOP;
END;
$$;
