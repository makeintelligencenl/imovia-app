#!/bin/sh
set -e

echo ">>> Sincronizando schema..."
DATABASE_URL="${MIGRATION_DATABASE_URL:-$DATABASE_URL}" npx prisma db push --accept-data-loss

echo ">>> Iniciando aplicacao..."
node dist/main
