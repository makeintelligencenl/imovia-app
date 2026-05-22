# Corretor Imóveis Inteligente

SaaS de matching reverso de imóveis — clientes cadastram o que querem, a plataforma avisa quando o imóvel ideal aparecer.

## Arquitetura

```
corretor-imoveis-inteligente/
├── apps/
│   ├── api/          # NestJS — API REST + motor de matching
│   └── web/          # Next.js — portal da imobiliária e do cliente
├── packages/
│   ├── mcp-server/   # MCP Server — integração com sistemas de terceiros via tool calls
│   └── shared/       # Tipos TypeScript compartilhados
```

## Fluxo Principal

```
Cliente cadastra perfil de busca
        ↓
Imóvel é cadastrado (manual ou via MCP)
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

## MCP Server

O MCP Server permite que sistemas externos (ou um agente Claude) integrem com a plataforma via tool calls.

### Tools disponíveis

| Tool | Descrição |
|------|-----------|
| `registrar_imovel` | Cadastra imóvel e dispara matching |
| `listar_perfis` | Lista perfis de busca ativos |
| `consultar_matches` | Retorna matches gerados |
| `atualizar_status_imovel` | Atualiza status (vendido, alugado, etc.) |

### Configurar no Claude Code

```json
{
  "mcpServers": {
    "corretor-imoveis": {
      "command": "node",
      "args": ["packages/mcp-server/dist/index.js"],
      "env": {
        "CORRETOR_API_URL": "http://localhost:3001/api/v1",
        "CORRETOR_API_KEY": "seu-jwt-token-aqui"
      }
    }
  }
}
```

## Stack

- **API**: NestJS + Prisma + PostgreSQL + BullMQ + Redis
- **Email**: Resend
- **WhatsApp**: Evolution API (self-hosted)
- **MCP**: @modelcontextprotocol/sdk
- **Monorepo**: Turborepo + npm workspaces
