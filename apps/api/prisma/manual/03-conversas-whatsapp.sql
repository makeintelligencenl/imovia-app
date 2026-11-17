-- Campos novos para a tela de conversas do WhatsApp (conversas e mensagens).
--
-- Este arquivo deve ser revisado e aplicado MANUALMENTE no SQL Editor do Supabase.
-- Não é executado pela aplicação nem pelo deploy.
--
-- Todas as colunas são adicionadas com IF NOT EXISTS, então o script pode ser rodado
-- mais de uma vez. Não altera dados existentes: as colunas novas recebem valores padrão.
-- Não mexe nas políticas de RLS (já aplicadas no script 02).

BEGIN;

-- conversas_whatsapp -----------------------------------------------------------

ALTER TABLE conversas_whatsapp
  ADD COLUMN IF NOT EXISTS "resolvido" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "esperandoDesde" timestamp(3) NULL,
  ADD COLUMN IF NOT EXISTS "ultimaMensagemClienteEm" timestamp(3) NULL,
  ADD COLUMN IF NOT EXISTS "unreadCount" integer NOT NULL DEFAULT 0;

-- mensagens_whatsapp -----------------------------------------------------------

ALTER TABLE mensagens_whatsapp
  ADD COLUMN IF NOT EXISTS "remetente" text NOT NULL DEFAULT 'CLIENTE',
  ADD COLUMN IF NOT EXISTS "midiaStoragePath" text NULL,
  ADD COLUMN IF NOT EXISTS "status" text NULL,
  ADD COLUMN IF NOT EXISTS "statusMotivo" text NULL,
  ADD COLUMN IF NOT EXISTS "transcricao" text NULL;

COMMIT;

-- Verificação (somente leitura): deve listar 9 colunas.
-- select table_name, column_name, data_type
-- from information_schema.columns
-- where table_schema = 'public'
--   and (table_name, column_name) in (
--     ('conversas_whatsapp','resolvido'),
--     ('conversas_whatsapp','esperandoDesde'),
--     ('conversas_whatsapp','ultimaMensagemClienteEm'),
--     ('conversas_whatsapp','unreadCount'),
--     ('mensagens_whatsapp','remetente'),
--     ('mensagens_whatsapp','midiaStoragePath'),
--     ('mensagens_whatsapp','status'),
--     ('mensagens_whatsapp','statusMotivo'),
--     ('mensagens_whatsapp','transcricao'))
-- order by table_name, column_name;
