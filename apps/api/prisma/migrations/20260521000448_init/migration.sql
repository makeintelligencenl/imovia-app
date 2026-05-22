-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CORRETOR');

-- CreateEnum
CREATE TYPE "TipoImovel" AS ENUM ('APARTAMENTO', 'CASA', 'COMERCIAL', 'TERRENO', 'RURAL');

-- CreateEnum
CREATE TYPE "Finalidade" AS ENUM ('ALUGUEL', 'VENDA');

-- CreateEnum
CREATE TYPE "StatusImovel" AS ENUM ('DISPONIVEL', 'RESERVADO', 'ALUGADO', 'VENDIDO', 'INATIVO');

-- CreateEnum
CREATE TYPE "StatusMatch" AS ENUM ('NOTIFICADO', 'VISUALIZADO', 'INTERESSADO', 'EM_NEGOCIACAO', 'FECHADO', 'DESCARTADO');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CORRETOR',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imoveis" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipo" "TipoImovel" NOT NULL,
    "finalidade" "Finalidade" NOT NULL,
    "preco" DECIMAL(12,2) NOT NULL,
    "areaM2" DECIMAL(8,2) NOT NULL,
    "quartos" INTEGER,
    "banheiros" INTEGER,
    "vagas" INTEGER,
    "bairro" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "estado" CHAR(2) NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "descricao" TEXT,
    "status" "StatusImovel" NOT NULL DEFAULT 'DISPONIVEL',
    "origem" TEXT,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "imoveis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfis_busca" (
    "id" TEXT NOT NULL,
    "clienteNome" TEXT NOT NULL,
    "clienteEmail" TEXT NOT NULL,
    "clienteWhatsapp" TEXT,
    "finalidade" "Finalidade" NOT NULL,
    "tipo" TEXT[],
    "precoMin" DECIMAL(12,2) NOT NULL,
    "precoMax" DECIMAL(12,2) NOT NULL,
    "areaMin" DECIMAL(8,2) NOT NULL,
    "areaMax" DECIMAL(8,2),
    "quartosMin" INTEGER,
    "cidades" TEXT[],
    "bairros" TEXT[],
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "perfis_busca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "status" "StatusMatch" NOT NULL DEFAULT 'NOTIFICADO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "perfilId" TEXT NOT NULL,
    "imovelId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "imoveis_tenantId_status_idx" ON "imoveis"("tenantId", "status");

-- CreateIndex
CREATE INDEX "imoveis_tenantId_finalidade_tipo_idx" ON "imoveis"("tenantId", "finalidade", "tipo");

-- CreateIndex
CREATE INDEX "imoveis_tenantId_cidade_idx" ON "imoveis"("tenantId", "cidade");

-- CreateIndex
CREATE INDEX "perfis_busca_tenantId_ativo_finalidade_idx" ON "perfis_busca"("tenantId", "ativo", "finalidade");

-- CreateIndex
CREATE INDEX "matches_tenantId_idx" ON "matches"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "matches_perfilId_imovelId_key" ON "matches"("perfilId", "imovelId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imoveis" ADD CONSTRAINT "imoveis_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfis_busca" ADD CONSTRAINT "perfis_busca_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "perfis_busca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_imovelId_fkey" FOREIGN KEY ("imovelId") REFERENCES "imoveis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
