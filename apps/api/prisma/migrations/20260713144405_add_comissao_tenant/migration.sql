/*
  Warnings:

  - You are about to drop the column `cidade` on the `imoveis` table. All the data in the column will be lost.
  - You are about to drop the column `tipo` on the `imoveis` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `matches` table. All the data in the column will be lost.
  - You are about to drop the column `clienteEmail` on the `perfis_busca` table. All the data in the column will be lost.
  - You are about to drop the column `clienteNome` on the `perfis_busca` table. All the data in the column will be lost.
  - You are about to drop the column `clienteWhatsapp` on the `perfis_busca` table. All the data in the column will be lost.
  - You are about to drop the column `tipo` on the `perfis_busca` table. All the data in the column will be lost.
  - Added the required column `cidadeId` to the `imoveis` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tipoId` to the `imoveis` table without a default value. This is not possible if the table is not empty.
  - Added the required column `etapaId` to the `matches` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clienteId` to the `perfis_busca` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MatchHistoricoTipo" AS ENUM ('MATCH_CRIADO', 'ETAPA_ALTERADA', 'CORRETOR_ATRIBUIDO', 'CORRETOR_REMOVIDO');

-- CreateEnum
CREATE TYPE "VisitaStatus" AS ENUM ('AGENDADA', 'CONFIRMADA', 'REALIZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "ComissaoTipo" AS ENUM ('IMOBILIARIA', 'CORRETOR');

-- CreateEnum
CREATE TYPE "ComissaoStatus" AS ENUM ('PENDENTE', 'PAGO');

-- DropIndex
DROP INDEX "imoveis_tenantId_cidade_idx";

-- DropIndex
DROP INDEX "imoveis_tenantId_finalidade_tipo_idx";

-- AlterTable
ALTER TABLE "imoveis" DROP COLUMN "cidade",
DROP COLUMN "tipo",
ADD COLUMN     "cep" VARCHAR(9),
ADD COLUMN     "cidadeId" INTEGER NOT NULL,
ADD COLUMN     "codigoOrigem" VARCHAR(255),
ADD COLUMN     "tipoId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "matches" DROP COLUMN "status",
ADD COLUMN     "corretorId" TEXT,
ADD COLUMN     "etapaId" TEXT NOT NULL,
ADD COLUMN     "leadScore" INTEGER NOT NULL DEFAULT 50;

-- AlterTable
ALTER TABLE "perfis_busca" DROP COLUMN "clienteEmail",
DROP COLUMN "clienteNome",
DROP COLUMN "clienteWhatsapp",
DROP COLUMN "tipo",
ADD COLUMN     "clienteId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "comissaoPercentualTotal" DECIMAL(5,2) DEFAULT 6.00,
ADD COLUMN     "comissaoSplitCorretor" DECIMAL(5,2) DEFAULT 50.00,
ADD COLUMN     "comissaoSplitImobiliaria" DECIMAL(5,2) DEFAULT 50.00;

-- DropEnum
DROP TYPE "StatusMatch";

-- DropEnum
DROP TYPE "TipoImovel";

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "whatsapp" TEXT,
    "telefone" TEXT,
    "cpf" TEXT,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,
    "corretorId" TEXT,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estados" (
    "id" INTEGER NOT NULL,
    "sigla" CHAR(2) NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "estados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cidades" (
    "id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "estadoId" INTEGER NOT NULL,

    CONSTRAINT "cidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_imovel" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tipos_imovel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipeline_etapas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" VARCHAR(7) NOT NULL,
    "ordem" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "pipeline_etapas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_historico" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tipo" "MatchHistoricoTipo" NOT NULL,
    "etapaOrigemId" TEXT,
    "etapaDestinoId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_historico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitas" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "matchId" TEXT,
    "imovelId" TEXT NOT NULL,
    "corretorId" TEXT,
    "dataHora" TIMESTAMP(3) NOT NULL,
    "duracaoMin" INTEGER NOT NULL DEFAULT 60,
    "status" "VisitaStatus" NOT NULL DEFAULT 'AGENDADA',
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clienteId" TEXT NOT NULL,

    CONSTRAINT "visitas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comissoes_venda" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "imovelId" TEXT NOT NULL,
    "corretorId" TEXT,
    "tipo" "ComissaoTipo" NOT NULL,
    "valorImovel" DECIMAL(12,2) NOT NULL,
    "percentual" DECIMAL(5,2) NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "status" "ComissaoStatus" NOT NULL DEFAULT 'PENDENTE',
    "dataPagamento" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comissoes_venda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PerfilTipos" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PerfilTipos_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "clientes_tenantId_idx" ON "clientes"("tenantId");

-- CreateIndex
CREATE INDEX "clientes_tenantId_email_idx" ON "clientes"("tenantId", "email");

-- CreateIndex
CREATE INDEX "clientes_tenantId_corretorId_idx" ON "clientes"("tenantId", "corretorId");

-- CreateIndex
CREATE UNIQUE INDEX "estados_sigla_key" ON "estados"("sigla");

-- CreateIndex
CREATE INDEX "cidades_estadoId_idx" ON "cidades"("estadoId");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_imovel_nome_key" ON "tipos_imovel"("nome");

-- CreateIndex
CREATE INDEX "pipeline_etapas_tenantId_ordem_idx" ON "pipeline_etapas"("tenantId", "ordem");

-- CreateIndex
CREATE INDEX "idx_pipeline_etapas_tenantid_ordem" ON "pipeline_etapas"("tenantId", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_etapas_tenantId_nome_key" ON "pipeline_etapas"("tenantId", "nome");

-- CreateIndex
CREATE INDEX "match_historico_matchId_idx" ON "match_historico"("matchId");

-- CreateIndex
CREATE INDEX "match_historico_tenantId_idx" ON "match_historico"("tenantId");

-- CreateIndex
CREATE INDEX "visitas_tenantId_idx" ON "visitas"("tenantId");

-- CreateIndex
CREATE INDEX "visitas_tenantId_clienteId_idx" ON "visitas"("tenantId", "clienteId");

-- CreateIndex
CREATE INDEX "visitas_tenantId_corretorId_idx" ON "visitas"("tenantId", "corretorId");

-- CreateIndex
CREATE INDEX "visitas_tenantId_dataHora_idx" ON "visitas"("tenantId", "dataHora");

-- CreateIndex
CREATE INDEX "comissoes_venda_tenantId_idx" ON "comissoes_venda"("tenantId");

-- CreateIndex
CREATE INDEX "comissoes_venda_tenantId_corretorId_idx" ON "comissoes_venda"("tenantId", "corretorId");

-- CreateIndex
CREATE INDEX "comissoes_venda_tenantId_status_idx" ON "comissoes_venda"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "comissoes_venda_matchId_tipo_key" ON "comissoes_venda"("matchId", "tipo");

-- CreateIndex
CREATE INDEX "_PerfilTipos_B_index" ON "_PerfilTipos"("B");

-- CreateIndex
CREATE INDEX "imoveis_tenantId_finalidade_tipoId_idx" ON "imoveis"("tenantId", "finalidade", "tipoId");

-- CreateIndex
CREATE INDEX "imoveis_tenantId_cidadeId_idx" ON "imoveis"("tenantId", "cidadeId");

-- CreateIndex
CREATE INDEX "matches_tenantId_etapaId_idx" ON "matches"("tenantId", "etapaId");

-- CreateIndex
CREATE INDEX "matches_tenantId_corretorId_idx" ON "matches"("tenantId", "corretorId");

-- CreateIndex
CREATE INDEX "perfis_busca_tenantId_clienteId_idx" ON "perfis_busca"("tenantId", "clienteId");

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_corretorId_fkey" FOREIGN KEY ("corretorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cidades" ADD CONSTRAINT "cidades_estadoId_fkey" FOREIGN KEY ("estadoId") REFERENCES "estados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imoveis" ADD CONSTRAINT "imoveis_cidadeId_fkey" FOREIGN KEY ("cidadeId") REFERENCES "cidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imoveis" ADD CONSTRAINT "imoveis_tipoId_fkey" FOREIGN KEY ("tipoId") REFERENCES "tipos_imovel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfis_busca" ADD CONSTRAINT "perfis_busca_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_etapas" ADD CONSTRAINT "pipeline_etapas_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_corretorId_fkey" FOREIGN KEY ("corretorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_etapaId_fkey" FOREIGN KEY ("etapaId") REFERENCES "pipeline_etapas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_historico" ADD CONSTRAINT "match_historico_etapaDestinoId_fkey" FOREIGN KEY ("etapaDestinoId") REFERENCES "pipeline_etapas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_historico" ADD CONSTRAINT "match_historico_etapaOrigemId_fkey" FOREIGN KEY ("etapaOrigemId") REFERENCES "pipeline_etapas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_historico" ADD CONSTRAINT "match_historico_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_historico" ADD CONSTRAINT "match_historico_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitas" ADD CONSTRAINT "visitas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitas" ADD CONSTRAINT "visitas_corretorId_fkey" FOREIGN KEY ("corretorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitas" ADD CONSTRAINT "visitas_imovelId_fkey" FOREIGN KEY ("imovelId") REFERENCES "imoveis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitas" ADD CONSTRAINT "visitas_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitas" ADD CONSTRAINT "visitas_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comissoes_venda" ADD CONSTRAINT "comissoes_venda_corretorId_fkey" FOREIGN KEY ("corretorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comissoes_venda" ADD CONSTRAINT "comissoes_venda_imovelId_fkey" FOREIGN KEY ("imovelId") REFERENCES "imoveis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comissoes_venda" ADD CONSTRAINT "comissoes_venda_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comissoes_venda" ADD CONSTRAINT "comissoes_venda_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PerfilTipos" ADD CONSTRAINT "_PerfilTipos_A_fkey" FOREIGN KEY ("A") REFERENCES "perfis_busca"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PerfilTipos" ADD CONSTRAINT "_PerfilTipos_B_fkey" FOREIGN KEY ("B") REFERENCES "tipos_imovel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
