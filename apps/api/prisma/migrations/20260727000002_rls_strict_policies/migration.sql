-- ============================================================
-- Remove a cláusula IS NULL das policies de RLS tenant_isolation.
--
-- Antes: USING ((app_current_tenant_id() IS NULL) OR ("tenantId" = app_current_tenant_id()))
-- Depois: USING ("tenantId" = current_setting('app.current_tenant_id')::text)
--
-- A cláusula IS NULL era um escape hatch que deixava TODAS as linhas
-- visíveis quando app.current_tenant_id não estava setado — tornando
-- o RLS 100% inoperante na prática. Com esta migration, uma query sem
-- o tenant setado gera um erro do PostgreSQL em vez de vazar dados.
-- ============================================================

-- clientes
DROP POLICY IF EXISTS tenant_isolation ON clientes;
CREATE POLICY tenant_isolation ON clientes
  USING ("tenantId" = current_setting('app.current_tenant_id')::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id')::text);

-- imoveis
DROP POLICY IF EXISTS tenant_isolation ON imoveis;
CREATE POLICY tenant_isolation ON imoveis
  USING ("tenantId" = current_setting('app.current_tenant_id')::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id')::text);

-- "perfisBusca"
DROP POLICY IF EXISTS tenant_isolation ON "perfisBusca";
CREATE POLICY tenant_isolation ON "perfisBusca"
  USING ("tenantId" = current_setting('app.current_tenant_id')::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id')::text);

-- matches
DROP POLICY IF EXISTS tenant_isolation ON matches;
CREATE POLICY tenant_isolation ON matches
  USING ("tenantId" = current_setting('app.current_tenant_id')::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id')::text);

-- "matchesHistorico"
DROP POLICY IF EXISTS tenant_isolation ON "matchesHistorico";
CREATE POLICY tenant_isolation ON "matchesHistorico"
  USING ("tenantId" = current_setting('app.current_tenant_id')::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id')::text);

-- visitas
DROP POLICY IF EXISTS tenant_isolation ON visitas;
CREATE POLICY tenant_isolation ON visitas
  USING ("tenantId" = current_setting('app.current_tenant_id')::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id')::text);

-- "pipelineEtapas"
DROP POLICY IF EXISTS tenant_isolation ON "pipelineEtapas";
CREATE POLICY tenant_isolation ON "pipelineEtapas"
  USING ("tenantId" = current_setting('app.current_tenant_id')::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id')::text);

-- users
DROP POLICY IF EXISTS tenant_isolation ON users;
CREATE POLICY tenant_isolation ON users
  USING ("tenantId" = current_setting('app.current_tenant_id')::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id')::text);

-- "comissoesVenda"
DROP POLICY IF EXISTS tenant_isolation ON "comissoesVenda";
CREATE POLICY tenant_isolation ON "comissoesVenda"
  USING ("tenantId" = current_setting('app.current_tenant_id')::text)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id')::text);
