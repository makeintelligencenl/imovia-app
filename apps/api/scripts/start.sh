#!/bin/sh
set -e

echo ">>> Sincronizando schema..."
npx prisma db push --accept-data-loss

echo ">>> Aplicando configuracoes de seguranca (idempotente)..."
npx prisma db execute --file scripts/post-deploy.sql --schema prisma/schema.prisma || true

echo ">>> Iniciando aplicacao..."
node dist/main
