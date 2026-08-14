-- Enums
CREATE TYPE "AluguelComissaoTipo" AS ENUM ('TAXA_UNICA', 'MENSAL', 'AMBOS');
CREATE TYPE "ContratoStatus" AS ENUM ('ATIVO', 'ENCERRADO');

-- Novos campos no Tenant
ALTER TABLE "tenants"
  ADD COLUMN "aluguelComissaoTipo"     "AluguelComissaoTipo" NOT NULL DEFAULT 'TAXA_UNICA',
  ADD COLUMN "aluguelPercTaxaUnica"    DECIMAL(5,2)          DEFAULT 100.00,
  ADD COLUMN "aluguelSplitImobiliaria" DECIMAL(5,2)          DEFAULT 50.00,
  ADD COLUMN "aluguelSplitCorretor"    DECIMAL(5,2)          DEFAULT 50.00;

-- Nova tabela
CREATE TABLE "contratos_aluguel" (
  "id"                   TEXT         NOT NULL,
  "tenantId"             TEXT         NOT NULL,
  "matchId"              TEXT         NOT NULL,
  "imovelId"             TEXT         NOT NULL,
  "corretorId"           TEXT,
  "dataInicio"           TIMESTAMP(3) NOT NULL,
  "duracaoMeses"         INTEGER      NOT NULL,
  "dataVencimento"       TIMESTAMP(3) NOT NULL,
  "valorMensal"          DECIMAL(12,2) NOT NULL,
  "status"               "ContratoStatus"  NOT NULL DEFAULT 'ATIVO',
  "dataEncerramento"     TIMESTAMP(3),
  "percTaxaUnica"        DECIMAL(5,2),
  "valorTaxaUnicaImob"   DECIMAL(12,2),
  "valorTaxaUnicaCorr"   DECIMAL(12,2),
  "statusTaxaUnica"      "ComissaoStatus"  NOT NULL DEFAULT 'PENDENTE',
  "dataPagamentoTaxa"    TIMESTAMP(3),
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "contratos_aluguel_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "contratos_aluguel_matchId_key" UNIQUE ("matchId")
);

-- Índices
CREATE INDEX "contratos_aluguel_tenantId_status_idx"     ON "contratos_aluguel"("tenantId", "status");
CREATE INDEX "contratos_aluguel_tenantId_corretorId_idx" ON "contratos_aluguel"("tenantId", "corretorId");

-- Foreign keys
ALTER TABLE "contratos_aluguel"
  ADD CONSTRAINT "contratos_aluguel_tenantId_fkey"   FOREIGN KEY ("tenantId")   REFERENCES "tenants"("id"),
  ADD CONSTRAINT "contratos_aluguel_matchId_fkey"    FOREIGN KEY ("matchId")    REFERENCES "matches"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "contratos_aluguel_imovelId_fkey"   FOREIGN KEY ("imovelId")   REFERENCES "imoveis"("id"),
  ADD CONSTRAINT "contratos_aluguel_corretorId_fkey" FOREIGN KEY ("corretorId") REFERENCES "users"("id");
