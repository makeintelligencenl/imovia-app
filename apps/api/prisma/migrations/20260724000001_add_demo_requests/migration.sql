-- CreateTable
CREATE TABLE "demo_requests" (
    "id"        TEXT NOT NULL,
    "nome"      TEXT NOT NULL,
    "email"     TEXT NOT NULL,
    "telefone"  TEXT NOT NULL,
    "empresa"   TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demo_requests_pkey" PRIMARY KEY ("id")
);
