import { useState } from 'react'
import { useTable } from './useTable'
import { Button, Card, Field, PageHeader, TextArea, TextInput } from './ui'
import { useConfirm, useToast } from './feedback'

interface MilestoneRow {
  id: string
  date_label: string
  title: string
  text_body: string
  sort_order: number
}

const blank = (sort_order: number): Partial<MilestoneRow> => ({
  date_label: '',
  title: '',
  text_body: '',
  sort_order,
})

export default function AdminMilestones() {
  const confirm = useConfirm()
  const toast = useToast()
  const { rows, loading, error, insert, update, remove, nextSortOrder } =
    useTable<MilestoneRow>('milestones')
  const [draft, setDraft] = useState<Partial<MilestoneRow> | null>(null)
  const [saving, setSaving] = useState(false)

  async function del(m: MilestoneRow) {
    if (
      await confirm({
        title: 'Remover marco',
        message: `Remover "${m.title}"?`,
        danger: true,
        confirmLabel: 'Remover',
      })
    ) {
      await remove(m.id)
      toast('Marco removido.', 'success')
    }
  }

  const set = <K extends keyof MilestoneRow>(key: K, value: MilestoneRow[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d))

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

  if (draft) {
    return (
      <div className="max-w-2xl">
        <PageHeader title={draft.id ? 'Editar marco' : 'Novo marco'} />
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Data (ex.: DEZ — 2022)">
              <TextInput value={draft.date_label ?? ''} onChange={(e) => set('date_label', e.target.value)} />
            </Field>
            <Field label="Título">
              <TextInput value={draft.title ?? ''} onChange={(e) => set('title', e.target.value)} />
            </Field>
          </div>
          <Field label="Texto">
            <TextArea rows={4} value={draft.text_body ?? ''} onChange={(e) => set('text_body', e.target.value)} />
          </Field>
          <div className="flex gap-3 pt-2">
            <Button variant="primary" onClick={save} disabled={saving || !draft.title}>
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
        title="Marcos"
        action={
          <Button variant="primary" onClick={() => setDraft(blank(nextSortOrder()))}>
            + Novo marco
          </Button>
        }
      />
      {loading && <p className="text-[var(--text-50)]">Carregando…</p>}
      {error && <p className="text-[var(--color-alert)]">{error}</p>}
      <div className="space-y-3">
        {rows.map((m) => (
          <Card key={m.id} className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{m.title}</p>
              <p className="truncate text-xs text-[var(--text-50)]">{m.date_label}</p>
            </div>
            <Button onClick={() => setDraft(m)}>Editar</Button>
            <Button variant="danger" onClick={() => del(m)}>
              ✕
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
