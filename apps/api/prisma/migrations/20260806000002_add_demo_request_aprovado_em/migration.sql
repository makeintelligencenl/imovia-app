-- AlterTable: marca quando uma solicitação de demo foi aprovada (virou tenant)
ALTER TABLE "demo_requests" ADD COLUMN "aprovadoEm" TIMESTAMP(3);
