import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { AgenteController } from './agente.controller'
import { AnthropicClientService } from './llm/anthropic-client.service'
import { OpenAiClientService } from './llm/openai-client.service'
import { ChavesIaController } from './chaves-ia.controller'
import { ChavesIaService } from './chaves-ia.service'
import { ConfiguracaoAgenteService } from './configuracao-agente.service'

@Module({
  imports: [PrismaModule],
  controllers: [AgenteController, ChavesIaController],
  providers: [ConfiguracaoAgenteService, ChavesIaService, AnthropicClientService, OpenAiClientService],
  exports: [ConfiguracaoAgenteService, ChavesIaService, AnthropicClientService, OpenAiClientService],
})
export class AgenteModule {}
