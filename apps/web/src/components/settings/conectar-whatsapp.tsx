'use client'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ConfiguracaoWhatsapp, conectarWhatsappPorEmbeddedSignup } from '@/lib/whatsapp-api'

const APP_ID = process.env.NEXT_PUBLIC_META_APP_ID
const CONFIG_ID = process.env.NEXT_PUBLIC_META_CONFIG_ID
const SDK_URL = 'https://connect.facebook.net/en_US/sdk.js'

type LoginResponse = { authResponse?: { code?: string } | null }

type FbSdk = {
  init: (opts: Record<string, unknown>) => void
  login: (cb: (resp: LoginResponse) => void, opts: Record<string, unknown>) => void
}

declare global {
  interface Window {
    FB?: FbSdk
    fbAsyncInit?: () => void
  }
}

function carregarSdk(): Promise<FbSdk> {
  return new Promise((resolve, reject) => {
    if (window.FB) return resolve(window.FB)
    window.fbAsyncInit = () => {
      window.FB!.init({ appId: APP_ID, autoLogAppEvents: true, xfbml: false, version: 'v26.0' })
      resolve(window.FB!)
    }
    const script = document.createElement('script')
    script.src = SDK_URL
    script.async = true
    script.onerror = () => reject(new Error('Não foi possível carregar o SDK do Facebook.'))
    document.body.appendChild(script)
  })
}

type Status = 'parado' | 'aguardando' | 'conectando' | 'concluido'

export function ConectarWhatsapp({
  onConectado,
  jaConectado = false,
}: {
  onConectado: (config: ConfiguracaoWhatsapp) => void
  jaConectado?: boolean
}) {
  const [status, setStatus] = useState<Status>('parado')
  const [erro, setErro] = useState<string | null>(null)
  const onConectadoRef = useRef(onConectado)
  onConectadoRef.current = onConectado

  // O código do login vale só ~30 s e é o que importa. O waba_id/phone_number_id do evento da
  // janela é complemento e pode chegar antes ou depois do código.
  const codigoRef = useRef<string | null>(null)
  const contaRef = useRef<{ businessAccountId: string; phoneNumberId?: string } | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function limparTimer() {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
  }

  function enviarCodigo() {
    const codigo = codigoRef.current
    if (!codigo) return
    const conta = contaRef.current
    limparTimer()
    codigoRef.current = null
    contaRef.current = null

    setStatus('conectando')
    conectarWhatsappPorEmbeddedSignup({ codigo, ...(conta ?? {}) })
      .then((config) => {
        setStatus('concluido')
        onConectadoRef.current(config)
      })
      .catch((e) => {
        setStatus('parado')
        setErro(e instanceof Error ? e.message : 'Não foi possível concluir a conexão.')
      })
  }

  function aoReceberCodigo(codigo: string) {
    codigoRef.current = codigo
    if (contaRef.current) {
      enviarCodigo()
      return
    }
    limparTimer()
    timerRef.current = setTimeout(enviarCodigo, 1500)
  }

  // A Meta só envia o código quando o cliente clica em "Concluir" na última tela. Fechar antes
  // gera só o evento de término, sem código.
  function aoReceberFimSemCodigo() {
    limparTimer()
    timerRef.current = setTimeout(() => {
      if (codigoRef.current) return
      contaRef.current = null
      setStatus('parado')
      setErro('A Meta não enviou o código de autorização. Na janela da Meta, clique em "Concluir" antes de fechá-la e tente de novo.')
    }, 15000)
  }

  const aoReceberFimSemCodigoRef = useRef(aoReceberFimSemCodigo)
  aoReceberFimSemCodigoRef.current = aoReceberFimSemCodigo
  const enviarCodigoRef = useRef(enviarCodigo)
  enviarCodigoRef.current = enviarCodigo

  useEffect(() => {
    function aoReceberMensagem(event: MessageEvent) {
      if (!event.origin.endsWith('facebook.com') || typeof event.data !== 'string') return
      let msg: { type?: string; event?: string; data?: Record<string, string> }
      try {
        msg = JSON.parse(event.data)
      } catch {
        return
      }
      if (msg.type !== 'WA_EMBEDDED_SIGNUP') return

      if (msg.event?.startsWith('FINISH') && msg.data?.waba_id) {
        contaRef.current = { businessAccountId: msg.data.waba_id, phoneNumberId: msg.data.phone_number_id }
        if (codigoRef.current) enviarCodigoRef.current()
        else aoReceberFimSemCodigoRef.current()
      } else if (msg.event === 'CANCEL') {
        limparTimer()
        setStatus('parado')
        setErro('Conexão cancelada antes de terminar.')
      } else if (msg.event === 'ERROR') {
        limparTimer()
        setStatus('parado')
        setErro(msg.data?.error_message ?? 'A Meta retornou um erro durante a conexão.')
      }
    }
    window.addEventListener('message', aoReceberMensagem)
    return () => {
      window.removeEventListener('message', aoReceberMensagem)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  if (!APP_ID || !CONFIG_ID) {
    return (
      <p className="text-xs text-muted-foreground">
        A conexão do WhatsApp ainda não está habilitada neste ambiente (faltam NEXT_PUBLIC_META_APP_ID e
        NEXT_PUBLIC_META_CONFIG_ID).
      </p>
    )
  }

  async function iniciar() {
    setErro(null)
    codigoRef.current = null
    contaRef.current = null
    setStatus('aguardando')
    try {
      const fb = await carregarSdk()
      fb.login(
        (resposta) => {
          const codigo = resposta.authResponse?.code
          if (!codigo) {
            limparTimer()
            setStatus('parado')
            setErro('A Meta não devolveu o código de autorização. Na janela da Meta, clique em "Concluir" antes de fechá-la e tente de novo.')
            return
          }
          aoReceberCodigo(codigo)
        },
        {
          config_id: CONFIG_ID,
          response_type: 'code',
          override_default_response_type: true,
          extras: { version: 'v5' },
        },
      )
    } catch (e) {
      setStatus('parado')
      setErro(e instanceof Error ? e.message : 'Não foi possível iniciar a conexão.')
    }
  }

  const ocupado = status === 'aguardando' || status === 'conectando'

  return (
    <div className="space-y-2">
      <Button type="button" onClick={iniciar} disabled={ocupado}>
        {status === 'aguardando'
          ? 'Aguardando a Meta…'
          : status === 'conectando'
            ? 'Concluindo a conexão…'
            : jaConectado
              ? 'Reconectar com o WhatsApp Business'
              : 'Conectar com o WhatsApp Business'}
      </Button>
      {jaConectado && status !== 'concluido' && (
        <p className="text-xs text-green-700">Já existe um número conectado. Reconecte só para trocar de número.</p>
      )}
      {status === 'concluido' && <p className="text-xs text-green-700">Número conectado com sucesso.</p>}
      {erro && <p className="text-xs text-destructive">{erro}</p>}
    </div>
  )
}
