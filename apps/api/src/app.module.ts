import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from './prisma/prisma.module'
import { TenantsModule } from './tenants/tenants.module'
import { AuthModule } from './auth/auth.module'
import { TiposModule } from './tipos/tipos.module'
import { ImoveisModule } from './imoveis/imoveis.module'
import { PerfisModule } from './perfis/perfis.module'
import { MatchingModule } from './matching/matching.module'
import { NotificacoesModule } from './notificacoes/notificacoes.module'
import { LocalidadesModule } from './localidades/localidades.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    TenantsModule,
    TiposModule,
    ImoveisModule,
    PerfisModule,
    MatchingModule,
    NotificacoesModule,
    LocalidadesModule,
  ],
})
export class AppModule {}
