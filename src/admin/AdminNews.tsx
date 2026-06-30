import { useState } from 'react'
import { removeImage } from '../lib/supabase'
import { useTable } from './useTable'
import { Button, Card, Field, ImageUpload, PageHeader, TextArea, TextInput } from './ui'
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
  const { rows, loading, error, insert, update, remove, nextSortOrder } = useTable<NewsRow>('news')
  const [draft, setDraft] = useState<Partial<NewsRow> | null>(null)
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof NewsRow>(key: K, value: NewsRow[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d))

  async function save() {
    if (!draft) return
    setSaving(true)
    try {
      if (draft.id) await update(draft.id, draft)
      else await insert(draft)
      setDraft(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Falha ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function del(n: NewsRow) {
    if (!confirm(`Remover "${n.headline}"?`)) return
    await remove(n.id)
    if (n.cover_path) void removeImage('news', n.cover_path)
  }

  if (draft) {
    return (
      <div className="max-w-3xl">
        <PageHeader title={draft.id ? 'Editar notícia' : 'Nova notícia'} />
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
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
          <div className="grid grid-cols-[1fr_auto] items-start gap-4">
            <ImageUpload
              bucket="news"
              label="Capa"
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
              key={draft.id ?? 'new'}
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
          <Button variant="primary" onClick={() => setDraft(blank(nextSortOrder()))}>
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
            <Button onClick={() => setDraft(n)}>Editar</Button>
            <Button variant="danger" onClick={() => del(n)}>
              ✕
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
