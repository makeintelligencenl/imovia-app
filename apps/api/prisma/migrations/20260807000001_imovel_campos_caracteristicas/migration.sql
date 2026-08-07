-- Novos campos no model Imovel
ALTER TABLE "imoveis"
  ADD COLUMN "iptu"            DECIMAL(10,2),
  ADD COLUMN "seguroIncendio"  DECIMAL(10,2),
  ADD COLUMN "condominio"      DECIMAL(10,2),
  ADD COLUMN "andar"           INTEGER,
  ADD COLUMN "suites"          INTEGER,
  ADD COLUMN "nomeCondominio"  VARCHAR(255);

-- Tabela de características por tenant
CREATE TABLE "caracteristicas" (
  "id"        TEXT         NOT NULL,
  "nome"      TEXT         NOT NULL,
  "ativo"     BOOLEAN      NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "tenantId"  TEXT         NOT NULL,
  CONSTRAINT "caracteristicas_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "caracteristicas_tenantId_nome_key" UNIQUE ("tenantId", "nome"),
  CONSTRAINT "caracteristicas_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Tabela de junção many-to-many Imovel <-> Caracteristica
CREATE TABLE "_ImovelCaracteristicas" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,
  CONSTRAINT "_ImovelCaracteristicas_AB_pkey" PRIMARY KEY ("A","B"),
  CONSTRAINT "_ImovelCaracteristicas_A_fkey"
    FOREIGN KEY ("A") REFERENCES "imoveis"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "_ImovelCaracteristicas_B_fkey"
    FOREIGN KEY ("B") REFERENCES "caracteristicas"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "_ImovelCaracteristicas_B_index" ON "_ImovelCaracteristicas"("B");
