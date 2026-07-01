import { useState } from 'react'
import { useTable } from './useTable'
import { Button, Card, Field, PageHeader, Select, TextInput } from './ui'
import { useConfirm, useToast } from './feedback'

interface BigNumberRow {
  id: string
  value: string
  numeric_value: number | null
  prefix: string | null
  suffix: string | null
  label: string
  highlight: 'gold' | 'paper' | null
  sort_order: number
}

const blank = (sort_order: number): Partial<BigNumberRow> => ({
  value: '',
  numeric_value: null,
  prefix: null,
  suffix: null,
  label: '',
  highlight: null,
  sort_order,
})

export default function AdminBigNumbers() {
  const confirm = useConfirm()
  const toast = useToast()
  const { rows, loading, error, insert, update, remove, nextSortOrder } =
    useTable<BigNumberRow>('big_numbers')
  const [draft, setDraft] = useState<Partial<BigNumberRow> | null>(null)
  const [saving, setSaving] = useState(false)

  async function del(b: BigNumberRow) {
    if (
      await confirm({
        title: 'Remover número',
        message: `Remover "${b.label}"?`,
        danger: true,
        confirmLabel: 'Remover',
      })
    ) {
      await remove(b.id)
      toast('Número removido.', 'success')
    }
  }

  const set = <K extends keyof BigNumberRow>(key: K, value: BigNumberRow[K]) =>
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
        <PageHeader title={draft.id ? 'Editar número' : 'Novo número'} />
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Valor exibido (ex.: 500)">
              <TextInput value={draft.value ?? ''} onChange={(e) => set('value', e.target.value)} />
            </Field>
            <Field label="Valor animado (opcional, número)">
              <TextInput
                type="number"
                value={draft.numeric_value ?? ''}
                onChange={(e) => set('numeric_value', e.target.value ? Number(e.target.value) : null)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Prefixo (ex.: +)">
              <TextInput value={draft.prefix ?? ''} onChange={(e) => set('prefix', e.target.value || null)} />
            </Field>
            <Field label="Sufixo">
              <TextInput value={draft.suffix ?? ''} onChange={(e) => set('suffix', e.target.value || null)} />
            </Field>
          </div>
          <Field label="Rótulo (descrição)">
            <TextInput value={draft.label ?? ''} onChange={(e) => set('label', e.target.value)} />
          </Field>
          <Field label="Destaque de cor">
            <Select
              value={draft.highlight ?? ''}
              onChange={(e) => set('highlight', (e.target.value || null) as BigNumberRow['highlight'])}
            >
              <option value="">Padrão</option>
              <option value="gold">Dourado</option>
              <option value="paper">Claro</option>
            </Select>
          </Field>
          <div className="flex gap-3 pt-2">
            <Button variant="primary" onClick={save} disabled={saving || !draft.label}>
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
        title="Números"
        action={
          <Button variant="primary" onClick={() => setDraft(blank(nextSortOrder()))}>
            + Novo número
          </Button>
        }
      />
      {loading && <p className="text-[var(--text-50)]">Carregando…</p>}
      {error && <p className="text-[var(--color-alert)]">{error}</p>}
      <div className="space-y-3">
        {rows.map((b) => (
          <Card key={b.id} className="flex items-center gap-4">
            <span className="w-16 shrink-0 text-2xl font-bold">
              {b.prefix ?? ''}
              {b.value}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-[var(--text-50)]">{b.label}</p>
            </div>
            <Button onClick={() => setDraft(b)}>Editar</Button>
            <Button variant="danger" onClick={() => del(b)}>
              ✕
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
