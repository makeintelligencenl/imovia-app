import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name)

  constructor() {
    // Ajusta o pool de conexões via DATABASE_URL.
    // No Railway, o PostgreSQL aceita ~100 conexões; limitamos para não esgotar.
    // DATABASE_POOL_SIZE: máximo de conexões abertas (default 10)
    // DATABASE_POOL_TIMEOUT: tempo de espera por conexão livre em segundos (default 20)
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

    // Loga queries lentas (> 500 ms) em todos os ambientes
    // @ts-expect-error — tipagem do Prisma para $on é dinâmica
    this.$on('query', (e: { duration: number; query: string }) => {
      if (e.duration > 500) {
        this.logger.warn(`Slow query (${e.duration}ms): ${e.query.slice(0, 120)}`)
      }
    })
  }

  async onModuleInit() {
    await this.$connect()
    this.logger.log('Prisma conectado ao banco de dados')
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }

  /**
   * Executa `fn` dentro de uma transaction com Row-Level Security ativada para o tenant.
   * O `SET LOCAL` garante que a config só vale para essa transaction, sem vazar para
   * outras conexões do pool.
   */
  async withTenantRLS<T>(
    tenantId: string,
    fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`
      return fn(tx)
    })
  }
}
