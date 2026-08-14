-- RLS para contratos_aluguel
ALTER TABLE "contratos_aluguel" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "contratos_aluguel"
  USING (
    current_setting('app.current_tenant_id', true) = ''
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));
