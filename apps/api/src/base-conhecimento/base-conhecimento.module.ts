import { Module } from '@nestjs/common'
import { AgenteModule } from '../agente/agente.module'
import { PrismaModule } from '../prisma/prisma.module'
import { BaseConhecimentoController } from './base-conhecimento.controller'
import { BaseConhecimentoService } from './base-conhecimento.service'
import { EmbeddingsOpenAiService } from './embeddings-openai.service'

@Module({
  imports: [PrismaModule, AgenteModule],
  controllers: [BaseConhecimentoController],
  providers: [BaseConhecimentoService, EmbeddingsOpenAiService],
  exports: [BaseConhecimentoService, EmbeddingsOpenAiService],
})
export class BaseConhecimentoModule {}
