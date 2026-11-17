'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  assumir,
  Contagens,
  contagens,
  ContatoCliente,
  contatoDaConversa,
  Conversa,
  criarClienteDaConversa,
  dentroDaJanela,
  enviarArquivo,
  enviarTexto,
  iniciarComTemplate,
  listarConversas,
  listarMensagens,
  listarTemplates,
  Mensagem,
  resolver,
  TemplateWhatsapp,
} from '@/lib/conversas-api'

// Atualização por polling, como no CRM: lista e conversa aberta a cada 5 segundos.
const INTERVALO_MS = 5000

export default function ConversasPage() {
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [contato, setContato] = useState<ContatoCliente>(null)
  const [contadores, setContadores] = useState<Contagens>({ naoLidas: 0, esperando: 0 })
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [mostrarTemplate, setMostrarTemplate] = useState(false)
  const fimRef = useRef<HTMLDivElement>(null)

  const selecionada = conversas.find((c) => c.id === selecionadaId) ?? null

  const carregarLista = useCallback(async () => {
    try {
      const [lista, cont] = await Promise.all([listarConversas(), contagens()])
      setConversas(lista)
      setContadores(cont)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar as conversas.')
    }
  }, [])

  const carregarMensagens = useCallback(async (id: string) => {
    try {
      setMensagens(await listarMensagens(id))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar as mensagens.')
    }
  }, [])

  // Lista e contadores: polling.
  useEffect(() => {
    carregarLista()
    const t = setInterval(carregarLista, INTERVALO_MS)
    return () => clearInterval(t)
  }, [carregarLista])

  // Conversa aberta: mensagens e cartão do contato, com polling das mensagens.
  useEffect(() => {
    if (!selecionadaId) return
    setContato(null)
    carregarMensagens(selecionadaId)
    contatoDaConversa(selecionadaId).then(setContato).catch(() => setContato(null))
    const t = setInterval(() => carregarMensagens(selecionadaId), INTERVALO_MS)
    return () => clearInterval(t)
  }, [selecionadaId, carregarMensagens])

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens.length])

  const podeTextoLivre = selecionada ? dentroDaJanela(selecionada.ultimaMensagemClienteEm) : false

  async function enviar() {
    if (!selecionada || !texto.trim()) return
    setEnviando(true)
    setErro(null)
    try {
      await enviarTexto(selecionada.id, texto)
      setTexto('')
      await Promise.all([carregarMensagens(selecionada.id), carregarLista()])
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível enviar.')
    } finally {
      setEnviando(false)
    }
  }

  async function anexar(arquivo: File | undefined) {
    if (!selecionada || !arquivo) return
    setEnviando(true)
    setErro(null)
    try {
      await enviarArquivo(selecionada.id, arquivo, texto.trim() || undefined)
      setTexto('')
      await Promise.all([carregarMensagens(selecionada.id), carregarLista()])
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível enviar o arquivo.')
    } finally {
      setEnviando(false)
    }
  }

  async function acaoConversa(acao: () => Promise<unknown>) {
    setErro(null)
    try {
      await acao()
      await carregarLista()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível concluir a ação.')
    }
  }

  async function criarCliente() {
    if (!selecionada) return
    const nome = window.prompt('Nome do cliente:')?.trim()
    if (!nome) return
    try {
      setContato(await criarClienteDaConversa(selecionada.id, nome))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível criar o cliente.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Conversas</h1>
          <p className="text-sm text-muted-foreground">
            {contadores.naoLidas} não lida(s) · {contadores.esperando} aguardando atendente
          </p>
        </div>
        <button
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white"
          onClick={() => setMostrarTemplate(true)}
        >
          Nova conversa (template)
        </button>
      </div>

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        {/* Lista */}
        <aside className="max-h-[70vh] space-y-2 overflow-y-auto rounded-xl border border-border bg-card p-2">
          {conversas.length === 0 && <p className="p-3 text-sm text-muted-foreground">Nenhuma conversa ainda.</p>}
          {conversas.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelecionadaId(c.id)}
              className={`flex w-full items-start justify-between gap-2 rounded-lg p-3 text-left text-sm ${
                c.id === selecionadaId ? 'bg-blue-50' : 'hover:bg-slate-50'
              }`}
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{c.nomeContato ?? c.telefone}</p>
                <p className="text-xs text-muted-foreground">
                  {c.resolvido ? 'Resolvida' : c.esperandoDesde ? 'Aguardando atendente' : c.humanTalk ? 'Com atendente' : 'Com o agente'}
                </p>
              </div>
              {c.unreadCount > 0 && (
                <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">{c.unreadCount}</span>
              )}
            </button>
          ))}
        </aside>

        {/* Conversa */}
        <section className="flex min-h-[60vh] flex-col rounded-xl border border-border bg-card">
          {!selecionada ? (
            <p className="m-auto p-6 text-sm text-muted-foreground">Selecione uma conversa.</p>
          ) : (
            <>
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3">
                <div>
                  <p className="font-medium">{contato?.nome ?? selecionada.nomeContato ?? selecionada.telefone}</p>
                  <p className="text-xs text-muted-foreground">{selecionada.telefone}</p>
                  {contato ? (
                    <p className="text-xs text-muted-foreground">
                      Cliente cadastrado {contato.email ? `· ${contato.email}` : ''}
                    </p>
                  ) : (
                    <button className="text-xs text-blue-600 underline" onClick={criarCliente}>
                      Criar cliente com este contato
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button className="rounded-md border px-2 py-1 text-xs" onClick={() => acaoConversa(() => assumir(selecionada.id))}>
                    Assumir
                  </button>
                  <button className="rounded-md border px-2 py-1 text-xs" onClick={() => acaoConversa(() => resolver(selecionada.id))}>
                    Resolver
                  </button>
                </div>
              </header>

              <div className="flex-1 space-y-2 overflow-y-auto p-3">
                {mensagens.map((m) => (
                  <Bolha key={m.id} m={m} />
                ))}
                <div ref={fimRef} />
              </div>

              <footer className="space-y-2 border-t border-border p-3">
                {!podeTextoLivre && (
                  <p className="text-xs text-amber-700">
                    A janela de 24 horas expirou. Use um template para retomar a conversa.
                  </p>
                )}
                <div className="flex gap-2">
                  <input
                    type="file"
                    disabled={!podeTextoLivre || enviando}
                    onChange={(e) => anexar(e.target.files?.[0])}
                    className="max-w-[160px] text-xs"
                  />
                  <textarea
                    className="min-h-10 flex-1 rounded-md border border-input bg-background p-2 text-sm"
                    placeholder={podeTextoLivre ? 'Digite sua mensagem' : 'Texto livre indisponível'}
                    value={texto}
                    disabled={!podeTextoLivre || enviando}
                    onChange={(e) => setTexto(e.target.value)}
                  />
                  <button
                    className="rounded-md bg-blue-600 px-3 text-sm font-medium text-white disabled:opacity-50"
                    disabled={!podeTextoLivre || enviando || !texto.trim()}
                    onClick={enviar}
                  >
                    Enviar
                  </button>
                </div>
              </footer>
            </>
          )}
        </section>
      </div>

      {mostrarTemplate && (
        <NovaConversaTemplate
          onFechar={() => setMostrarTemplate(false)}
          onIniciada={async (conversaId) => {
            setMostrarTemplate(false)
            await carregarLista()
            setSelecionadaId(conversaId)
          }}
        />
      )}
    </div>
  )
}

