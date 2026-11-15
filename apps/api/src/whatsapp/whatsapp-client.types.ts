export type WhatsappTipoMidia = 'imagem' | 'audio' | 'documento';

export type WhatsappMidiaBaixada = {
  buffer: Buffer;
  mimeType: string;
};

// Parâmetro do corpo de um template: texto puro para variável numerada ({{1}}), ou {nome, valor} para nomeada.
export type ParametroTemplate = string | { nome: string; valor: string };

export type WhatsappTemplate = {
  name: string;
  status: string;
  category: string;
  language: string;
  corpo: string | null;
  variaveis: string[];
  formato: 'POSITIONAL' | 'NAMED';
  cabecalho: string | null;
  rodape: string | null;
  botoes: string[];
  motivoNaoSuportado: string | null;
};

export type WhatsappInfoNumero = {
  display_phone_number: string;
  verified_name: string;
  quality_rating?: string;
  code_verification_status?: string;
};
