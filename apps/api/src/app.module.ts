import { Module } from '@nestjs/common'
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { TenantInterceptor } from './auth/interceptors/tenant.interceptor'
import { ConfigModule } from '@nestjs/config'
import { ClsModule } from 'nestjs-cls'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { PrismaModule } from './prisma/prisma.module'
import { TenantsModule } from './tenants/tenants.module'
import { AuthModule } from './auth/auth.module'
import { TiposModule } from './tipos/tipos.module'
import { ImoveisModule } from './imoveis/imoveis.module'
import { PerfisModule } from './perfis/perfis.module'
import { MatchingModule } from './matching/matching.module'
import { NotificacoesModule } from './notificacoes/notificacoes.module'
import { LocalidadesModule } from './localidades/localidades.module'
import { PipelineModule } from './pipeline/pipeline.module'
import { UsersModule } from './users/users.module'
import { VisitasModule } from './visitas/visitas.module'
import { ClientesModule } from './clientes/clientes.module'
import { FinanceiroModule } from './financeiro/financeiro.module'
import { DemoRequestsModule } from './demo-requests/demo-requests.module'
import { CaracteristicasModule } from './caracteristicas/caracteristicas.module'
import { AluguelModule } from './aluguel/aluguel.module'
import { WhatsappModule } from './whatsapp/whatsapp.module'
import { AgenteModule } from './agente/agente.module'
import { IaModule } from './ia/ia.module'
import { ConversasModule } from './conversas/conversas.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // CLS (Continuation Local Storage) — propaga contexto de tenant por request
    // através de RxJS Observables. O middleware monta o store antes do guard/interceptor.
    ClsModule.forRoot({ middleware: { mount: true } }),
    // Max 10 tentativas de login por minuto por IP
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }]),
    PrismaModule,
    AuthModule,
    TenantsModule,
    TiposModule,
    ImoveisModule,
    ClientesModule,
    PerfisModule,
    MatchingModule,
    NotificacoesModule,
    LocalidadesModule,
    PipelineModule,
    UsersModule,
    VisitasModule,
    FinanceiroModule,
    DemoRequestsModule,
    CaracteristicasModule,
    AluguelModule,
    WhatsappModule,
    ConversasModule,
    AgenteModule,
    IaModule,
  ],
  providers: [
    { provide: APP_GUARD,       useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: TenantInterceptor },
  ],
})
export class AppModule {}
