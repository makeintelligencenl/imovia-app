'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Send, UserCheck, Bot, Phone, MapPin, Ruler, ExternalLink, LinkIcon, UserRound, Unlink } from 'lucide-react'
import { api } from '@/lib/api'
import { getCurrentUser } from '@/lib/auth'

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
  whatsappPhone:    string
  conversationType: string
  createdAt:        string
  time:             string
}

interface GptMessage {
  id:          string
  text:        string
  role:        'user' | 'assistant' | 'human'
  type:        string
  time:        string
  imageUrl?:   string
  audioUrl?:   string
  documentUrl?: string
  userName?:   string
}

interface MatchInfo {
  cliente: { id: string; nome: string; email: string; whatsapp: string | null; corretor: { id: string; name: string } | null }
  perfil:  { id: string; finalidade: string; precoMin: number | null; precoMax: number | null } | null
  match:   { id: string; leadScore: number; etapa: string; updatedAt: string; imovel: { id: string; titulo: string; preco: number; areaM2: number | null; quartos: number | null; vagas: number | null; cidade: { nome: string } } } | null
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtPreco(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
}

const AVATAR_COLORS = ['#7c3aed','#059669','#dc2626','#d97706','#0891b2','#be185d','#1d4ed8','#065f46']
function avatarColor(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
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
  const [chats,       setChats]       = useState<GptChat[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [search,      setSearch]      = useState('')
  const [filterMode,  setFilterMode]  = useState<'all' | 'human' | 'ai'>('all')

  // conversa ativa
  const [activeChat,   setActiveChat]   = useState<GptChat | null>(null)
  const [messages,     setMessages]     = useState<GptMessage[]>([])
  const [loadingMsgs,  setLoadingMsgs]  = useState(false)
  const [text,         setText]         = useState('')
  const [sending,      setSending]      = useState(false)
  const [toggling,     setToggling]     = useState(false)

  // match info
  const [matchInfo,    setMatchInfo]    = useState<MatchInfo | null | 'loading'>('loading')

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const u = getCurrentUser()
    if (!u || u.role !== 'ADMIN') { router.replace('/dashboard'); return }
    setAllowed(true)
  }, [router])

  const fetchChats = useCallback(async () => {
    if (!allowed) return
    setLoadingList(true)
    try {
      const data = await api.get<{ chats?: GptChat[] } | GptChat[]>('/chats?pageSize=50')
      // GPT Maker pode retornar { chats: [] } ou [] diretamente
      const list = Array.isArray(data) ? data : (data as { chats?: GptChat[] }).chats ?? []
      setChats(list)
    } catch {
      toast.error('Não foi possível carregar os chats.')
    } finally {
      setLoadingList(false)
    }
  }, [allowed])

  useEffect(() => { fetchChats() }, [fetchChats])

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

