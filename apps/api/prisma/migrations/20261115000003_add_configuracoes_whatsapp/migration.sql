-- CreateTable
CREATE TABLE "configuracoes_whatsapp" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "businessAccountId" TEXT NOT NULL,
    "accessTokenCriptografado" TEXT NOT NULL,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracoes_whatsapp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "configuracoes_whatsapp_tenantId_key" ON "configuracoes_whatsapp"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "configuracoes_whatsapp_phoneNumberId_key" ON "configuracoes_whatsapp"("phoneNumberId");

-- CreateIndex
CREATE INDEX "configuracoes_whatsapp_businessAccountId_idx" ON "configuracoes_whatsapp"("businessAccountId");

-- AddForeignKey
ALTER TABLE "configuracoes_whatsapp" ADD CONSTRAINT "configuracoes_whatsapp_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
