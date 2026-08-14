-- Criação do enum CategoriaFinanceira
CREATE TYPE "CategoriaFinanceira" AS ENUM ('VENDA', 'ALUGUEL');

-- Criação da tabela contas_receber (substitui comissoes_venda)
CREATE TABLE "contas_receber" (
    "id"            TEXT NOT NULL,
    "tenantId"      TEXT NOT NULL,
    "matchId"       TEXT,
    "imovelId"      TEXT,
    "corretorId"    TEXT,
    "categoria"     "CategoriaFinanceira" NOT NULL,
    "tipo"          "ComissaoTipo" NOT NULL,
    "valorBase"     DECIMAL(12,2) NOT NULL,
    "percentual"    DECIMAL(5,2) NOT NULL,
    "valor"         DECIMAL(12,2) NOT NULL,
    "status"        "ComissaoStatus" NOT NULL DEFAULT 'PENDENTE',
    "dataPagamento" TIMESTAMP(3),
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contas_receber_pkey" PRIMARY KEY ("id")
);

-- Índices
CREATE UNIQUE INDEX "contas_receber_matchId_categoria_tipo_key"
    ON "contas_receber"("matchId", "categoria", "tipo")
    WHERE "matchId" IS NOT NULL;

CREATE INDEX "contas_receber_tenantId_status_idx"  ON "contas_receber"("tenantId", "status");
CREATE INDEX "contas_receber_tenantId_corretorId_idx" ON "contas_receber"("tenantId", "corretorId");

-- Foreign keys
ALTER TABLE "contas_receber"
    ADD CONSTRAINT "contas_receber_tenantId_fkey"
        FOREIGN KEY ("tenantId")   REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "contas_receber_matchId_fkey"
        FOREIGN KEY ("matchId")    REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "contas_receber_imovelId_fkey"
        FOREIGN KEY ("imovelId")   REFERENCES "imoveis"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "contas_receber_corretorId_fkey"
        FOREIGN KEY ("corretorId") REFERENCES "users"("id")   ON DELETE SET NULL ON UPDATE CASCADE;

-- Migração dos dados existentes de comissoes_venda → contas_receber
INSERT INTO "contas_receber"
    ("id", "tenantId", "matchId", "imovelId", "corretorId",
     "categoria", "tipo", "valorBase", "percentual", "valor",
     "status", "dataPagamento", "createdAt", "updatedAt")
SELECT
    "id", "tenantId", "matchId", "imovelId", "corretorId",
    'VENDA'::"CategoriaFinanceira", "tipo", "valorImovel", "percentual", "valor",
    "status", "dataPagamento", "createdAt", "updatedAt"
FROM "comissoes_venda";

-- Remove tabela antiga
DROP TABLE "comissoes_venda";

-- Remove campos de status da taxa do ContratoAluguel
-- (o estado de pagamento agora vive em contas_receber)
ALTER TABLE "contratos_aluguel"
    DROP COLUMN IF EXISTS "statusTaxaUnica",
    DROP COLUMN IF EXISTS "dataPagamentoTaxa";
