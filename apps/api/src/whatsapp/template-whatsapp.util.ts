import type { ParametroTemplate, WhatsappTemplate } from './whatsapp-client.types';

type BotaoBruto = { type?: string; text?: string; url?: string };
type ComponenteBruto = { type?: string; format?: string; text?: string; buttons?: BotaoBruto[] };

export type TemplateBruto = {
  name: string;
  status: string;
  category: string;
  language: string;
  parameter_format?: string;
  components?: ComponenteBruto[];
};

const VARIAVEL = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;
const BOTOES_ESPECIAIS = ['OTP', 'COPY_CODE', 'FLOW', 'CATALOG', 'MPM', 'SPM', 'ORDER_DETAILS'];

export function variaveisDoTexto(texto: string | null | undefined): string[] {
  const vistas = new Set<string>();
  for (const achado of (texto ?? '').matchAll(VARIAVEL)) vistas.add(achado[1]);
  return [...vistas];
}

function motivoNaoSuportado(componentes: ComponenteBruto[], corpo: string | null): string | null {
  if (!corpo) return 'template sem texto no corpo';
  for (const c of componentes) {
    const tipo = c.type?.toUpperCase();
    if (tipo === 'HEADER') {
      if (c.format && c.format.toUpperCase() !== 'TEXT') return 'cabeçalho com imagem, vídeo, documento ou localização';
      if (variaveisDoTexto(c.text).length > 0) return 'variável no cabeçalho';
    } else if (tipo === 'BUTTONS') {
      for (const b of c.buttons ?? []) {
        if (b.type && BOTOES_ESPECIAIS.includes(b.type.toUpperCase())) return 'botão especial (código, fluxo ou catálogo)';
        if (b.url && b.url.includes('{{')) return 'botão com link variável';
      }
    } else if (tipo !== 'BODY' && tipo !== 'FOOTER') {
      return 'tipo de template não suportado nesta tela';
    }
  }
  return null;
}

export function descreverTemplate(bruto: TemplateBruto): WhatsappTemplate {
  const componentes = bruto.components ?? [];
  const corpo = componentes.find((c) => c.type?.toUpperCase() === 'BODY')?.text ?? null;
  let variaveis = variaveisDoTexto(corpo);

  const formato =
    bruto.parameter_format === 'NAMED'
      ? 'NAMED'
      : bruto.parameter_format === 'POSITIONAL'
        ? 'POSITIONAL'
        : variaveis.some((v) => !/^\d+$/.test(v))
          ? 'NAMED'
          : 'POSITIONAL';
  if (formato === 'POSITIONAL') variaveis = [...variaveis].sort((a, b) => Number(a) - Number(b));

  return {
    name: bruto.name,
    status: bruto.status,
    category: bruto.category,
    language: bruto.language,
    corpo,
    variaveis,
    formato,
    cabecalho: componentes.find((c) => c.type?.toUpperCase() === 'HEADER' && c.format?.toUpperCase() === 'TEXT')?.text ?? null,
    rodape: componentes.find((c) => c.type?.toUpperCase() === 'FOOTER')?.text ?? null,
    botoes: componentes
      .filter((c) => c.type?.toUpperCase() === 'BUTTONS')
      .flatMap((c) => c.buttons ?? [])
      .map((b) => b.text?.trim())
      .filter((t): t is string => !!t),
    motivoNaoSuportado: motivoNaoSuportado(componentes, corpo),
  };
}

export function textoDoTemplateEnviado(template: WhatsappTemplate, parametros: ParametroTemplate[] | undefined): string {
  const valores = new Map<string, string>();
  (parametros ?? []).forEach((p, i) => {
    if (typeof p === 'string') {
      const variavel = template.variaveis[i];
      if (variavel !== undefined) valores.set(variavel, p);
    } else {
      valores.set(p.nome, p.valor);
    }
  });
  const preencher = (texto: string) =>
    texto.replace(VARIAVEL, (marca, variavel: string) => valores.get(variavel)?.trim() || marca);

  const partes = [
    template.cabecalho ? `*${preencher(template.cabecalho)}*` : null,
    template.corpo ? preencher(template.corpo) : null,
    template.rodape ? `_${template.rodape}_` : null,
    template.botoes.length > 0 ? template.botoes.map((b) => `[ ${b} ]`).join('  ') : null,
  ].filter((p): p is string => !!p);
  return partes.join('\n\n');
}
