import { useState } from 'react'
import { removeImage } from '../lib/supabase'
import { useTable } from './useTable'
import { Button, Card, Field, ImageUpload, PageHeader, TextArea, TextInput } from './ui'

interface KitRow {
  id: string
  label: string
  name: string
  description: string
  price: string
  primary_color: string
  secondary_color: string
  image_path: string | null
  image_back_path: string | null
  sort_order: number
}

const blank = (sort_order: number): Partial<KitRow> => ({
  label: '',
  name: '',
  description: '',
  price: '',
  primary_color: '#009640',
  secondary_color: '#1d6034',
  image_path: null,
  image_back_path: null,
  sort_order,
})

export default function AdminKits() {
  const { rows, loading, error, insert, update, remove, nextSortOrder } = useTable<KitRow>('kits')
  const [draft, setDraft] = useState<Partial<KitRow> | null>(null)
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof KitRow>(key: K, value: KitRow[K]) =>
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

  async function del(k: KitRow) {
    if (!confirm(`Remover ${k.name}?`)) return
    await remove(k.id)
    if (k.image_path) void removeImage('kits', k.image_path)
    if (k.image_back_path) void removeImage('kits', k.image_back_path)
  }

  if (draft) {
    return (
      <div className="max-w-2xl">
        <PageHeader title={draft.id ? 'Editar kit' : 'Novo kit'} />
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Rótulo (ex.: Kit I)">
              <TextInput value={draft.label ?? ''} onChange={(e) => set('label', e.target.value)} />
            </Field>
            <Field label="Nome (ex.: Manto Principal)">
              <TextInput value={draft.name ?? ''} onChange={(e) => set('name', e.target.value)} />
            </Field>
          </div>
          <Field label="Descrição">
            <TextArea
              rows={2}
              value={draft.description ?? ''}
              onChange={(e) => set('description', e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Preço (ex.: R$ 299,90)">
              <TextInput value={draft.price ?? ''} onChange={(e) => set('price', e.target.value)} />
            </Field>
            <Field label="Cor primária">
              <TextInput
                type="color"
                value={draft.primary_color ?? '#000000'}
                onChange={(e) => set('primary_color', e.target.value)}
                className="h-11"
              />
            </Field>
            <Field label="Cor secundária">
              <TextInput
                type="color"
                value={draft.secondary_color ?? '#000000'}
                onChange={(e) => set('secondary_color', e.target.value)}
                className="h-11"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <ImageUpload
              bucket="kits"
              label="Foto frente"
              value={draft.image_path ?? null}
              onChange={(p) => set('image_path', p)}
            />
            <ImageUpload
              bucket="kits"
              label="Foto costas"
              value={draft.image_back_path ?? null}
              onChange={(p) => set('image_back_path', p)}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="primary" onClick={save} disabled={saving || !draft.name}>
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
        title="Kits"
        action={
          <Button variant="primary" onClick={() => setDraft(blank(nextSortOrder()))}>
            + Novo kit
          </Button>
        }
      />
      {loading && <p className="text-[var(--text-50)]">Carregando…</p>}
      {error && <p className="text-[var(--color-alert)]">{error}</p>}
      <div className="space-y-3">
        {rows.map((k) => (
          <Card key={k.id} className="flex items-center gap-4">
            <span
              className="h-10 w-10 shrink-0 rounded-md border border-[var(--hairline)]"
              style={{ background: `linear-gradient(135deg, ${k.primary_color}, ${k.secondary_color})` }}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{k.name}</p>
              <p className="truncate text-xs text-[var(--text-50)]">
                {k.label} · {k.price}
              </p>
            </div>
            <Button onClick={() => setDraft(k)}>Editar</Button>
            <Button variant="danger" onClick={() => del(k)}>
              ✕
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
