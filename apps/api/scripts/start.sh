#!/bin/sh
set -e

echo ">>> Sincronizando schema..."
DATABASE_URL="${MIGRATION_DATABASE_URL:-$DATABASE_URL}" npx prisma db push --accept-data-loss

echo ">>> Aplicando configuracoes pos-deploy (idempotente)..."
npx prisma db execute --file scripts/post-deploy.sql --schema prisma/schema.prisma || true

echo ">>> Iniciando aplicacao..."
node dist/main
