'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChaveIa, ProvedorIa, listarChaves, salvarChave } from '@/lib/agente-api'

const ROTULOS: Record<ProvedorIa, { nome: string; uso: string }> = {
  openai: {
    nome: 'OpenAI (ChatGPT)',
    uso: 'Obrigatória para a base de conhecimento (embeddings). Também gera respostas se o agente usar ChatGPT.',
  },
  anthropic: {
    nome: 'Anthropic (Claude)',
    uso: 'Gera as respostas do agente se ele estiver configurado com Claude.',
  },
}

export default function IntegracoesIaPage() {
  const [chaves, setChaves] = useState<ChaveIa[]>([])
  const [carregando, setCarregando] = useState(true)
  const [edicao, setEdicao] = useState<Partial<Record<ProvedorIa, string>>>({})
  const [salvando, setSalvando] = useState<ProvedorIa | null>(null)
  const [aviso, setAviso] = useState<{ provedor: ProvedorIa; ok: boolean; texto: string } | null>(null)

  useEffect(() => {
    listarChaves()
      .then(setChaves)
      .catch((e) => setAviso({ provedor: 'openai', ok: false, texto: e instanceof Error ? e.message : 'Não foi possível carregar.' }))
      .finally(() => setCarregando(false))
  }, [])

  async function salvar(provedor: ProvedorIa) {
    const apiKey = (edicao[provedor] ?? '').trim()
    if (!apiKey) return
    setSalvando(provedor)
    setAviso(null)
    try {
      const salva = await salvarChave(provedor, apiKey)
      setChaves((atuais) => atuais.map((c) => (c.provedor === provedor ? salva : c)))
      setEdicao((e) => ({ ...e, [provedor]: '' }))
      setAviso({ provedor, ok: true, texto: 'Chave salva.' })
    } catch (e) {
      setAviso({ provedor, ok: false, texto: e instanceof Error ? e.message : 'Não foi possível salvar a chave.' })
    } finally {
      setSalvando(null)
    }
  }

  if (carregando) return <p className="text-sm text-muted-foreground">Carregando…</p>

  return (
    <div className="max-w-2xl space-y-6">
      <p className="text-sm text-muted-foreground">
        As chaves ficam criptografadas no servidor. Depois de salvar, só os últimos caracteres aparecem.
      </p>
      {chaves.map((c) => (
        <section key={c.provedor} className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div>
            <h2 className="text-base font-semibold">{ROTULOS[c.provedor].nome}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{ROTULOS[c.provedor].uso}</p>
          </div>
          <p className="text-sm">
            {c.configurada ? (
              <>Chave cadastrada: <span className="font-mono">{c.apiKeyMascarada ?? 'não foi possível ler'}</span></>
            ) : (
              'Nenhuma chave cadastrada.'
            )}
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              autoComplete="off"
              className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
              placeholder={c.configurada ? 'Nova chave (substitui a atual)' : 'Cole a chave aqui'}
              value={edicao[c.provedor] ?? ''}
              onChange={(e) => setEdicao((ed) => ({ ...ed, [c.provedor]: e.target.value }))}
            />
            <Button onClick={() => salvar(c.provedor)} disabled={salvando === c.provedor || !(edicao[c.provedor] ?? '').trim()}>
              {salvando === c.provedor ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
          {aviso?.provedor === c.provedor && (
            <p className={aviso.ok ? 'text-sm text-green-700' : 'text-sm text-destructive'}>{aviso.texto}</p>
          )}
        </section>
      ))}
    </div>
  )
}
