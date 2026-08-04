'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Send, UserCheck, Bot, MapPin, Ruler, ExternalLink, LinkIcon, UserRound, Unlink, CheckCircle, MoreVertical, Pencil, Trash2, Users, Search } from 'lucide-react'
import { api } from '@/lib/api'
import { getCurrentUser } from '@/lib/auth'
import { MobileBlock } from '@/components/layout/mobile-block'

// ── Tipos GPT Maker ───────────────────────────────────────────────────────────

interface GptChat {
  id:               string
  name:             string
  recipient:        string
  humanTalk:        boolean
  read:             boolean
  unReadCount:      number
  agentName:        string
  finished:         boolean
  whatsappPhone:    string | null
  conversationType: string
  createdAt:        string
  time:             string
}

interface GptMessage {
  id:          string
  text:        string
  role:        'user' | 'assistant' | 'human' | 'system'
  type:        string
  time:        string
  imageUrl?:   string
  audioUrl?:   string
  documentUrl?: string
  userName?:   string
}

interface MatchInfo {
  cliente: { id: string; nome: string; email: string; whatsapp: string | null; corretor: { id: string; name: string } | null }
  perfil:  { id: string; finalidade: string; precoMin: number | null; precoMax: number | null; cidades: string[]; bairros: string[] } | null
  match:   { id: string; leadScore: number; etapa: string; updatedAt: string; imovel: { id: string; titulo: string; preco: number; areaM2: number | null; quartos: number | null; vagas: number | null; cidade: { nome: string } } } | null
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtPreco(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function initials(name: string | null | undefined) {
  if (!name) return '?'
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
}

const AVATAR_COLORS = ['#7c3aed','#059669','#dc2626','#d97706','#0891b2','#be185d','#1d4ed8','#065f46']
function avatarColor(id: string | null | undefined) {
  if (!id) return AVATAR_COLORS[0]
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

function getChatName(chat: GptChat, clientNames: Record<string, string>): string {
  // Busca exata pelo chatId, depois por includes (sufixo)
  if (clientNames[chat.id]) return clientNames[chat.id]
  const found = Object.entries(clientNames).find(([k]) => chat.id.includes(k) || k.includes(chat.id))
  return found ? found[1] : (chat.name || chat.whatsappPhone || '')
}

const ETAPA_LABELS: Record<string, string> = {
  NOVO: 'Novo', CONTATO: 'Contato', VISITA: 'Visita agendada',
  PROPOSTA: 'Proposta', NEGOCIACAO: 'Em negociação', FECHADO: 'Fechado', PERDIDO: 'Perdido',
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function ChatsPage() {
  const router  = useRouter()
  const [allowed, setAllowed] = useState(false)

  // lista
  const [activeChats,  setActiveChats]  = useState<GptChat[]>([])   // chats não-finalizados
  const [finishedList, setFinishedList] = useState<GptChat[]>([])   // chats finalizados
  const [loadingList,  setLoadingList]  = useState(true)
  const [search,       setSearch]       = useState('')
  const [filterMode,   setFilterMode]   = useState<'all' | 'active' | 'finished'>('all')

  // conversa ativa
  const [activeChat,   setActiveChat]   = useState<GptChat | null>(null)
  const [messages,     setMessages]     = useState<GptMessage[]>([])
  const [loadingMsgs,  setLoadingMsgs]  = useState(false)
  const [text,         setText]         = useState('')
  const [sending,      setSending]      = useState(false)
  const [toggling,     setToggling]     = useState(false)
  const [resolving,    setResolving]    = useState(false)

  // match info
  const [matchInfo,    setMatchInfo]    = useState<MatchInfo | null | 'loading'>('loading')

  // mapa chatId → nome do cliente cadastrado
  const [clientNames,  setClientNames]  = useState<Record<string, string>>({})

  // lista de corretores do tenant
  const [corretores,   setCorretores]   = useState<{ id: string; name: string }[]>([])
  const [assigningId,  setAssigningId]  = useState<string | null>(null)

  // largura do painel de match (redimensionável)
  const [panelWidth,   setPanelWidth]   = useState(224)
  const dragging = useRef(false)

  function onDragStart(e: React.MouseEvent) {
    e.preventDefault()
    dragging.current = true
    const startX = e.clientX
    const startW = panelWidth
    function onMove(ev: MouseEvent) {
      if (!dragging.current) return
      const delta = startX - ev.clientX
      setPanelWidth(Math.min(480, Math.max(160, startW + delta)))
    }
    function onUp() {
      dragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const u = getCurrentUser()
    if (!u || u.role !== 'ADMIN') { router.replace('/dashboard'); return }
    setAllowed(true)
  }, [router])

  const fetchChats = useCallback(async (mode?: 'all' | 'human' | 'ai' | 'finished') => {
    if (!allowed) return
    setLoadingList(true)
    try {
      if (mode === 'finished') {
        // busca só finalizados
        const data = await api.get<{ chats?: GptChat[] } | GptChat[]>('/chats?pageSize=50&finished=true')
        const list = Array.isArray(data) ? data : (data as { chats?: GptChat[] }).chats ?? []
        setFinishedList(list)
      } else {
        // busca ativos e finalizados em paralelo
        const [dataActive, dataFinished, names, users] = await Promise.all([
          api.get<{ chats?: GptChat[] } | GptChat[]>('/chats?pageSize=50'),
          api.get<{ chats?: GptChat[] } | GptChat[]>('/chats?pageSize=50&finished=true').catch(() => []),
          api.get<Record<string, string>>('/chats/client-names').catch(() => ({})),
          api.get<{ id: string; name: string }[]>('/users').catch(() => []),
        ])
        const active   = Array.isArray(dataActive)   ? dataActive   : (dataActive   as { chats?: GptChat[] }).chats ?? []
        const finished = Array.isArray(dataFinished)  ? dataFinished : (dataFinished as { chats?: GptChat[] }).chats ?? []
        setActiveChats(active)
        setFinishedList(finished)
        setClientNames(names)
        setCorretores(Array.isArray(users) ? users : [])
      }
    } catch {
      toast.error('Não foi possível carregar os chats.')
    } finally {
      setLoadingList(false)
    }
  }, [allowed])

  useEffect(() => { fetchChats() }, [fetchChats])

  // SSE — recebe eventos de nova mensagem em tempo real
  useEffect(() => {
    if (!allowed) return
    const user = getCurrentUser()
    if (!user?.tenantId) return

    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/chats/events/${user.tenantId}`
    const es = new EventSource(url, { withCredentials: true })

    es.addEventListener('new-message', (e) => {
      const data = JSON.parse(e.data) as { chatId: string; role: string; message: string }
      // Atualiza lista de chats ao receber qualquer nova mensagem
      fetchChats()
      // Se o chat ativo é o que recebeu mensagem, atualiza as mensagens também
      setActiveChat((current) => {
        if (current && (current.id === data.chatId || current.id.includes(data.chatId) || data.chatId.includes(current.id))) {
          api.get<{ messages?: GptMessage[] } | GptMessage[]>(`/chats/${current.id}/messages?pageSize=50`)
            .then((res) => {
              const msgs = Array.isArray(res) ? res : (res as { messages?: GptMessage[] }).messages ?? []
              setMessages(msgs)
            })
            .catch(() => {})
        }
        return current
      })
    })

    es.onerror = () => {
      // Reconexão automática pelo browser — sem ação necessária
    }

    return () => es.close()
  }, [allowed, fetchChats])

  // Scroll automático ao receber novas mensagens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function selectChat(chat: GptChat) {
    setActiveChat(chat)
    setMessages([])
    setMatchInfo('loading')
    setLoadingMsgs(true)
    try {
      const data = await api.get<{ messages?: GptMessage[] } | GptMessage[]>(`/chats/${chat.id}/messages?pageSize=50`)
      const list = Array.isArray(data) ? data : (data as { messages?: GptMessage[] }).messages ?? []
      setMessages(list)
    } catch {
      toast.error('Erro ao carregar mensagens.')
    } finally {
      setLoadingMsgs(false)
    }

    // Busca match associado pelo chatId (sempre) com phone como fallback
    try {
      const phone = chat.whatsappPhone ? encodeURIComponent(chat.whatsappPhone) : ''
      const info = await api.get<MatchInfo | null>(`/chats/${chat.id}/match-info?phone=${phone}`)
      setMatchInfo(info)
    } catch {
      setMatchInfo(null)
    }
  }

  async function handleSend() {
    if (!activeChat || !text.trim() || sending) return
    const msg = text.trim()
    setText('')
    setSending(true)
    try {
      await api.post(`/chats/${activeChat.id}/messages`, { message: msg })
      // Recarrega mensagens após envio
      const data = await api.get<{ messages?: GptMessage[] } | GptMessage[]>(`/chats/${activeChat.id}/messages?pageSize=50`)
      const list = Array.isArray(data) ? data : (data as { messages?: GptMessage[] }).messages ?? []
      setMessages(list)
    } catch {
      toast.error('Erro ao enviar mensagem.')
      setText(msg)
    } finally {
      setSending(false)
    }
  }

  async function handleIniciarAtendimento() {
    if (!activeChat || toggling) return
    setToggling(true)
    try {
      await api.post(`/chats/${activeChat.id}/assume`, {})
      const reactivated = { ...activeChat, finished: false, humanTalk: true }
      setActiveChat(reactivated)
      setFinishedList((prev) => prev.filter((c) => c.id !== activeChat.id))
      setActiveChats((prev) => [reactivated, ...prev.filter((c) => c.id !== activeChat.id)])
      toast.success('Atendimento iniciado.')
      fetchChats()
    } catch {
      toast.error('Não foi possível iniciar o atendimento.')
    } finally {
      setToggling(false)
    }
  }

  async function handleToggleHuman() {
    if (!activeChat || toggling) return
    setToggling(true)
    try {
      if (activeChat.humanTalk) {
        await api.post(`/chats/${activeChat.id}/end`, {})
        // atualiza apenas localmente — fetchChats marcaria o chat como finished
        setActiveChat({ ...activeChat, humanTalk: false })
        setActiveChats((prev) => prev.map((c) => c.id === activeChat.id ? { ...c, humanTalk: false } : c))
        toast.success('Atendimento devolvido à IA.')
      } else {
        await api.post(`/chats/${activeChat.id}/assume`, {})
        setActiveChat({ ...activeChat, humanTalk: true })
        setActiveChats((prev) => prev.map((c) => c.id === activeChat.id ? { ...c, humanTalk: true } : c))
        toast.success('Você assumiu o atendimento.')
        fetchChats()
      }
    } catch {
      toast.error('Não foi possível alterar o modo de atendimento.')
    } finally {
      setToggling(false)
    }
  }

  async function handleAssignCorretor(corretorId: string) {
    if (!matchInfo || matchInfo === 'loading' || !matchInfo.cliente) return
    setAssigningId(corretorId)
    try {
      await api.patch(`/clientes/${matchInfo.cliente.id}`, { corretorId: corretorId || null })
      const corretor = corretores.find((c) => c.id === corretorId) ?? null
      setMatchInfo({ ...matchInfo, cliente: { ...matchInfo.cliente, corretor: corretor ? { id: corretor.id, name: corretor.name } : null } })
      toast.success(corretor ? `Corretor ${corretor.name} atribuído.` : 'Corretor removido.')
    } catch {
      toast.error('Não foi possível atribuir o corretor.')
    } finally {
      setAssigningId(null)
    }
  }

  async function handleResolve() {
    if (!activeChat || resolving) return
    setResolving(true)
    try {
      await api.post(`/chats/${activeChat.id}/resolve`, {})
      const resolved = { ...activeChat, finished: true, humanTalk: false }
      setActiveChat(resolved)
      setActiveChats((prev) => prev.filter((c) => c.id !== activeChat.id))
      setFinishedList((prev) => [resolved, ...prev])
      toast.success('Chat marcado como resolvido.')
      fetchChats()
    } catch {
      toast.error('Não foi possível marcar como resolvido.')
    } finally {
      setResolving(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // Filtros
  const applySearch = (c: GptChat) => {
    if (!search) return true
    const q = search.toLowerCase()
    return getChatName(c, clientNames).toLowerCase().includes(q) || (c.whatsappPhone ?? '').includes(q)
  }
  // Todos os chats de ambas as listas, sem duplicatas
  const allChatsMap = new Map<string, GptChat>()
  for (const c of [...activeChats, ...finishedList]) allChatsMap.set(c.id, c)
  const allChats = Array.from(allChatsMap.values())

  const activeOnly   = allChats.filter((c) => !c.finished)
  const finishedOnly = allChats.filter((c) =>  c.finished)

  const showActive   = filterMode === 'all' || filterMode === 'active'
  const showFinished = filterMode === 'all' || filterMode === 'finished'

  const humanActive    = showActive   ? activeOnly.filter((c)   =>  c.humanTalk && applySearch(c)) : []
  const aiActive       = showActive   ? activeOnly.filter((c)   => !c.humanTalk && applySearch(c)) : []
  const humanFinished  = showFinished ? finishedOnly.filter((c) =>  c.humanTalk && applySearch(c)) : []
  const aiFinished     = showFinished ? finishedOnly.filter((c) => !c.humanTalk && applySearch(c)) : []

  const isEmpty = humanActive.length === 0 && aiActive.length === 0 && humanFinished.length === 0 && aiFinished.length === 0

  if (!allowed) return null

  return (
    <MobileBlock>
    <div className="flex h-[calc(100vh-4rem)] -m-6 overflow-hidden">

      {/* ── Lista de chats ── */}
      <div className="w-64 flex flex-col shrink-0 border-r border-border bg-card">
        <div className="p-3 border-b border-border space-y-2">
          <h1 className="text-sm font-semibold">Chats</h1>
          <input
            type="text"
            placeholder="Buscar…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs bg-secondary/60 border border-border rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-0.5">
            {([['all','Todos'],['active','Em atendimento'],['finished','Finalizados']] as const).map(([m, label]) => (
              <button
                key={m}
                onClick={() => setFilterMode(m)}
                className={`text-[11px] px-2 py-1 rounded-md transition-colors whitespace-nowrap ${filterMode === m ? 'bg-blue-500/15 text-blue-400 font-medium' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <p className="text-xs text-muted-foreground text-center py-8">Carregando…</p>
          ) : isEmpty ? (
            <p className="text-xs text-muted-foreground text-center py-8">Nenhum chat encontrado.</p>
          ) : (
            <>
              {/* Em andamento */}
              {showActive && (humanActive.length > 0 || aiActive.length > 0) && (
                <>
                  {humanActive.length > 0 && (
                    <>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 pt-3 pb-1">Humano</p>
                      {humanActive.map((c) => <ChatItem key={c.id} chat={c} active={activeChat?.id === c.id} onClick={() => selectChat(c)} clientNames={clientNames} />)}
                    </>
                  )}
                  {aiActive.length > 0 && (
                    <>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 pt-3 pb-1">Agente IA</p>
                      {aiActive.map((c) => <ChatItem key={c.id} chat={c} active={activeChat?.id === c.id} onClick={() => selectChat(c)} clientNames={clientNames} />)}
                    </>
                  )}
                </>
              )}
              {/* Finalizados */}
              {showFinished && (humanFinished.length > 0 || aiFinished.length > 0) && (
                <>
                  {filterMode === 'all' && (
                    <div className="mx-3 mt-3 mb-1 border-t border-border" />
                  )}
                  {humanFinished.length > 0 && (
                    <>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 pt-2 pb-1">Humano · Finalizado</p>
                      {humanFinished.map((c) => <ChatItem key={c.id} chat={c} active={activeChat?.id === c.id} onClick={() => selectChat(c)} clientNames={clientNames} />)}
                    </>
                  )}
                  {aiFinished.length > 0 && (
                    <>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 pt-2 pb-1">Agente IA · Finalizado</p>
                      {aiFinished.map((c) => <ChatItem key={c.id} chat={c} active={activeChat?.id === c.id} onClick={() => selectChat(c)} clientNames={clientNames} />)}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Conversa ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {!activeChat ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Selecione um chat para visualizar a conversa.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                  style={{ background: avatarColor(activeChat.id) }}
                >
                  {initials(getChatName(activeChat, clientNames) || activeChat.whatsappPhone)}
                </div>
                <div>
                  <p className="text-sm font-semibold leading-tight">{getChatName(activeChat, clientNames) || 'Visitante'}</p>
                  <p className="text-xs text-muted-foreground">{activeChat.whatsappPhone} · {activeChat.agentName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {activeChat.finished ? (
                  <button
                    onClick={handleIniciarAtendimento}
                    disabled={toggling}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors disabled:opacity-50 bg-violet-500/10 text-violet-400 border-violet-500/25 hover:bg-violet-500/20"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    {toggling ? '…' : 'Iniciar atendimento'}
                  </button>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${activeChat.humanTalk ? 'bg-amber-400' : 'bg-green-400'}`} />
                      <span className="text-xs text-muted-foreground">{activeChat.humanTalk ? 'Humano ativo' : 'IA respondendo'}</span>
                    </div>
                    {!activeChat.humanTalk && (
                      <button
                        onClick={handleToggleHuman}
                        disabled={toggling}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors disabled:opacity-50 bg-amber-500/10 text-amber-400 border-amber-500/25 hover:bg-amber-500/20"
                      >
                        <UserCheck className="h-3.5 w-3.5" />{toggling ? '…' : 'Assumir atendimento'}
                      </button>
                    )}
                    <button
                      onClick={handleResolve}
                      disabled={resolving}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors disabled:opacity-50 bg-green-500/10 text-green-500 border-green-500/25 hover:bg-green-500/20"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      {resolving ? '…' : 'Marcar como resolvido'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {loadingMsgs ? (
                <p className="text-xs text-muted-foreground text-center py-10">Carregando mensagens…</p>
              ) : messages.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-10">Nenhuma mensagem ainda.</p>
              ) : (
                messages.map((m) => (
                  <MessageBubble
                    key={m.id}
                    msg={m}
                    onEdit={async (newText) => {
                      try {
                        await api.put(`/chats/${activeChat.id}/messages/${m.id}`, { message: newText })
                        setMessages((prev) => prev.map((x) => x.id === m.id ? { ...x, text: newText } : x))
                      } catch { toast.error('Erro ao editar mensagem.') }
                    }}
                    onDelete={async () => {
                      try {
                        await api.delete(`/chats/${activeChat.id}/messages/${m.id}`)
                        setMessages((prev) => prev.filter((x) => x.id !== m.id))
                      } catch { toast.error('Erro ao excluir mensagem.') }
                    }}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex items-end gap-2 px-4 py-3 border-t border-border bg-card shrink-0">
              <textarea
                rows={1}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escreva uma mensagem… (Enter para enviar)"
                className="flex-1 resize-none text-sm bg-secondary/60 border border-border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 min-h-[40px] max-h-32"
              />
              <button
                onClick={handleSend}
                disabled={sending || !text.trim()}
                className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 transition-colors shrink-0"
                aria-label="Enviar mensagem"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Painel info / match ── */}
      {/* Alça de drag */}
      <div
        onMouseDown={onDragStart}
        className="w-1 shrink-0 cursor-col-resize hover:bg-blue-500/40 transition-colors bg-border"
        title="Arraste para redimensionar"
      />
      <div className="shrink-0 border-border bg-card overflow-y-auto" style={{ width: panelWidth }}>
        {activeChat ? (
          <>
            {/* Cliente */}
            <div className="p-3 border-b border-border">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                <UserRound className="h-3 w-3" /> Cliente
              </p>
              {matchInfo === 'loading' ? (
                <p className="text-xs text-muted-foreground">Buscando…</p>
              ) : matchInfo?.cliente ? (
                <div className="space-y-1.5">
                  <InfoRow label="Nome"     value={matchInfo.cliente.nome} />
                  <InfoRow label="Email"    value={matchInfo.cliente.email || '—'} />
                  <InfoRow label="WhatsApp" value={matchInfo.cliente.whatsapp || activeChat.whatsappPhone || '—'} />
                  <a
                    href={`/clientes/${matchInfo.cliente.id}`}
                    className="flex items-center gap-1 text-[11px] text-blue-500 hover:underline mt-2"
                  >
                    <ExternalLink className="h-3 w-3" /> Ver cadastro completo
                  </a>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-3">
                  <Unlink className="h-5 w-5 text-muted-foreground/30" />
                  <p className="text-[11px] text-muted-foreground text-center">Nenhum cliente vinculado a este chat.</p>
                </div>
              )}
            </div>

            {/* O que busca — perfil de busca mais recente (se houver mais de um) */}
            {matchInfo && matchInfo !== 'loading' && matchInfo?.cliente && matchInfo.perfil && (
              <div className="p-3 border-b border-border">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                  <Search className="h-3 w-3" /> O que busca
                </p>
                <div className="space-y-1.5">
                  <InfoRow label="Tipo" value={matchInfo.perfil.finalidade === 'COMPRA' ? 'Compra' : 'Aluguel'} />
                  {(matchInfo.perfil.precoMin || matchInfo.perfil.precoMax) && (
                    <InfoRow
                      label="Orçamento"
                      value={`R$ ${matchInfo.perfil.precoMin ? fmt(Number(matchInfo.perfil.precoMin)) + 'k' : '?'} – ${matchInfo.perfil.precoMax ? fmt(Number(matchInfo.perfil.precoMax)) + 'k' : '?'}`}
                    />
                  )}
                  {matchInfo.perfil.cidades.length > 0 && (
                    <InfoRow label="Cidades" value={matchInfo.perfil.cidades.join(', ')} />
                  )}
                  {matchInfo.perfil.bairros.length > 0 && (
                    <InfoRow label="Bairros" value={matchInfo.perfil.bairros.join(', ')} />
                  )}
                </div>
              </div>
            )}

            {/* Atribuir corretor */}
            {matchInfo && matchInfo !== 'loading' && matchInfo?.cliente && (
              <div className="p-3 border-b border-border">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                  <Users className="h-3 w-3" /> Corretor responsável
                </p>
                <select
                  value={matchInfo.cliente.corretor?.id ?? ''}
                  disabled={assigningId !== null}
                  onChange={(e) => handleAssignCorretor(e.target.value)}
                  className="w-full text-xs bg-secondary/60 border border-border rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="">— Sem corretor —</option>
                  {corretores.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Match — mais recente, se houver mais de um */}
            {matchInfo && matchInfo !== 'loading' && matchInfo?.cliente && (
              <div className="p-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                  <LinkIcon className="h-3 w-3" /> Match associado
                </p>
                {matchInfo.match ? (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <div className="h-16 bg-secondary/40 flex items-center justify-center relative">
                      <MapPin className="h-6 w-6 text-muted-foreground/30" />
                      <span className="absolute top-1.5 right-1.5 text-[10px] font-bold bg-green-500/20 text-green-500 border border-green-500/30 rounded px-1.5 py-0.5">
                        {Math.round(matchInfo.match.leadScore)}%
                      </span>
                    </div>
                    <div className="p-2 space-y-1">
                      <p className="text-xs font-medium leading-snug line-clamp-2">{matchInfo.match.imovel.titulo}</p>
                      <p className="text-sm font-semibold text-blue-500">R$ {fmtPreco(Number(matchInfo.match.imovel.preco))}</p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-2.5 w-2.5" />{matchInfo.match.imovel.cidade.nome}
                      </p>
                      {(matchInfo.match.imovel.areaM2 || matchInfo.match.imovel.quartos) && (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Ruler className="h-2.5 w-2.5" />
                          {matchInfo.match.imovel.areaM2 ? `${matchInfo.match.imovel.areaM2}m²` : ''}
                          {matchInfo.match.imovel.quartos ? ` · ${matchInfo.match.imovel.quartos}q` : ''}
                          {matchInfo.match.imovel.vagas ? ` · ${matchInfo.match.imovel.vagas}v` : ''}
                        </p>
                      )}
                      <div className="flex items-center gap-1 pt-1 border-t border-border">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        <span className="text-[11px]">{ETAPA_LABELS[matchInfo.match.etapa] ?? matchInfo.match.etapa}</span>
                      </div>
                      <a
                        href={`/matches?perfilId=${matchInfo.perfil?.id ?? ''}`}
                        className="flex items-center gap-1 text-[11px] text-blue-500 hover:underline mt-1"
                      >
                        <ExternalLink className="h-3 w-3" /> Ver match completo
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Sem match vinculado.</p>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-muted-foreground text-center px-4">Selecione um chat para ver os detalhes.</p>
          </div>
        )}
      </div>
    </div>
    </MobileBlock>
  )
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function ChatItem({ chat, active, onClick, clientNames }: { chat: GptChat; active: boolean; onClick: () => void; clientNames: Record<string, string> }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors border-l-2 ${
        active ? 'bg-blue-500/20 border-blue-400' : 'border-transparent hover:bg-secondary/40'
      }`}
    >
      <div
        className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
        style={{ background: avatarColor(chat.id) }}
      >
        {initials(getChatName(chat, clientNames) || chat.whatsappPhone)}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium truncate block">{getChatName(chat, clientNames) || 'Visitante'}</span>
        <div className="flex items-center gap-1 mt-0.5">
          {chat.finished ? (
            <span className="text-[10px] font-medium text-green-500">Finalizado ✓</span>
          ) : chat.humanTalk ? (
            <span className="text-[10px] font-medium text-amber-500">Em atendimento</span>
          ) : (
            <span className="text-[10px] text-muted-foreground">Em espera</span>
          )}
        </div>
      </div>
      {chat.unReadCount > 0 && (
        <span className="h-4 min-w-[16px] px-1 bg-blue-600 text-white text-[10px] font-semibold rounded-full flex items-center justify-center shrink-0">
          {chat.unReadCount}
        </span>
      )}
    </button>
  )
}

function MessageBubble({ msg, onEdit, onDelete }: {
  msg: GptMessage
  onEdit: (newText: string) => Promise<void>
  onDelete: () => Promise<void>
}) {
  const [menuOpen,   setMenuOpen]   = useState(false)
  const [editing,    setEditing]    = useState(false)
  const [editText,   setEditText]   = useState(msg.text)
  const [saving,     setSaving]     = useState(false)

  const isUser   = msg.role === 'user'
  // GPT Maker pode retornar mensagens de corretor humano com role 'human' ou
  // role 'assistant' + userName preenchido
  const isHuman  = msg.role === 'human' || (msg.role === 'assistant' && !!msg.userName)
  const isAgent  = msg.role === 'assistant' && !msg.userName
  const isSystem = msg.type === 'NOTIFICATION' || msg.role === 'system'

  // Evento de sistema (NOTIFICATION): exibe como separador centralizado
  if (isSystem) {
    if (!msg.text && !msg.userName) return null
    const label = msg.text || (msg.userName ? `Atendimento assumido por ${msg.userName}` : null)
    if (!label) return null
    return (
      <div className="flex items-center gap-2 my-1">
        <div className="flex-1 h-px bg-border" />
        <span className="text-[10px] text-muted-foreground shrink-0 px-1">{label}</span>
        <div className="flex-1 h-px bg-border" />
      </div>
    )
  }

  // Agente IA e corretor humano ficam à direita; cliente fica à esquerda
  const isRight = isAgent || isHuman

  async function handleSaveEdit() {
    if (!editText.trim() || editText === msg.text) { setEditing(false); return }
    setSaving(true)
    await onEdit(editText.trim())
    setSaving(false)
    setEditing(false)
  }

  return (
    <div
      className={`group flex flex-col max-w-[70%] relative ${isRight ? 'self-end items-end ml-auto' : 'self-start items-start'}`}
      onMouseLeave={() => setMenuOpen(false)}
    >
      <p className="text-[10px] text-muted-foreground mb-0.5">
        {isUser ? 'Cliente' : isHuman ? (msg.userName ?? 'Corretor') : 'IA'}
        {isAgent && <span className="ml-1 text-[10px] bg-green-500/15 text-green-500 rounded px-1">IA</span>}
        {isHuman && <span className="ml-1 text-[10px] bg-amber-500/15 text-amber-500 rounded px-1">Você</span>}
        {' · '}{msg.time ? new Date(msg.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
      </p>

      <div className="flex items-end gap-1">
        {/* Botão de menu — aparece no hover, à esquerda de msgs da direita */}
        {isRight && (
          <div className="relative mb-1">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 rounded-full flex items-center justify-center hover:bg-secondary text-muted-foreground"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
            {menuOpen && (
              <div className="absolute bottom-7 right-0 z-20 bg-card border border-border rounded-lg shadow-lg py-1 w-36">
                <button
                  onClick={() => { setMenuOpen(false); setEditing(true); setEditText(msg.text) }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-secondary transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" /> Editar
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onDelete() }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Excluir
                </button>
              </div>
            )}
          </div>
        )}

        <div className={`px-3 py-2 rounded-xl text-sm leading-relaxed ${
          isUser  ? 'bg-secondary rounded-br-sm' :
          isHuman ? 'bg-amber-500/20 border border-amber-500/25 rounded-bl-sm' :
                    'bg-blue-600/85 text-white rounded-bl-sm'
        }`}>
          {editing ? (
            <div className="flex flex-col gap-1 min-w-[160px]">
              <textarea
                autoFocus
                rows={2}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="text-sm bg-transparent border border-white/30 rounded px-2 py-1 outline-none resize-none w-full"
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit() } if (e.key === 'Escape') setEditing(false) }}
              />
              <div className="flex gap-1 justify-end">
                <button onClick={() => setEditing(false)} className="text-[10px] px-2 py-0.5 rounded hover:bg-white/10">Cancelar</button>
                <button onClick={handleSaveEdit} disabled={saving} className="text-[10px] px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 disabled:opacity-50">{saving ? '…' : 'Salvar'}</button>
              </div>
            </div>
          ) : (
            msg.text || <span className="italic text-muted-foreground text-xs">mensagem sem texto</span>
          )}
        </div>

        {/* Botão de menu para msgs da esquerda (cliente) */}
        {!isRight && (
          <div className="relative mb-1">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 rounded-full flex items-center justify-center hover:bg-secondary text-muted-foreground"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
            {menuOpen && (
              <div className="absolute bottom-7 left-0 z-20 bg-card border border-border rounded-lg shadow-lg py-1 w-36">
                <button
                  onClick={() => { setMenuOpen(false); onDelete() }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Excluir
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-[11px] text-muted-foreground shrink-0">{label}</span>
      <span className="text-[11px] text-right truncate">{value}</span>
    </div>
  )
}
