-- Garante que o enum MatchHistoricoTipo existe com todos os valores necessários
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MatchHistoricoTipo') THEN
    CREATE TYPE "MatchHistoricoTipo" AS ENUM (
      'MATCH_CRIADO',
      'ETAPA_ALTERADA',
      'CORRETOR_ATRIBUIDO',
      'CORRETOR_REMOVIDO'
    );
  ELSE
    BEGIN
      ALTER TYPE "MatchHistoricoTipo" ADD VALUE IF NOT EXISTS 'CORRETOR_ATRIBUIDO';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE "MatchHistoricoTipo" ADD VALUE IF NOT EXISTS 'CORRETOR_REMOVIDO';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- Garante que a tabela match_historico existe
CREATE TABLE IF NOT EXISTS "match_historico" (
    "id"             TEXT NOT NULL,
    "matchId"        TEXT NOT NULL,
    "tenantId"       TEXT NOT NULL,
    "tipo"           "MatchHistoricoTipo" NOT NULL,
    "etapaOrigemId"  TEXT,
    "etapaDestinoId" TEXT,
    "userId"         TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "match_historico_pkey" PRIMARY KEY ("id")
);

-- FKs idempotentes
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'match_historico_matchId_fkey') THEN
    ALTER TABLE "match_historico" ADD CONSTRAINT "match_historico_matchId_fkey"
      FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'match_historico_etapaOrigemId_fkey') THEN
    ALTER TABLE "match_historico" ADD CONSTRAINT "match_historico_etapaOrigemId_fkey"
      FOREIGN KEY ("etapaOrigemId") REFERENCES "pipeline_etapas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'match_historico_etapaDestinoId_fkey') THEN
    ALTER TABLE "match_historico" ADD CONSTRAINT "match_historico_etapaDestinoId_fkey"
      FOREIGN KEY ("etapaDestinoId") REFERENCES "pipeline_etapas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'match_historico_userId_fkey') THEN
    ALTER TABLE "match_historico" ADD CONSTRAINT "match_historico_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "match_historico_matchId_idx"  ON "match_historico"("matchId");
CREATE INDEX IF NOT EXISTS "match_historico_tenantId_idx" ON "match_historico"("tenantId");
