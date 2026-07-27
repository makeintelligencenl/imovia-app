import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { tenantStorage } from '../auth/interceptors/tenant.interceptor'

// Nomes dos delegates de model no Prisma Client (camelCase, espelhando o schema)
const MODEL_DELEGATES = new Set([
  'tenant', 'user', 'refreshToken', 'cliente', 'estado', 'cidade',
  'demoRequest', 'tipoImovel', 'imovel', 'perfilBusca', 'pipelineEtapa',
  'match', 'matchHistorico', 'visita', 'comissaoVenda',
])

// Operações de model que precisam passar pelo RLS
const MODEL_OPS = new Set([
  'findMany', 'findFirst', 'findUnique', 'findUniqueOrThrow', 'findFirstOrThrow',
  'create', 'createMany', 'createManyAndReturn',
  'update', 'updateMany', 'updateManyAndReturn',
  'upsert', 'delete', 'deleteMany',
  'count', 'aggregate', 'groupBy',
])

/**
 * Cria um Proxy sobre um delegate de model (ex: prisma.cliente) que envolve
 * cada operação em uma transaction com SET LOCAL app.current_tenant_id.
 * Usa o client base (não proxied) para a transaction para evitar recursão.
 */
function wrapModelDelegate(baseClient: PrismaClient, modelName: string, delegate: unknown) {
  return new Proxy(delegate as object, {
    get(target: any, method: string | symbol) {
      const fn: unknown = Reflect.get(target, method)
      if (typeof method !== 'string' || !MODEL_OPS.has(method) || typeof fn !== 'function') {
        return fn
      }
      return (args: unknown) => {
        const tenantId = tenantStorage.getStore()
        if (!tenantId) return (fn as Function).call(target, args)

        // Usa baseClient.$transaction (não proxied) para evitar recursão
        return (baseClient as any).$transaction(async (tx: any) => {
          await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`
          return tx[modelName][method](args)
        })
      }
    },
  })
}

/**
 * Envolve o PrismaClient num Proxy que:
 *  - Intercepta acessos a delegates de model → injeta SET LOCAL por operação
 *  - Intercepta $transaction → injeta SET LOCAL no início da transaction
 * O tenantId vem do AsyncLocalStorage populado pelo TenantInterceptor.
 */
function createRLSProxy(client: PrismaClient): PrismaClient {
  // Cria os model delegates já envolvidos, usando o client base (não proxied)
  const wrappedDelegates = new Map<string, unknown>()
  for (const name of MODEL_DELEGATES) {
    const delegate = (client as any)[name]
    if (delegate) wrappedDelegates.set(name, wrapModelDelegate(client, name, delegate))
  }

  return new Proxy(client, {
    get(target: any, prop: string | symbol) {
      if (typeof prop !== 'string') return Reflect.get(target, prop)

      // Delegates de model → versão com RLS automático
      if (wrappedDelegates.has(prop)) return wrappedDelegates.get(prop)

      // $transaction → injeta SET LOCAL no início
      if (prop === '$transaction') {
        const originalTx: Function = target.$transaction.bind(target)
        return (fnOrOps: unknown, options?: unknown) => {
          const tenantId = tenantStorage.getStore()
          // Batch transaction (array) ou sem tenant → passa direto
          if (!tenantId || Array.isArray(fnOrOps)) return originalTx(fnOrOps, options)
          return originalTx(async (tx: any) => {
            await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`
            return (fnOrOps as Function)(tx)
          }, options)
        }
      }

      return Reflect.get(target, prop)
    },
  }) as PrismaClient
}

type TxClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name)
  // Referência ao $transaction original (não proxied), usada por withTenantRLS
  private readonly _baseTx: PrismaClient['$transaction']

  constructor() {
    const rawUrl = process.env.DATABASE_URL ?? ''
    const poolSize    = process.env.DATABASE_POOL_SIZE    ?? '10'
    const poolTimeout = process.env.DATABASE_POOL_TIMEOUT ?? '20'

    const url = rawUrl.includes('connection_limit')
      ? rawUrl
      : `${rawUrl}${rawUrl.includes('?') ? '&' : '?'}connection_limit=${poolSize}&pool_timeout=${poolTimeout}`

    super({
      datasources: { db: { url } },
      log: process.env.NODE_ENV === 'production'
        ? [{ emit: 'event', level: 'error' }]
        : [{ emit: 'event', level: 'error' }, { emit: 'event', level: 'warn' }],
    })

    // @ts-expect-error — tipagem do Prisma para $on é dinâmica
    this.$on('query', (e: { duration: number; query: string }) => {
      if (e.duration > 500) {
        this.logger.warn(`Slow query (${e.duration}ms): ${e.query.slice(0, 120)}`)
      }
    })

    // Guarda referência ao $transaction real ANTES de criar o Proxy
    this._baseTx = this.$transaction.bind(this)

    // Retorna o client envolvido no Proxy de RLS automático.
    // A partir daqui, toda operação de model usa o tenantStorage para SET LOCAL.
    return createRLSProxy(this) as this
  }

  async onModuleInit() {
    await this.$connect()
    this.logger.log('Prisma conectado — RLS automático ativo')
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }

  /**
   * Executa `fn` com RLS ativada para um tenant explícito.
   * Use quando o tenantId não vem do JWT (ex: bot endpoint, seeds, scripts admin).
   */
  async withTenantRLS<T>(tenantId: string, fn: (tx: TxClient) => Promise<T>): Promise<T> {
    return (this._baseTx as any)(async (tx: any) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`
      return fn(tx)
    })
  }
}
