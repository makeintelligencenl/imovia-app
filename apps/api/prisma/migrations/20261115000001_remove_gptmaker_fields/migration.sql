-- DropIndex
DROP INDEX IF EXISTS "clientes_tenantId_gptMakerChatId_idx";

-- AlterTable
ALTER TABLE "clientes" DROP COLUMN IF EXISTS "gptMakerChatId";

-- AlterTable
ALTER TABLE "tenants" DROP COLUMN IF EXISTS "gptMakerWorkspaceId";
ALTER TABLE "tenants" DROP COLUMN IF EXISTS "gptMakerAgentId";
