import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { ClsService } from 'nestjs-cls'
import { Observable } from 'rxjs'

export const TENANT_ID_KEY = 'tenantId'

/**
 * Extrai o tenantId do JWT (já validado pelo JwtAuthGuard) e o armazena em
 * ClsService (nestjs-cls) para que PrismaService possa usá-lo sem precisar
 * receber o parâmetro explicitamente em cada chamada.
 *
 * ClsService propaga corretamente através de RxJS Observables (ao contrário
 * de AsyncLocalStorage puro, que perde o contexto ao cruzar um Observable).
 *
 * Aplicado globalmente em app.module.ts (APP_INTERCEPTOR).
 * Rotas sem autenticação (login, refresh) não têm req.user — nesses casos
 * o tenantId fica undefined e o Prisma rejeita a query via policy RLS.
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(private readonly cls: ClsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{ user?: { tenantId?: string } }>()
    const tenantId = req.user?.tenantId
    if (tenantId) this.cls.set(TENANT_ID_KEY, tenantId)
    return next.handle()
  }
}
