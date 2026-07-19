#!/bin/sh
# Script de startup para Railway.
# O banco foi criado com `prisma db push` (sem tracking de migrations).
# Este script faz o "baseline": marca as migrations antigas como aplicadas
# sem re-executá-las, depois aplica apenas as novas.

set -e

echo ">>> Baseline: marcando migrations existentes como aplicadas..."

# Cada linha é idempotente: se já estiver marcada, o || true absorve o erro.
npx prisma migrate resolve --applied 20260521000448_init                 2>/dev/null || true
npx prisma migrate resolve --applied 20260525000000_add_url_imovel       2>/dev/null || true
npx prisma migrate resolve --applied 20260713144405_add_comissao_tenant  2>/dev/null || true
npx prisma migrate resolve --applied 20260714010000_add_gptmaker_chat_id 2>/dev/null || true

echo ">>> Aplicando migrations novas..."
npx prisma migrate deploy

echo ">>> Iniciando aplicação..."
node dist/main
