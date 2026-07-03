import { useState } from 'react'
import { removeImage } from '../lib/supabase'
import { useTable } from './useTable'
import { Button, Card, Field, ImageUpload, PageHeader, TextArea, TextInput } from './ui'
import { useConfirm, useToast } from './feedback'
import { requestNewsDraft } from '../lib/ai'
import RichTextEditor from './RichTextEditor'

interface NewsRow {
  id: string
  kicker: string
  headline: string
  lead: string
  author: string
  published_at: string
  cover_path: string | null
  content_html: string | null
  body: string[]
  verified: boolean
  featured: boolean
  sort_order: number
}

const todayIso = () => new Date().toISOString()

const blank = (sort_order: number): Partial<NewsRow> => ({
  kicker: '',
  headline: '',
  lead: '',
  author: 'Redação SilviaNews',
  published_at: todayIso(),
  cover_path: null,
  content_html: '',
  body: [],
  verified: false,
  featured: false,
  sort_order,
})

export default function AdminNews() {
  const confirm = useConfirm()
  const toast = useToast()
  const { rows, loading, error, insert, update, remove, nextSortOrder } = useTable<NewsRow>('news')
  const [draft, setDraft] = useState<Partial<NewsRow> | null>(null)
  const [saving, setSaving] = useState(false)
  const [brief, setBrief] = useState('')
  const [generating, setGenerating] = useState(false)
  const [aiRev, setAiRev] = useState(0) // muda para forçar o editor a recarregar o corpo

  const set = <K extends keyof NewsRow>(key: K, value: NewsRow[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d))

  // Abre um rascunho (novo ou existente) já limpando o briefing e remontando o editor.
  function openDraft(next: Partial<NewsRow>) {
    setBrief('')
    setAiRev((n) => n + 1)
    setDraft(next)
  }

  // Feature B: gera todos os campos a partir de um briefing curto (com revisão humana).
  async function generateFromBrief() {
    const text = brief.trim()
    if (!text) return
    setGenerating(true)
    try {
      const d = await requestNewsDraft(text)
      setDraft((prev) =>
        prev
          ? {
              ...prev,
              kicker: d.kicker || prev.kicker,
              headline: d.headline || prev.headline,
              lead: d.lead || prev.lead,
              content_html: d.body_html || prev.content_html,
            }
          : prev,
      )
      setAiRev((n) => n + 1) // recarrega o corpo gerado no editor TipTap
      toast('Rascunho gerado pela IA. Revise e ajuste antes de publicar.', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao gerar com IA.', 'error')
    } finally {
      setGenerating(false)
    }
  }

  async function save() {
    if (!draft) return
    setSaving(true)
    try {
      if (draft.id) await update(draft.id, draft)
      else await insert(draft)
      setDraft(null)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao salvar.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function del(n: NewsRow) {
    const ok = await confirm({
      title: 'Remover notícia',
      message: `Remover "${n.headline}"?`,
      danger: true,
      confirmLabel: 'Remover',
    })
    if (!ok) return
    await remove(n.id)
    if (n.cover_path) void removeImage('news', n.cover_path)
    toast('Notícia removida.', 'success')
  }

  if (draft) {
    return (
      <div className="max-w-3xl">
        <PageHeader title={draft.id ? 'Editar notícia' : 'Nova notícia'} />
        <Card className="mb-6 space-y-3">
          <div>
            <h3 className="text-sm uppercase tracking-[0.14em] text-[var(--color-accent)]">
              Gerar com IA
            </h3>
            <p className="mt-1 text-xs text-[var(--text-50)]">
              Descreva em uma ou duas frases do que é a notícia. A IA preenche categoria, manchete,
              linha-fina e corpo — você revisa e ajusta antes de salvar.
            </p>
          </div>
          <TextArea
            rows={3}
            placeholder="Ex.: Empate de virada contra o rival; dois gols nos últimos 5 minutos; time segue invicto."
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
          />
          <Button variant="primary" onClick={generateFromBrief} disabled={generating || !brief.trim()}>
            {generating ? 'Gerando…' : 'Gerar campos com IA'}
          </Button>
        </Card>
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Categoria (chapéu)">
              <TextInput value={draft.kicker ?? ''} onChange={(e) => set('kicker', e.target.value)} />
            </Field>
            <Field label="Autor">
              <TextInput value={draft.author ?? ''} onChange={(e) => set('author', e.target.value)} />
            </Field>
          </div>
          <Field label="Título (manchete)">
            <TextInput value={draft.headline ?? ''} onChange={(e) => set('headline', e.target.value)} />
          </Field>
          <Field label="Linha-fina (resumo curto exibido nos cards)">
            <TextArea rows={2} value={draft.lead ?? ''} onChange={(e) => set('lead', e.target.value)} />
          </Field>
          <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-[1fr_auto]">
            <ImageUpload
              bucket="news"
              label="Capa (16:9)"
              cropAspect={16 / 9}
              cropAspectLabel="16:9"
              value={draft.cover_path ?? null}
              onChange={(p) => set('cover_path', p)}
            />
            <Field label="Data de publicação">
              <TextInput
                type="date"
                value={(draft.published_at ?? todayIso()).slice(0, 10)}
                onChange={(e) =>
                  set('published_at', e.target.value ? new Date(e.target.value).toISOString() : todayIso())
                }
              />
            </Field>
          </div>

          <Field label="Corpo da matéria">
            <RichTextEditor
              key={`${draft.id ?? 'new'}:${aiRev}`}
              value={draft.content_html ?? ''}
              onChange={(html) => set('content_html', html)}
            />
          </Field>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.verified ?? false}
                onChange={(e) => set('verified', e.target.checked)}
              />
              Verificada
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.featured ?? false}
                onChange={(e) => set('featured', e.target.checked)}
              />
              Capa do site (só uma por vez — marcar aqui desmarca a anterior)
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="primary" onClick={save} disabled={saving || !draft.headline}>
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
            <Button onClick={() => setDraft(null)} disabled={saving}>
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Notícias"
        action={
          <Button variant="primary" onClick={() => openDraft(blank(nextSortOrder()))}>
            + Nova notícia
          </Button>
        }
      />
      {loading && <p className="text-[var(--text-50)]">Carregando…</p>}
      {error && <p className="text-[var(--color-alert)]">{error}</p>}
      <div className="space-y-3">
        {rows.map((n) => (
          <Card key={n.id} className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{n.headline}</p>
              <p className="truncate text-xs text-[var(--text-50)]">
                {n.kicker} · {n.author}
                {n.featured ? ' · capa' : ''}
                {n.published_at ? ` · ${new Date(n.published_at).toLocaleDateString('pt-BR')}` : ''}
              </p>
            </div>
            <Button onClick={() => openDraft(n)}>Editar</Button>
            <Button variant="danger" onClick={() => del(n)}>
              ✕
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
