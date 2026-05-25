import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ConfigModule } from '@nestjs/config'
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
import { BotModule } from './bot/bot.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Máx 10 tentativas de login por minuto por IP
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }]),
    PrismaModule,
    AuthModule,
    TenantsModule,
    TiposModule,
    ImoveisModule,
    PerfisModule,
    MatchingModule,
    NotificacoesModule,
    LocalidadesModule,
    BotModule,
  ],
  providers: [
    // ThrottlerGuard global: protege todos os endpoints da API
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