    // Busca match associado pelo telefone
    if (chat.whatsappPhone) {
      try {
        const info = await api.get<MatchInfo | null>(`/chats/${chat.id}/match-info?phone=${encodeURIComponent(chat.whatsappPhone)}`)
        setMatchInfo(info)
      } catch {
        setMatchInfo(null)
      }
    } else {
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

  async function handleToggleHuman() {
    if (!activeChat || toggling) return
    setToggling(true)
    try {
      if (activeChat.humanTalk) {
        await api.post(`/chats/${activeChat.id}/end`, {})
        setActiveChat({ ...activeChat, humanTalk: false })
        setChats((prev) => prev.map((c) => c.id === activeChat.id ? { ...c, humanTalk: false } : c))
        toast.success('Atendimento devolvido à IA.')
      } else {
        await api.post(`/chats/${activeChat.id}/assume`, {})
        setActiveChat({ ...activeChat, humanTalk: true })
        setChats((prev) => prev.map((c) => c.id === activeChat.id ? { ...c, humanTalk: true } : c))
        toast.success('Você assumiu o atendimento.')
      }
    } catch {
      toast.error('Não foi possível alterar o modo de atendimento.')
    } finally {
      setToggling(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // Filtros
  const filteredChats = chats.filter((c) => {
    if (filterMode === 'human' && !c.humanTalk) return false
    if (filterMode === 'ai'    &&  c.humanTalk) return false
    if (search) {
      const q = search.toLowerCase()
      return c.name.toLowerCase().includes(q) || c.whatsappPhone.includes(q)
    }
    return true
  })

  const humanChats = filteredChats.filter((c) => c.humanTalk)
  const aiChats    = filteredChats.filter((c) => !c.humanTalk)

  if (!allowed) return null

  return (
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
          <div className="flex gap-1">
            {(['all','human','ai'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setFilterMode(m)}
                className={`text-xs px-2.5 py-1 rounded-md transition-colors ${filterMode === m ? 'bg-blue-500/15 text-blue-400 font-medium' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {m === 'all' ? 'Todos' : m === 'human' ? 'Humano' : 'IA'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <p className="text-xs text-muted-foreground text-center py-8">Carregando…</p>
          ) : filteredChats.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">Nenhum chat encontrado.</p>
          ) : (
            <>
              {humanChats.length > 0 && (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 pt-3 pb-1">Em atendimento humano</p>
                  {humanChats.map((c) => <ChatItem key={c.id} chat={c} active={activeChat?.id === c.id} onClick={() => selectChat(c)} />)}
                </>
              )}
              {aiChats.length > 0 && (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 pt-3 pb-1">Atendimento IA</p>
                  {aiChats.map((c) => <ChatItem key={c.id} chat={c} active={activeChat?.id === c.id} onClick={() => selectChat(c)} />)}
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
                  {initials(activeChat.name || activeChat.whatsappPhone)}
                </div>
                <div>
                  <p className="text-sm font-semibold leading-tight">{activeChat.name || 'Sem nome'}</p>
                  <p className="text-xs text-muted-foreground">{activeChat.whatsappPhone} · {activeChat.agentName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${activeChat.humanTalk ? 'bg-amber-400' : 'bg-green-400'}`} />
                  <span className="text-xs text-muted-foreground">{activeChat.humanTalk ? 'Humano ativo' : 'IA respondendo'}</span>
                </div>
                <button
                  onClick={handleToggleHuman}
                  disabled={toggling}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors disabled:opacity-50 ${
                    activeChat.humanTalk
                      ? 'bg-red-500/10 text-red-400 border-red-500/25 hover:bg-red-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/25 hover:bg-amber-500/20'
                  }`}
                >
                  {activeChat.humanTalk ? (
                    <><Bot className="h-3.5 w-3.5" />{toggling ? '…' : 'Devolver à IA'}</>
                  ) : (
                    <><UserCheck className="h-3.5 w-3.5" />{toggling ? '…' : 'Assumir atendimento'}</>
                  )}
                </button>
              </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {loadingMsgs ? (
                <p className="text-xs text-muted-foreground text-center py-10">Carregando mensagens…</p>
              ) : messages.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-10">Nenhuma mensagem ainda.</p>
              ) : (
                messages.map((m) => <MessageBubble key={m.id} msg={m} />)
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
      <div className="w-56 shrink-0 border-l border-border bg-card overflow-y-auto">
        {activeChat ? (
          <>
            {/* Match */}
            <div className="p-3 border-b border-border">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                <LinkIcon className="h-3 w-3" /> Match associado
              </p>
              {matchInfo === 'loading' ? (
                <p className="text-xs text-muted-foreground">Buscando…</p>
              ) : matchInfo?.match ? (
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
                      href={`/dashboard/matches`}
                      className="flex items-center gap-1 text-[11px] text-blue-500 hover:underline mt-1"
                    >
                      <ExternalLink className="h-3 w-3" /> Ver match completo
                    </a>
                  </div>
                </div>
              ) : matchInfo?.cliente ? (
                <p className="text-xs text-muted-foreground">Cliente encontrado, sem match vinculado.</p>
              ) : (
                <div className="flex flex-col items-center gap-2 py-3">
                  <Unlink className="h-5 w-5 text-muted-foreground/30" />
                  <p className="text-[11px] text-muted-foreground text-center">Nenhum match vinculado a este chat.</p>
                </div>
              )}
            </div>

            {/* Perfil do lead */}
            {matchInfo && matchInfo !== 'loading' && matchInfo?.cliente && (
              <div className="p-3 border-b border-border">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                  <UserRound className="h-3 w-3" /> Perfil do lead
                </p>
                <div className="space-y-1.5">
                  <InfoRow label="Nome"     value={matchInfo.cliente.nome} />
                  {matchInfo.perfil && (
                    <>
                      <InfoRow label="Tipo"    value={matchInfo.perfil.finalidade === 'COMPRA' ? 'Compra' : 'Aluguel'} />
                      {(matchInfo.perfil.precoMin || matchInfo.perfil.precoMax) && (
                        <InfoRow
                          label="Orçamento"
                          value={`R$ ${matchInfo.perfil.precoMin ? fmt(Number(matchInfo.perfil.precoMin)) + 'k' : '?'} – ${matchInfo.perfil.precoMax ? fmt(Number(matchInfo.perfil.precoMax)) + 'k' : '?'}`}
                        />
                      )}
                    </>
                  )}
                  {matchInfo.cliente.corretor && (
                    <InfoRow label="Corretor" value={matchInfo.cliente.corretor.name} />
                  )}
                </div>
              </div>
            )}

            {/* Telefone */}
            <div className="p-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                <Phone className="h-3 w-3" /> Contato
              </p>
              <p className="text-xs">{activeChat.whatsappPhone || '—'}</p>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-muted-foreground text-center px-4">Selecione um chat para ver os detalhes.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function ChatItem({ chat, active, onClick }: { chat: GptChat; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors border-l-2 ${
        active ? 'bg-blue-500/8 border-blue-400' : 'border-transparent hover:bg-secondary/40'
      }`}
    >
      <div
        className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
        style={{ background: avatarColor(chat.id) }}
      >
        {initials(chat.name || chat.whatsappPhone)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium truncate">{chat.name || 'Sem nome'}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
            chat.humanTalk
              ? 'bg-amber-500/15 text-amber-500'
              : 'bg-green-500/15 text-green-500'
          }`}>
            {chat.humanTalk ? 'Humano' : 'IA'}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground truncate">{chat.whatsappPhone}</p>
      </div>
      {chat.unReadCount > 0 && (
        <span className="h-4 min-w-[16px] px-1 bg-blue-600 text-white text-[10px] font-semibold rounded-full flex items-center justify-center shrink-0">
          {chat.unReadCount}
        </span>
      )}
    </button>
  )
}

function MessageBubble({ msg }: { msg: GptMessage }) {
  const isUser   = msg.role === 'user'
  const isHuman  = msg.role === 'human'
  const isAgent  = msg.role === 'assistant'

  return (
    <div className={`flex flex-col max-w-[70%] ${isUser ? 'self-end items-end ml-auto' : 'self-start items-start'}`}>
      <p className="text-[10px] text-muted-foreground mb-0.5">
        {isUser ? 'Cliente' : isHuman ? (msg.userName ?? 'Corretor') : 'IA'}
        {isAgent && <span className="ml-1 text-[10px] bg-green-500/15 text-green-500 rounded px-1">IA</span>}
        {isHuman && <span className="ml-1 text-[10px] bg-amber-500/15 text-amber-500 rounded px-1">Você</span>}
        {' · '}{msg.time ? new Date(msg.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
      </p>
      <div className={`px-3 py-2 rounded-xl text-sm leading-relaxed ${
        isUser  ? 'bg-blue-500/15 rounded-br-sm' :
        isHuman ? 'bg-green-900/30 border border-amber-500/20 rounded-bl-sm' :
                  'bg-secondary rounded-bl-sm'
      }`}>
        {msg.text || <span className="italic text-muted-foreground text-xs">mensagem sem texto</span>}
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
