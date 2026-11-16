'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ItemBase, atualizarItemBase, criarItemBase, listarItensBase, removerItemBase } from '@/lib/agente-api'

const LIMITE_TITULO = 120
const LIMITE_CONTEUDO = 20000

export default function BaseConhecimentoPage() {
  const [itens, setItens] = useState<ItemBase[]>([])
  const [carregando, setCarregando] = useState(true)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [titulo, setTitulo] = useState('')
  const [conteudo, setConteudo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    listarItensBase()
      .then(setItens)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Não foi possível carregar a base.'))
      .finally(() => setCarregando(false))
  }, [])

  function novo() {
    setEditandoId('novo')
    setTitulo('')
    setConteudo('')
    setErro(null)
  }

  function editar(item: ItemBase) {
    setEditandoId(item.id)
    setTitulo(item.titulo)
    setConteudo(item.conteudo)
    setErro(null)
  }

  async function salvar() {
    setSalvando(true)
    setErro(null)
    try {
      if (editandoId === 'novo') {
        const criado = await criarItemBase({ titulo, conteudo })
        setItens((atuais) => [criado, ...atuais])
      } else if (editandoId) {
        const atualizado = await atualizarItemBase(editandoId, { titulo, conteudo })
        setItens((atuais) => atuais.map((i) => (i.id === atualizado.id ? atualizado : i)))
      }
      setEditandoId(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.')
    } finally {
      setSalvando(false)
    }
  }

  async function remover(item: ItemBase) {
    if (!window.confirm(`Remover "${item.titulo}" da base? O agente deixa de usar este conteúdo.`)) return
    try {
      await removerItemBase(item.id)
      setItens((atuais) => atuais.filter((i) => i.id !== item.id))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível remover.')
    }
  }

  if (carregando) return <p className="text-sm text-muted-foreground">Carregando…</p>

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Textos que o agente usa para responder dúvidas (ex.: financiamento, documentação, horário de visitas).
        </p>
        {editandoId === null && <Button onClick={novo}>Novo item</Button>}
      </div>

      {editandoId !== null && (
        <section className="rounded-xl border border-border bg-card p-5 space-y-3">
          <input
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            placeholder="Título"
            maxLength={LIMITE_TITULO}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
          <textarea
            className="min-h-48 w-full rounded-md border border-input bg-background p-3 text-sm"
            placeholder="Conteúdo em texto"
            maxLength={LIMITE_CONTEUDO}
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
          />
          <p className="text-xs text-muted-foreground text-right">{conteudo.length}/{LIMITE_CONTEUDO}</p>
          <div className="flex gap-2">
            <Button onClick={salvar} disabled={salvando || !titulo.trim() || !conteudo.trim()}>
              {salvando ? 'Salvando…' : 'Salvar'}
            </Button>
            <Button variant="outline" onClick={() => setEditandoId(null)} disabled={salvando}>Cancelar</Button>
          </div>
        </section>
      )}

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      <ul className="space-y-3">
        {itens.map((item) => (
          <li key={item.id} className="rounded-xl border border-border bg-card p-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-medium text-sm">{item.titulo}</p>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{item.conteudo}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" onClick={() => editar(item)} disabled={editandoId !== null}>Editar</Button>
              <Button variant="outline" onClick={() => remover(item)} disabled={editandoId !== null}>Remover</Button>
            </div>
          </li>
        ))}
        {itens.length === 0 && editandoId === null && (
          <li className="text-sm text-muted-foreground">Nenhum item cadastrado ainda.</li>
        )}
      </ul>
    </div>
  )
}
