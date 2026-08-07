import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateCaracteristicaDto } from './dto/create-caracteristica.dto'

@Injectable()
export class CaracteristicasService {
  constructor(private prisma: PrismaService) {}

  findAll(tenantId: string) {
    return this.prisma.caracteristica.findMany({
      where: { tenantId, ativo: true },
      orderBy: { nome: 'asc' },
    })
  }

  create(tenantId: string, dto: CreateCaracteristicaDto) {
    return this.prisma.caracteristica.create({
      data: { nome: dto.nome, tenantId },
    })
  }

  async update(tenantId: string, id: string, dto: Partial<CreateCaracteristicaDto>) {
    await this.findOne(tenantId, id)
    return this.prisma.caracteristica.update({
      where: { id },
      data: dto,
    })
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id)
    await this.prisma.caracteristica.update({
      where: { id },
      data: { ativo: false },
    })
    return { ok: true }
  }

  async criarPadrao(tenantId: string) {
    const padrao = [
      '1 apartamento por andar', '1º Andar', '3º Andar', 'Academia', 'Aceita Pet',
      'Água individual', 'Aquecimento solar', 'Ar Condicionado', 'Área de serviço',
      'Armário Banheiro', 'Armário Cozinha', 'Armário Quarto', 'Banheiro social',
      'Box', 'Churrasqueira', 'Circuito de TV', 'Closet', 'Com laje', 'Cozinha',
      'Dependência de empregada', 'Elevador', 'Energia Solar', 'Estacionamento',
      'Garagem', 'Gás Canalizado', 'Hidromassagem', 'Interfone', 'Jardim',
      'Medição de água individualizada', 'Painel de TV', 'Piscina',
      'Piso em Porcelanato', 'Piso Laminado', 'Playground', 'Portão Eletrônico',
      'Posição: Frente', 'Posição: Fundos', 'Sacada', 'Sala de Jantar', 'Sala de TV',
      'Sauna', 'Sol da Manhã', 'Sol da Tarde', 'Spa com aquecedor solar',
      'Terraço', 'Varanda', 'Varanda Gourmet', 'Ventilador de Teto',
    ]
    await this.prisma.caracteristica.createMany({
      data: padrao.map((nome) => ({ nome, tenantId })),
      skipDuplicates: true,
    })
  }

  private async findOne(tenantId: string, id: string) {
    const item = await this.prisma.caracteristica.findFirst({ where: { id, tenantId } })
    if (!item) throw new NotFoundException('Característica não encontrada')
    return item
  }
}
