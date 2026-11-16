-- Conversas e mensagens do WhatsApp (persistência de mensagens recebidas).
-- NÃO aplicar automaticamente: rodar manualmente no Supabase (postgres) e só então marcar como aplicada.

-- CreateEnum
CREATE TYPE "DirecaoMensagem" AS ENUM ('ENTRADA', 'SAIDA');

-- CreateTable
CREATE TABLE "conversas_whatsapp" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "nomeContato" TEXT,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadaEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversas_whatsapp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensagens_whatsapp" (
    "id" TEXT NOT NULL,
    "conversaId" TEXT NOT NULL,
    "waMessageId" TEXT NOT NULL,
    "direcao" "DirecaoMensagem" NOT NULL,
    "tipo" TEXT NOT NULL,
    "texto" TEXT,
    "criadaEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mensagens_whatsapp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "conversas_whatsapp_tenantId_telefone_key" ON "conversas_whatsapp"("tenantId", "telefone");

-- CreateIndex
CREATE UNIQUE INDEX "mensagens_whatsapp_waMessageId_key" ON "mensagens_whatsapp"("waMessageId");

-- CreateIndex
CREATE INDEX "mensagens_whatsapp_conversaId_criadaEm_idx" ON "mensagens_whatsapp"("conversaId", "criadaEm");

-- AddForeignKey
ALTER TABLE "conversas_whatsapp" ADD CONSTRAINT "conversas_whatsapp_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens_whatsapp" ADD CONSTRAINT "mensagens_whatsapp_conversaId_fkey" FOREIGN KEY ("conversaId") REFERENCES "conversas_whatsapp"("id") ON DELETE CASCADE ON UPDATE CASCADE;