function Bolha({ m }: { m: Mensagem }) {
  const saida = m.direcao === 'SAIDA'
  return (
    <div className={`flex ${saida ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] space-y-1 rounded-lg px-3 py-2 text-sm ${saida ? 'bg-blue-50' : 'bg-slate-100'}`}>
        {m.midiaUrl && m.tipo === 'imagem' && <img src={m.midiaUrl} alt="" className="max-h-64 rounded" />}
        {m.midiaUrl && m.tipo === 'audio' && <audio controls src={m.midiaUrl} className="max-w-full" />}
        {m.midiaUrl && m.tipo === 'video' && <video controls src={m.midiaUrl} className="max-h-64 rounded" />}
        {m.midiaUrl && m.tipo === 'documento' && (
          <a href={m.midiaUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">
            Abrir documento
          </a>
        )}
        {m.texto && <p className="whitespace-pre-wrap">{m.texto}</p>}
        {m.transcricao && <p className="text-xs italic text-muted-foreground">Transcrição: {m.transcricao}</p>}
        <p className="text-right text-[10px] text-muted-foreground">
          {new Date(m.criadaEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          {saida && m.status ? ` · ${statusLegivel(m.status)}` : ''}
        </p>
      </div>
    </div>
  )
}

function statusLegivel(status: string): string {
  return { ENVIADA: 'enviada', ENTREGUE: 'entregue', LIDA: 'lida', FALHOU: 'falhou' }[status] ?? status
}

function NovaConversaTemplate({
  onFechar,
  onIniciada,
}: {
  onFechar: () => void
  onIniciada: (conversaId: string) => void | Promise<void>
}) {
  const [templates, setTemplates] = useState<TemplateWhatsapp[]>([])
  const [telefone, setTelefone] = useState('')
  const [nomeTemplate, setNomeTemplate] = useState('')
  const [parametros, setParametros] = useState<string[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    listarTemplates()
      .then((lista) => setTemplates(lista.filter((t) => t.status === 'APPROVED')))
      .catch((e) => setErro(e instanceof Error ? e.message : 'Não foi possível carregar os templates.'))
  }, [])

  const template = templates.find((t) => t.name === nomeTemplate) ?? null

  async function iniciar() {
    if (!template) return
    setEnviando(true)
    setErro(null)
    try {
      const r = await iniciarComTemplate({
        telefone,
        template: template.name,
        idioma: template.language,
        parametros: parametros.length ? parametros : undefined,
      })
      await onIniciada(r.conversaId)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível iniciar a conversa.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md space-y-3 rounded-xl bg-white p-5">
        <h2 className="text-lg font-semibold">Nova conversa com template</h2>
        <input
          className="h-9 w-full rounded-md border px-3 text-sm"
          placeholder="Telefone com DDI e DDD (ex.: 5531999998888)"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
        />
        <select
          className="h-9 w-full rounded-md border px-2 text-sm"
          value={nomeTemplate}
          onChange={(e) => {
            setNomeTemplate(e.target.value)
            const t = templates.find((x) => x.name === e.target.value)
            setParametros(Array(t?.variaveis.length ?? 0).fill(''))
          }}
        >
          <option value="">Escolha um template aprovado</option>
          {templates.map((t) => (
            <option key={`${t.name}-${t.language}`} value={t.name}>
              {t.name} ({t.language})
            </option>
          ))}
        </select>
        {template?.corpo && <p className="rounded bg-slate-50 p-2 text-xs text-muted-foreground">{template.corpo}</p>}
        {parametros.map((valor, i) => (
          <input
            key={i}
            className="h-9 w-full rounded-md border px-3 text-sm"
            placeholder={`Variável ${template?.variaveis[i] ?? i + 1}`}
            value={valor}
            onChange={(e) => setParametros((atuais) => atuais.map((v, j) => (j === i ? e.target.value : v)))}
          />
        ))}
        {erro && <p className="text-sm text-destructive">{erro}</p>}
        <div className="flex justify-end gap-2">
          <button className="rounded-md border px-3 py-2 text-sm" onClick={onFechar}>
            Cancelar
          </button>
          <button
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            disabled={!template || !telefone.trim() || enviando || parametros.some((p) => !p.trim())}
            onClick={iniciar}
          >
            {enviando ? 'Enviando…' : 'Enviar template'}
          </button>
        </div>
      </div>
    </div>
  )
}
