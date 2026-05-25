import os
import httpx
from dotenv import load_dotenv
from fastmcp import FastMCP
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

load_dotenv()

# ──────────────────────────────────────────────────────
# Configuração via variáveis de ambiente
# ──────────────────────────────────────────────────────
API_URL    = os.getenv("IMOVIA_API_URL", "http://localhost:3001/api/v1")
BOT_KEY    = os.getenv("BOT_API_KEY", "")
TENANT_ID  = os.getenv("IMOVIA_TENANT_ID", "")
MCP_KEY    = os.getenv("MCP_ACCESS_KEY", "")

if not BOT_KEY:   print("[MCP] Aviso: BOT_API_KEY não definida")
if not TENANT_ID: print("[MCP] Aviso: IMOVIA_TENANT_ID não definida")


# ──────────────────────────────────────────────────────
# Autenticação por header
# ──────────────────────────────────────────────────────
class ApiKeyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if MCP_KEY:
            key = request.headers.get("X-Api-Key", "")
            if key != MCP_KEY:
                return JSONResponse({"error": "Unauthorized"}, status_code=401)
        return await call_next(request)


# ──────────────────────────────────────────────────────
# Helper para chamar a API do ImovIA
# ──────────────────────────────────────────────────────
async def call_api(method: str, path: str, body: dict | None = None) -> dict:
    url = f"{API_URL}{path}"
    headers = {
        "Content-Type": "application/json",
        "x-bot-api-key": BOT_KEY,
    }
    async with httpx.AsyncClient(timeout=30) as client:
        if method == "GET":
            res = await client.get(url, headers=headers)
        else:
            res = await client.post(url, headers=headers, json=body)

        res.raise_for_status()
        return res.json()


# ──────────────────────────────────────────────────────
# Servidor MCP com FastMCP
# ──────────────────────────────────────────────────────
mcp = FastMCP(
    name="ImovIA MCP",
    instructions=(
        "Ferramentas para cadastrar perfis de busca de leads e encontrar imóveis compatíveis "
        "no sistema ImovIA. Use listar_tipos antes de cadastrar_perfil para obter os IDs corretos."
    ),
)


# ──────────────────────────────────────────────────────
# Ferramenta 1: listar_tipos
# ──────────────────────────────────────────────────────
@mcp.tool()
async def listar_tipos() -> dict:
    """
    Lista os tipos de imóvel disponíveis no sistema (ex: Apartamento, Casa, Sala Comercial).
    Use esta ferramenta para obter os IDs corretos antes de cadastrar um perfil de busca.

    Returns:
        Lista de tipos com id e nome.
    """
    return await call_api("GET", "/bot/tipos")


# ──────────────────────────────────────────────────────
# Ferramenta 2: cadastrar_perfil
# ──────────────────────────────────────────────────────
@mcp.tool()
async def cadastrar_perfil(
    clienteNome: str,
    clienteEmail: str,
    finalidade: str,
    tiposIds: list[str],
    precoMin: float,
    precoMax: float,
    areaMin: float,
    cidades: list[str],
    clienteWhatsapp: str | None = None,
    areaMax: float | None = None,
    quartosMin: int | None = None,
    bairros: list[str] | None = None,
) -> dict:
    """
    Cadastra o perfil de busca de um lead no ImovIA.
    Assim que o perfil é criado, o sistema dispara automaticamente o matching
    com os imóveis disponíveis no portfólio da imobiliária.
    Antes de chamar esta ferramenta, use listar_tipos para obter os IDs corretos.

    Args:
        clienteNome: Nome completo do cliente/lead (obrigatório).
        clienteEmail: E-mail do cliente (obrigatório).
        finalidade: ALUGUEL ou VENDA (obrigatório).
        tiposIds: Lista de IDs dos tipos de imóvel aceitos — use listar_tipos (obrigatório).
        precoMin: Orçamento mínimo em R$ (obrigatório).
        precoMax: Orçamento máximo em R$ (obrigatório).
        areaMin: Área mínima desejada em m² (obrigatório).
        cidades: Lista de cidades de interesse, ex: ["Ipatinga", "Coronel Fabriciano"] (obrigatório).
        clienteWhatsapp: WhatsApp com DDD, ex: +5531999999999 (opcional).
        areaMax: Área máxima em m² (opcional).
        quartosMin: Número mínimo de quartos (opcional).
        bairros: Lista de bairros preferidos (opcional).

    Returns:
        Dados do perfil criado, incluindo o perfilId para usar em buscar_imoveis.
    """
    body = {
        "tenantId": TENANT_ID,
        "clienteNome": clienteNome,
        "clienteEmail": clienteEmail,
        "finalidade": finalidade,
        "tiposIds": tiposIds,
        "precoMin": precoMin,
        "precoMax": precoMax,
        "areaMin": areaMin,
        "cidades": cidades,
    }
    if clienteWhatsapp: body["clienteWhatsapp"] = clienteWhatsapp
    if areaMax:         body["areaMax"] = areaMax
    if quartosMin:      body["quartosMin"] = quartosMin
    if bairros:         body["bairros"] = bairros

    return await call_api("POST", "/bot/perfil", body)


# ──────────────────────────────────────────────────────
# Ferramenta 3: buscar_imoveis
# ──────────────────────────────────────────────────────
@mcp.tool()
async def buscar_imoveis(perfilId: str) -> dict:
    """
    Busca os imóveis disponíveis compatíveis com o perfil de busca de um lead.
    Retorna a lista de imóveis com detalhes para apresentar ao cliente.

    Args:
        perfilId: ID do perfil retornado por cadastrar_perfil (obrigatório).

    Returns:
        Lista de imóveis compatíveis com título, localização, preço, área e detalhes.
    """
    return await call_api("GET", f"/bot/imoveis?perfilId={perfilId}&tenantId={TENANT_ID}")


# ──────────────────────────────────────────────────────
# Inicialização
# ──────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    app = mcp.http_app(transport="sse")
    app.add_middleware(ApiKeyMiddleware)
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=port)
