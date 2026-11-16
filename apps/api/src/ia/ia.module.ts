import { Module } from '@nestjs/common'
import { BaseConhecimentoController } from '../base-conhecimento/base-conhecimento.controller'
import { BaseConhecimentoService } from '../base-conhecimento/base-conhecimento.service'
import { EmbeddingsOpenAiService } from '../base-conhecimento/embeddings-openai.service'
import { ChavesIaController } from '../agente/chaves-ia.controller'
import { ChavesIaService } from '../agente/chaves-ia.service'
import { AnthropicClientService } from '../agente/llm/anthropic-client.service'
import { OpenAiClientService } from '../agente/llm/openai-client.service'
import { PrismaModule } from '../prisma/prisma.module'

// Serviços de IA sem dependência de atendimento: chaves, clientes de LLM e base de conhecimento.
@Module({
  imports: [PrismaModule],
  controllers: [ChavesIaController, BaseConhecimentoController],
  providers: [ChavesIaService, AnthropicClientService, OpenAiClientService, EmbeddingsOpenAiService, BaseConhecimentoService],
  exports: [ChavesIaService, AnthropicClientService, OpenAiClientService, EmbeddingsOpenAiService, BaseConhecimentoService],
})
export class IaModule {}
