-- Remove BYPASSRLS do usuário de app para que as policies de RLS sejam efetivas.
-- Usa current_user para funcionar independente do nome do usuário no Railway.
-- O bloco EXCEPTION garante que a migration não falha se o usuário não tiver
-- permissão para alterar roles (ambientes sem superuser).
DO $$
BEGIN
  EXECUTE format('ALTER ROLE %I NOBYPASSRLS', current_user);
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'Sem permissão para ALTER ROLE — NOBYPASSRLS não aplicado.';
END;
$$;
