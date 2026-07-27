-- Script idempotente de pós-deploy.
-- Executado como imovia_user — apenas DML (sem DDL, sem ALTER, sem políticas).
-- RLS, policies e roles são gerenciados manualmente no Supabase.

-- Atribui EtapaTipo a etapas existentes (idempotente — só toca etapas ainda como PADRAO)
DO $$
DECLARE
  tid TEXT;
  last_id TEXT;
  second_last_id TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pipeline_etapas' AND column_name = 'tipo'
  ) THEN
    RETURN;
  END IF;

  FOR tid IN SELECT DISTINCT "tenantId" FROM pipeline_etapas WHERE ativo = true LOOP
    SELECT id INTO last_id
    FROM pipeline_etapas
    WHERE "tenantId" = tid AND ativo = true
    ORDER BY ordem DESC LIMIT 1;

    IF last_id IS NOT NULL THEN
      UPDATE pipeline_etapas SET tipo = 'ENCERRADO'
      WHERE id = last_id AND tipo = 'PADRAO';
    END IF;

    SELECT id INTO second_last_id
    FROM pipeline_etapas
    WHERE "tenantId" = tid AND ativo = true AND id <> last_id
    ORDER BY ordem DESC LIMIT 1;

    IF second_last_id IS NOT NULL THEN
      UPDATE pipeline_etapas SET tipo = 'FECHADO'
      WHERE id = second_last_id AND tipo = 'PADRAO';
    END IF;

    UPDATE pipeline_etapas SET tipo = 'VISITA'
    WHERE "tenantId" = tid AND ativo = true
      AND tipo = 'PADRAO'
      AND lower(nome) LIKE '%visita%';
  END LOOP;
END;
$$;
