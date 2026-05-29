import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | string) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatArea(m2: number | string) {
  return `${Number(m2).toLocaleString('pt-BR')} m²`
}

/**
 * Gera link wa.me para abrir WhatsApp com numero e mensagem pre-preenchida.
 * Normaliza o numero: remove nao-digitos e adiciona DDI 55 (Brasil) se necessario.
 */
export function formatWhatsappLink(phone: string, message?: string): string {
  let digits = phone.replace(/\D/g, '')
  if (!digits.startsWith('55')) digits = '55' + digits
  const base = `https://wa.me/${digits}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}
