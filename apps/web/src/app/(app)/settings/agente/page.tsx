'use client'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  AtualizacaoAgente,
  CAMPOS_OPCIONAIS,
  ConfiguracaoAgente,
  ItemBase,
  MensagemTeste,
  ProvedorIa,
  buscarAgente,
  listarItensBase,
  salvarAgente,
  testarAgente,
} from '@/lib/agente-api'

const CLASSE_CAMPO = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm'
const CLASSE_CARD = 'rounded-xl border border-border bg-card p-5 space-y-4'
const TEMPOS = [0, 5, 10, 30, 60]
const ROTULO_PROVEDOR: Record<ProvedorIa, string> = { anthropic: 'Claude (Anthropic)', openai: 'ChatGPT (OpenAI)' }

type Campos = Omit<ConfiguracaoAgente, 'id' | 'itemIds' | 'provedoresDisponiveis' | 'catalogoModelos' | 'ultimaFalha'>

export default function AgentePage() {
  const [cfg, setCfg] = useState<ConfiguracaoAgente | null>(null)
  const [itens, setItens] = useState<ItemBase[]>([])
  const [form, setForm] = useState<Campos | null>(null)
  const [itemIds, setItemIds] = useState<string[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null)

  const [conversa, setConversa] = useState<MensagemTeste[]>([])
  const [rascunho, setRascunho] = useState('')
  const [testando, setTestando] = useState(false)

  useEffect(() => {
    Promise.all([buscarAgente(), listarItensBase()])
      .then(([c, i]) => {
        setCfg(c)
        setItens(i)
        setItemIds(c.itemIds)
        const { id, provedoresDisponiveis, catalogoModelos, ultimaFalha, itemIds: _ignorado, ...campos } = c
        setForm(campos)
      })
      .catch((e) => setAviso({ ok: false, texto: e instanceof Error ? e.message : 'Não foi possível carregar o agente.' }))
      .finally(() => setCarregando(false))
  }, [])

  const provedorTemChave = useMemo(() => (cfg && form ? cfg.provedoresDisponiveis.includes(form.provedor) : false), [cfg, form])

  if (carregando) return <p className="text-sm text-muted-foreground">Carregando…</p>
  if (!cfg || !form) return <p className="text-sm text-destructive">{aviso?.texto ?? 'Não foi possível carregar o agente.'}</p>

  const alterar = <K extends keyof Campos>(campo: K, valor: Campos[K]) => setForm({ ...form, [campo]: valor })

  function trocarProvedor(provedor: ProvedorIa) {
    const primeiroRapido = cfg!.catalogoModelos[provedor].find((m) => m.faixa === 'rapido')
    setForm({ ...form!, provedor, modelo: primeiroRapido?.id ?? form!.modelo })
  }

  function alternarItem(id: string) {
    setItemIds((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]))
  }

  function alternarCampo(campo: string) {
    const atuais = form!.camposObrigatorios
    alterar(
      'camposObrigatorios',
      atuais.includes(campo) ? atuais.filter((c) => c !== campo) : [...atuais, campo],
    )
  }

  async function salvar() {
    setSalvando(true)
    setAviso(null)
    try {
      const dados: AtualizacaoAgente = { ...form! }
      const atualizado = await salvarAgente(dados, itemIds)
      setCfg(atualizado)
      setAviso({ ok: true, texto: 'Alterações salvas.' })
    } catch (e) {
      setAviso({ ok: false, texto: e instanceof Error ? e.message : 'Não foi possível salvar.' })
    } finally {
      setSalvando(false)
    }
  }

  async function enviarTeste() {
    const texto = rascunho.trim()
    if (!texto) return
    const novaConversa: MensagemTeste[] = [...conversa, { papel: 'cliente', texto }]
    setConversa(novaConversa)
    setRascunho('')
    setTestando(true)
    try {
      const r = await testarAgente(novaConversa)
      const resposta: MensagemTeste = {
        papel: 'agente',
        texto: r.tipo === 'transferencia' ? `[Transferiria para humano] ${r.texto ?? ''}` : (r.texto ?? ''),
      }
      setConversa([...novaConversa, resposta])
    } catch (e) {
      setConversa([...novaConversa, { papel: 'agente', texto: `Erro: ${e instanceof Error ? e.message : 'falha no teste'}` }])
    } finally {
      setTestando(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      {cfg.ultimaFalha && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <p className="font-medium text-destructive">Última falha do agente</p>
          <p className="text-muted-foreground mt-1">
            {new Date(cfg.ultimaFalha.em).toLocaleString('pt-BR')} — {cfg.ultimaFalha.mensagem}
          </p>
        </div>
      )}

      {/* Estado */}
      <section className={CLASSE_CARD}>
        <h2 className="text-base font-semibold">Estado</h2>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={form.ativo}
            disabled={!provedorTemChave && !form.ativo}
            onChange={(e) => alterar('ativo', e.target.checked)}
          />
          Agente ligado
        </label>
        {!provedorTemChave && (
          <p className="text-xs text-amber-700">
            Para ligar o agente, cadastre a chave do provedor escolhido em Configurações › Integrações de IA.
          </p>
        )}
      </section>

      {/* Geral */}
      <section className={CLASSE_CARD}>
        <h2 className="text-base font-semibold">Geral</h2>
        <div className="space-y-1">
          <label className="text-sm font-medium">Nome do agente</label>
          <input className={CLASSE_CAMPO} maxLength={60} value={form.nome} onChange={(e) => alterar('nome', e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Instruções</label>
          <textarea
            className="min-h-40 w-full rounded-md border border-input bg-background p-3 text-sm"
            maxLength={6000}
            value={form.instrucoes}
            onChange={(e) => alterar('instrucoes', e.target.value)}
          />
          <p className="text-xs text-muted-foreground text-right">{form.instrucoes.length}/6000</p>
        </div>
      </section>

      {/* Modelo */}
      <section className={CLASSE_CARD}>
        <h2 className="text-base font-semibold">Modelo de IA</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Provedor</label>
            <select className={CLASSE_CAMPO} value={form.provedor} onChange={(e) => trocarProvedor(e.target.value as ProvedorIa)}>
              {(['anthropic', 'openai'] as ProvedorIa[]).map((p) => (
                <option key={p} value={p} disabled={!cfg.provedoresDisponiveis.includes(p)}>
                  {ROTULO_PROVEDOR[p]}
                  {cfg.provedoresDisponiveis.includes(p) ? '' : ' — sem chave'}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Modelo</label>
            <select className={CLASSE_CAMPO} value={form.modelo} onChange={(e) => alterar('modelo', e.target.value)}>
              {cfg.catalogoModelos[form.provedor].map((m) => (
                <option key={m.id} value={m.id}>
                  {m.rotulo} ({m.faixa === 'rapido' ? 'rápido' : m.faixa === 'equilibrado' ? 'equilibrado' : 'mais capaz'})
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Modelos "mais capaz" respondem com mais calma, o que aumenta o tempo até o cliente receber a resposta.
        </p>
      </section>

      {/* Perfil */}
      <section className={CLASSE_CARD}>
        <h2 className="text-base font-semibold">Perfil do cliente</h2>
        <p className="text-xs text-muted-foreground">
          Finalidade, tipo de imóvel, cidade e preço máximo são sempre obrigatórios. Escolha o que mais deve ser exigido:
        </p>
        <div className="flex flex-wrap gap-4">
          {CAMPOS_OPCIONAIS.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.camposObrigatorios.includes(c.id)}
                onChange={() => alternarCampo(c.id)}
              />
              {c.rotulo}
            </label>
          ))}
        </div>
        <div className="space-y-1 max-w-xs">
          <label className="text-sm font-medium">Máximo de imóveis sugeridos</label>
          <input
            type="number"
            min={1}
            max={20}
            className={CLASSE_CAMPO}
            value={form.maxMatches}
            onChange={(e) => alterar('maxMatches', Number(e.target.value))}
          />
        </div>
      </section>

      {/* Base de conhecimento */}
      <section className={CLASSE_CARD}>
        <h2 className="text-base font-semibold">Base de conhecimento</h2>
        <p className="text-xs text-muted-foreground">Marque os itens que o agente pode usar nas respostas.</p>
        {itens.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum item cadastrado. Crie itens em Configurações › Base de conhecimento.</p>
        ) : (
          <ul className="space-y-2">
            {itens.map((i) => (
              <li key={i.id}>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={itemIds.includes(i.id)} onChange={() => alternarItem(i.id)} />
                  {i.titulo}
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Conversa */}
      <section className={CLASSE_CARD}>
        <h2 className="text-base font-semibold">Conversa</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.transferirParaHumano} onChange={(e) => alterar('transferirParaHumano', e.target.checked)} />
          Transferir para humano quando não souber responder
        </label>
        {form.transferirParaHumano && (
          <div className="space-y-1">
            <label className="text-sm font-medium">Mensagem ao transferir</label>
            <textarea
              className="min-h-20 w-full rounded-md border border-input bg-background p-3 text-sm"
              maxLength={500}
              placeholder="Deixe em branco para o agente escrever a frase na hora."
              value={form.mensagemTransferencia ?? ''}
              onChange={(e) => alterar('mensagemTransferencia', e.target.value || null)}
            />
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Tempo de resposta</label>
            <select className={CLASSE_CAMPO} value={form.tempoRespostaSegundos} onChange={(e) => alterar('tempoRespostaSegundos', Number(e.target.value))}>
              {TEMPOS.map((t) => (
                <option key={t} value={t}>
                  {t === 0 ? 'Imediatamente' : `${t} segundos`}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.usarEmojis} onChange={(e) => alterar('usarEmojis', e.target.checked)} />Usar emojis</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.assinarNome} onChange={(e) => alterar('assinarNome', e.target.checked)} />Assinar com o nome do agente</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.restringirTemas} onChange={(e) => alterar('restringirTemas', e.target.checked)} />Restringir a conversa aos temas das instruções</label>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <Button onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar alterações'}</Button>
        {aviso && <p className={aviso.ok ? 'text-sm text-green-700' : 'text-sm text-destructive'}>{aviso.texto}</p>}
      </div>

      {/* Teste */}
      <section className={CLASSE_CARD}>
        <h2 className="text-base font-semibold">Testar o agente</h2>
        <p className="text-xs text-muted-foreground">
          O teste usa a configuração salva. Não envia ao WhatsApp e não grava conversas nem perfis.
        </p>
        <div className="space-y-2 max-h-80 overflow-y-auto rounded-md border p-3 bg-muted/30">
          {conversa.length === 0 && <p className="text-sm text-muted-foreground">Escreva como se fosse um cliente.</p>}
          {conversa.map((m, idx) => (
            <div key={idx} className={m.papel === 'cliente' ? 'text-right' : 'text-left'}>
              <span className={`inline-block rounded-lg px-3 py-2 text-sm ${m.papel === 'cliente' ? 'bg-blue-600 text-white' : 'bg-card border'}`}>
                {m.texto}
              </span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className={CLASSE_CAMPO}
            placeholder="Mensagem do cliente"
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !testando && enviarTeste()}
          />
          <Button variant="outline" onClick={enviarTeste} disabled={testando || !rascunho.trim()}>
            {testando ? 'Pensando…' : 'Enviar'}
          </Button>
          {conversa.length > 0 && (
            <Button variant="outline" onClick={() => setConversa([])}>Limpar</Button>
          )}
        </div>
      </section>
    </div>
  )
}
