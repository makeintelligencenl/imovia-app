import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable } from 'rxjs'
import { AsyncLocalStorage } from 'async_hooks'

export const tenantStorage = new AsyncLocalStorage<string>()

/**
 * Extrai o tenantId do JWT (já validado pelo JwtAuthGuard) e o armazena em
 * AsyncLocalStorage para que PrismaService.withTenantRLS() possa usá-lo
 * sem precisar receber o parâmetro explicitamente em cada chamada.
 *
 * Aplicado globalmente em app.module.ts (APP_INTERCEPTOR).
 * Rotas sem autenticação (login, refresh) não têm req.user — nesses casos
 * o storage fica vazio e o Prisma opera sem RLS (as policies permitem NULL tenant).
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{ user?: { tenantId?: string } }>()
    const tenantId = req.user?.tenantId

    if (!tenantId) return next.handle()

    return new Observable((observer) => {
      tenantStorage.run(tenantId, () => {
        next.handle().subscribe({
          next:     (val) => observer.next(val),
          error:    (err) => observer.error(err),
          complete: ()    => observer.complete(),
        })
      })
    })
  }
}
