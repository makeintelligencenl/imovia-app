-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id"        TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- AddForeignKey
ALTER TABLE "refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Limpa tokens expirados automaticamente (job periódico chamado pelo app, mas a função fica no DB)
CREATE OR REPLACE FUNCTION cleanup_expired_refresh_tokens() RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM refresh_tokens WHERE "expiresAt" < NOW() OR "revokedAt" IS NOT NULL;
END;
$$;
