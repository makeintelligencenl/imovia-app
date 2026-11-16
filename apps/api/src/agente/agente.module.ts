import { forwardRef, Module } from '@nestjs/common'
import { IaModule } from '../ia/ia.module'
import { MatchingModule } from '../matching/matching.module'
import { PrismaModule } from '../prisma/prisma.module'
import { WhatsappModule } from '../whatsapp/whatsapp.module'
import { AgenteController } from './agente.controller'
import { AgenteAtendimentoService } from './agente-atendimento.service'
import { ConfiguracaoAgenteService } from './configuracao-agente.service'
import { FerramentasAgenteService } from './ferramentas-agente.service'

// WhatsappModule usa forwardRef porque o webhook também chama o atendimento.
@Module({
  imports: [PrismaModule, IaModule, MatchingModule, forwardRef(() => WhatsappModule)],
  controllers: [AgenteController],
  providers: [ConfiguracaoAgenteService, FerramentasAgenteService, AgenteAtendimentoService],
  exports: [ConfiguracaoAgenteService, AgenteAtendimentoService],
})
export class AgenteModule {}
