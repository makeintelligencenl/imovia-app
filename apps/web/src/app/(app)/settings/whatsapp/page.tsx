'use client'
import { useEffect, useState } from 'react'
import { ConectarWhatsapp } from '@/components/settings/conectar-whatsapp'
import { Button } from '@/components/ui/button'
import {
  ConfiguracaoWhatsapp,
  buscarConfiguracaoWhatsapp,
  desconectarWhatsapp,
} from '@/lib/whatsapp-api'

export default function WhatsappSettingsPage() {
  const [config, setConfig] = useState<ConfiguracaoWhatsapp | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [desconectando, setDesconectando] = useState(false)

  useEffect(() => {
    buscarConfiguracaoWhatsapp()
      .then(setConfig)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Não foi possível carregar a conexão.'))
      .finally(() => setCarregando(false))
  }, [])

  async function desconectar() {
    if (!window.confirm('Desconectar o WhatsApp? A imobiliária deixa de enviar e receber mensagens até conectar de novo.')) return
    setDesconectando(true)
    setErro(null)
    try {
      await desconectarWhatsapp()
      setConfig(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível desconectar.')
    } finally {
      setDesconectando(false)
    }
  }

  if (carregando) return <p className="text-sm text-muted-foreground">Carregando…</p>

  return (
    <div className="max-w-2xl space-y-6">
      <section className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div>
          <h2 className="text-base font-semibold">Conexão com o WhatsApp Business</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Conecte o número da sua imobiliária pela Meta. As mensagens recebidas passam a aparecer no ImovIA.
          </p>
        </div>

        {config ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Número (ID)</dt>
            <dd className="font-mono">{config.phoneNumberId}</dd>
            <dt className="text-muted-foreground">Conta comercial (ID)</dt>
            <dd className="font-mono">{config.businessAccountId}</dd>
            <dt className="text-muted-foreground">Token</dt>
            <dd className="font-mono">{config.accessTokenMascarado}</dd>
          </dl>
        ) : (
          <p className="text-sm">Nenhum número conectado.</p>
        )}

        <ConectarWhatsapp jaConectado={!!config} onConectado={setConfig} />

        {config && (
          <div className="pt-2">
            <Button variant="outline" onClick={desconectar} disabled={desconectando}>
              {desconectando ? 'Desconectando…' : 'Desconectar'}
            </Button>
          </div>
        )}

        {erro && <p className="text-xs text-destructive">{erro}</p>}
      </section>
    </div>
  )
}
