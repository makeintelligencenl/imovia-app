-- Agente de atendimento WhatsApp (v1): configuração, base de conhecimento com pgvector,
-- chaves de IA por tenant, handoff humano na conversa e cliente sem email obrigatório.
-- NÃO aplicar automaticamente: rodar manualmente no Supabase (postgres).
-- Antes: habilitar a extensão vector. No Supabase ela é instalada no schema "extensions".

CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "ProvedorIa" AS ENUM ('anthropic', 'openai');

-- AlterTable
ALTER TABLE "conversas_whatsapp" ADD COLUMN     "assumidoPorId" TEXT,
ADD COLUMN     "humanTalk" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "clientes" ALTER COLUMN "email" DROP NOT NULL;

-- CreateTable
CREATE TABLE "configuracoes_agente" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "nome" TEXT NOT NULL DEFAULT 'Atendente',
    "instrucoes" TEXT NOT NULL,
    "provedor" "ProvedorIa" NOT NULL,
    "modelo" TEXT NOT NULL,
    "tempoRespostaSegundos" INTEGER NOT NULL DEFAULT 5,
    "transferirParaHumano" BOOLEAN NOT NULL DEFAULT true,
    "mensagemTransferencia" TEXT,
    "usarEmojis" BOOLEAN NOT NULL DEFAULT true,
    "assinarNome" BOOLEAN NOT NULL DEFAULT false,
    "restringirTemas" BOOLEAN NOT NULL DEFAULT false,
    "camposObrigatorios" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "maxMatches" INTEGER NOT NULL DEFAULT 5,
    "ultimaFalhaEm" TIMESTAMP(3),
    "ultimaFalhaMensagem" TEXT,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracoes_agente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agente_itens_base" (
    "configuracaoId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,

    CONSTRAINT "agente_itens_base_pkey" PRIMARY KEY ("configuracaoId","itemId")
);

-- CreateTable
CREATE TABLE "base_conhecimento_itens" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "base_conhecimento_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "base_conhecimento_chunks" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "conteudo" TEXT NOT NULL,
    "vetor" vector(1536),

    CONSTRAINT "base_conhecimento_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chaves_ia_provedor" (
    "tenantId" TEXT NOT NULL,
    "provedor" "ProvedorIa" NOT NULL,
    "apiKeyCriptografada" TEXT NOT NULL,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chaves_ia_provedor_pkey" PRIMARY KEY ("tenantId","provedor")
);

-- CreateIndex
CREATE UNIQUE INDEX "configuracoes_agente_tenantId_key" ON "configuracoes_agente"("tenantId");

-- CreateIndex
CREATE INDEX "base_conhecimento_itens_tenantId_idx" ON "base_conhecimento_itens"("tenantId");

-- CreateIndex
CREATE INDEX "base_conhecimento_chunks_itemId_idx" ON "base_conhecimento_chunks"("itemId");

-- AddForeignKey
ALTER TABLE "configuracoes_agente" ADD CONSTRAINT "configuracoes_agente_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agente_itens_base" ADD CONSTRAINT "agente_itens_base_configuracaoId_fkey" FOREIGN KEY ("configuracaoId") REFERENCES "configuracoes_agente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agente_itens_base" ADD CONSTRAINT "agente_itens_base_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "base_conhecimento_itens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "base_conhecimento_itens" ADD CONSTRAINT "base_conhecimento_itens_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "base_conhecimento_chunks" ADD CONSTRAINT "base_conhecimento_chunks_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "base_conhecimento_itens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chaves_ia_provedor" ADD CONSTRAINT "chaves_ia_provedor_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversas_whatsapp" ADD CONSTRAINT "conversas_whatsapp_assumidoPorId_fkey" FOREIGN KEY ("assumidoPorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

