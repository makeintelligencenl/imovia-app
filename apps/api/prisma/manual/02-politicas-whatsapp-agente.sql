-- Políticas de RLS para as tabelas do WhatsApp e do agente de atendimento.
--
-- Motivo: essas tabelas estão com RLS ligado e sem nenhuma política. Com isso, o
-- Postgres nega todas as gravações do usuário da aplicação (erro 42501), e a conexão
-- do WhatsApp falha ao salvar.
--
-- Este arquivo deve ser revisado e aplicado MANUALMENTE no SQL Editor do Supabase.
-- Não é executado pela aplicação nem pelo deploy.
--
-- Padrão adotado (opção A):
--   * Tabelas com "tenantId": isolamento por tenant, igual a tenant_isolation das demais
--     tabelas, com a mesma cláusula que libera leitura quando o contexto está vazio
--     (como em contas_receber e contratos_aluguel).
--   * Tabelas filhas (sem "tenantId", ligadas a uma tabela pai com tenant): allow_all,
--     igual a _ImovelCaracteristicas e _PerfilTipos. O isolamento vem da tabela pai.
--
-- Atenção: a cláusula WITH CHECK abaixo também aceita o contexto vazio na gravação.
-- Isso é mais permissivo que o WITH CHECK de contas_receber. Foi escolhido para que a
-- gravação da conexão passe mesmo quando o contexto do tenant não chega ao banco.

BEGIN;

-- Tabelas com tenantId ---------------------------------------------------------

DROP POLICY IF EXISTS tenant_isolation ON configuracoes_whatsapp;
CREATE POLICY tenant_isolation ON configuracoes_whatsapp
  FOR ALL
  USING (
    current_setting('app.current_tenant_id', true) = ''
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    current_setting('app.current_tenant_id', true) = ''
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  );

DROP POLICY IF EXISTS tenant_isolation ON conversas_whatsapp;
CREATE POLICY tenant_isolation ON conversas_whatsapp
  FOR ALL
  USING (
    current_setting('app.current_tenant_id', true) = ''
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    current_setting('app.current_tenant_id', true) = ''
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  );

DROP POLICY IF EXISTS tenant_isolation ON configuracoes_agente;
CREATE POLICY tenant_isolation ON configuracoes_agente
  FOR ALL
  USING (
    current_setting('app.current_tenant_id', true) = ''
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    current_setting('app.current_tenant_id', true) = ''
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  );

DROP POLICY IF EXISTS tenant_isolation ON chaves_ia_provedor;
CREATE POLICY tenant_isolation ON chaves_ia_provedor
  FOR ALL
  USING (
    current_setting('app.current_tenant_id', true) = ''
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    current_setting('app.current_tenant_id', true) = ''
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  );

DROP POLICY IF EXISTS tenant_isolation ON base_conhecimento_itens;
CREATE POLICY tenant_isolation ON base_conhecimento_itens
  FOR ALL
  USING (
    current_setting('app.current_tenant_id', true) = ''
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    current_setting('app.current_tenant_id', true) = ''
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  );

-- Tabelas filhas (sem tenantId) ------------------------------------------------

DROP POLICY IF EXISTS allow_all ON mensagens_whatsapp;
CREATE POLICY allow_all ON mensagens_whatsapp FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS allow_all ON agente_itens_base;
CREATE POLICY allow_all ON agente_itens_base FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS allow_all ON base_conhecimento_chunks;
CREATE POLICY allow_all ON base_conhecimento_chunks FOR ALL USING (true) WITH CHECK (true);

COMMIT;

-- Verificação (somente leitura): deve listar 8 linhas, uma por tabela.
-- select tablename, policyname, cmd
-- from pg_policies
-- where tablename in ('configuracoes_whatsapp','conversas_whatsapp','mensagens_whatsapp',
--   'configuracoes_agente','chaves_ia_provedor','agente_itens_base',
--   'base_conhecimento_itens','base_conhecimento_chunks')
-- order by tablename;
