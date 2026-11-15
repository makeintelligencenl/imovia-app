# Corretor Imóveis Inteligente

SaaS de matching reverso de imóveis — clientes cadastram o que querem, a plataforma avisa quando o imóvel ideal aparecer.

## Arquitetura

```
corretor-imoveis-inteligente/
├── apps/
│   ├── api/          # NestJS — API REST + motor de matching
│   └── web/          # Next.js — portal da imobiliária e do cliente
├── packages/
│   └── shared/       # Tipos TypeScript compartilhados
```

## Fluxo Principal

```
Cliente cadastra perfil de busca
        ↓
Imóvel é cadastrado (manual)
        ↓
Job assíncrono (BullMQ) cruza perfis × imóvel
        ↓
Match encontrado → notificação por email + WhatsApp
        ↓
Cliente interessado → contato com corretor humano
```

## Setup de Desenvolvimento

### Pré-requisitos
- Node.js >= 20
- PostgreSQL
- Redis

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar variáveis de ambiente
```bash
cp apps/api/.env.example apps/api/.env
# Edite apps/api/.env com suas configurações
```

### 3. Banco de dados
```bash
# Criar e aplicar migrations
npm run db:migrate

# Popular com dados de exemplo
npm run db:seed
```

### 4. Iniciar em desenvolvimento
```bash
npm run dev
```

- API: http://localhost:3001
- Swagger: http://localhost:3001/docs

## Stack

- **API**: NestJS + Prisma + PostgreSQL + BullMQ + Redis
- **Email**: Resend
- **WhatsApp**: Evolution API (self-hosted)
- **Monorepo**: Turborepo + npm workspaces
