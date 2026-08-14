-- RLS para contas_receber
ALTER TABLE "contas_receber" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "contas_receber"
  USING (
    current_setting('app.current_tenant_id', true) = ''
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));
