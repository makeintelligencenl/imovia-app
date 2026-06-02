'use client'
import { useEffect, useRef, useState } from 'react'
import { Building2 } from 'lucide-react'

type Msg =
  | { tipo: 'agente' | 'cliente'; texto: string }
  | { tipo: 'imovel'; titulo: string; detalhes: string }

const SCRIPT: Array<Msg & { delay: number }> = [
  { tipo: 'agente',  texto: 'Olá! 👋 Sou o assistente virtual da BH Premium Imóveis. Como posso te chamar?', delay: 700 },
  { tipo: 'cliente', texto: 'Oi, meu nome é Fernanda', delay: 2000 },
  { tipo: 'agente',  texto: 'Prazer, Fernanda! Você busca um imóvel para comprar ou alugar?', delay: 1600 },
  { tipo: 'cliente', texto: 'Comprar', delay: 1800 },
  { tipo: 'agente',  texto: 'Que tipo de imóvel? Casa, apartamento ou sala comercial?', delay: 1400 },
  { tipo: 'cliente', texto: 'Apartamento', delay: 1700 },
  { tipo: 'agente',  texto: 'Quantos quartos você precisa?', delay: 1300 },
  { tipo: 'cliente', texto: '2 quartos, com suíte', delay: 2000 },
  { tipo: 'agente',  texto: 'Qual é o seu orçamento máximo?', delay: 1400 },
  { tipo: 'cliente', texto: 'Até R$ 600 mil', delay: 1900 },
  { tipo: 'agente',  texto: 'Em qual bairro de BH você prefere?', delay: 1300 },
  { tipo: 'cliente', texto: 'Savassi ou Belvedere', delay: 2400 },
  { tipo: 'agente',  texto: 'Perfil cadastrado com sucesso ✅ Já encontrei 2 imóveis compatíveis:', delay: 1800 },
  { tipo: 'imovel',  titulo: 'Apto 3/4 · Savassi — BH', detalhes: 'R$ 580.000 · 98 m² · 2 vagas', delay: 1200 },
  { tipo: 'imovel',  titulo: 'Apto 2/4 · Belvedere — BH', detalhes: 'R$ 480.000 · 78 m² · 1 vaga', delay: 1000 },
  { tipo: 'agente',  texto: 'Nosso corretor vai entrar em contato para agendar as visitas 😊', delay: 1600 },
]

export function ChatAnimado() {
  const [msgs, setMsgs]       = useState<Msg[]>([])
  const [typing, setTyping]   = useState(false)
  const bodyRef               = useRef<HTMLDivElement>(null)
  const timers                = useRef<ReturnType<typeof setTimeout>[]>([])

  function clear() {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  function scroll() {
    setTimeout(() => {
      bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' })
    }, 30)
  }

  function run() {
    clear()
    setMsgs([])
    setTyping(false)

    let t = 500
    SCRIPT.forEach((item) => {
      const isAgent = item.tipo === 'agente' || item.tipo === 'imovel'

      if (isAgent) {
        timers.current.push(setTimeout(() => { setTyping(true); scroll() }, t))
        t += item.delay
      } else {
        t += item.delay
      }

      timers.current.push(setTimeout(() => {
        setTyping(false)
        const { delay: _d, ...msg } = item
        setMsgs(prev => [...prev, msg as Msg])
        scroll()
      }, t))
      t += 320
    })

    // loop após 5 s
    timers.current.push(setTimeout(run, t + 5000))
  }

  useEffect(() => { run(); return clear }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* janela */}
      <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
           style={{ background: '#1a2744' }}>

        {/* header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10"
             style={{ background: '#1e3a6e' }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
               style={{ background: '#0F172A' }}>
            <Building2 className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">Assistente ImovIA</p>
            <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
              online agora
            </p>
          </div>
        </div>

        {/* mensagens */}
        <div ref={bodyRef}
             className="flex flex-col gap-2 p-3 overflow-y-auto scrollbar-hide"
             style={{ minHeight: 300, maxHeight: 380 }}>

          {msgs.map((m, i) => {
            if (m.tipo === 'imovel') {
              return (
                <div key={i} className="self-start rounded-xl p-3 text-xs animate-fadeUp max-w-[85%]"
                     style={{ background: 'rgba(52,211,153,.12)', border: '1px solid rgba(52,211,153,.25)' }}>
                  <p className="font-bold text-emerald-300 mb-0.5">🏠 {m.titulo}</p>
                  <p className="text-slate-400">{m.detalhes}</p>
                </div>
              )
            }
            return (
              <div key={i}
                   className={`rounded-xl px-3 py-2 text-xs leading-relaxed animate-fadeUp max-w-[85%] ${
                     m.tipo === 'agente'
                       ? 'self-start text-slate-200 rounded-bl-sm'
                       : 'self-end text-white rounded-br-sm bg-blue-600'
                   }`}
                   style={m.tipo === 'agente' ? { background: '#1e3a6e' } : {}}>
                {m.texto}
              </div>
            )
          })}

          {/* digitando */}
          {typing && (
            <div className="self-start flex gap-1 items-center px-3 py-2.5 rounded-xl rounded-bl-sm animate-fadeUp"
                 style={{ background: '#1e3a6e' }}>
              {[0, 150, 300].map((d) => (
                <span key={d} className="w-1.5 h-1.5 rounded-full bg-blue-400"
                      style={{ animation: `bounce 0.9s ${d}ms infinite` }} />
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%,60%,100% { transform:translateY(0) }
          30%          { transform:translateY(-5px) }
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(6px) }
          to   { opacity:1; transform:translateY(0) }
        }
        .animate-fadeUp { animation: fadeUp .25s ease-out }
        .scrollbar-hide::-webkit-scrollbar { display:none }
        .scrollbar-hide { scrollbar-width:none }
      `}</style>
    </div>
  )
}
