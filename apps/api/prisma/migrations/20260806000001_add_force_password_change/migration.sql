-- AlterTable: adiciona forcePasswordChange ao model User
ALTER TABLE "users" ADD COLUMN "forcePasswordChange" BOOLEAN NOT NULL DEFAULT false;
