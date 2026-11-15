import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITMO = 'aes-256-gcm';
const TAMANHO_IV = 12;
const TAMANHO_CHAVE = 32;

export class DescriptografiaFalhouError extends Error {
  constructor() {
    super('Não foi possível descriptografar o valor (chave de criptografia diferente ou valor corrompido).');
    this.name = 'DescriptografiaFalhouError';
  }
}

export function criptografar(texto: string, chaveBase64: string): string {
  const chave = Buffer.from(chaveBase64, 'base64');
  const iv = randomBytes(TAMANHO_IV);
  const cipher = createCipheriv(ALGORITMO, chave, iv);
  const criptografado = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('base64'), authTag.toString('base64'), criptografado.toString('base64')].join(':');
}

export function descriptografar(valor: string, chaveBase64: string): string {
  const chave = Buffer.from(chaveBase64, 'base64');
  if (chave.length !== TAMANHO_CHAVE) {
    throw new Error(`A chave de criptografia deve ter ${TAMANHO_CHAVE} bytes (base64); recebidos ${chave.length}.`);
  }
  try {
    const [ivB64, authTagB64, criptografadoB64] = valor.split(':');
    const decipher = createDecipheriv(ALGORITMO, chave, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));
    const decriptografado = Buffer.concat([
      decipher.update(Buffer.from(criptografadoB64, 'base64')),
      decipher.final(),
    ]);
    return decriptografado.toString('utf8');
  } catch {
    throw new DescriptografiaFalhouError();
  }
}
