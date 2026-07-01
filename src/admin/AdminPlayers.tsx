import { useState } from 'react'
import type { PositionCode } from '../data/club'
import { publicImageUrl, removeImage } from '../lib/supabase'
import { useTable } from './useTable'
import { Button, Card, Field, ImageUpload, PageHeader, Select, TextArea, TextInput } from './ui'
import { useConfirm, useToast } from './feedback'

interface PlayerRow {
  id: string
  name: string
  number: string
  position: string
  role: PositionCode
  starter: boolean
  is_pillar: boolean
  dilemma: string | null
  description: string | null
  accent: 'accent' | 'gold' | null
  photo_path: string | null
  sort_order: number
}

const ROLES: PositionCode[] = ['GK', 'LB', 'CB', 'RB', 'CM', 'LW', 'ST', 'RW']

const blank = (sort_order: number): Partial<PlayerRow> => ({
  name: '',
  number: '',
  position: '',
  role: 'CM',
  starter: false,
  is_pillar: false,
  dilemma: '',
  description: '',
  accent: null,
  photo_path: null,
  sort_order,
})

export default function AdminPlayers() {
  const confirm = useConfirm()
  const toast = useToast()
  const { rows, loading, error, insert, update, remove, nextSortOrder } = useTable<PlayerRow>('players')
  const [draft, setDraft] = useState<Partial<PlayerRow> | null>(null)
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof PlayerRow>(key: K, value: PlayerRow[K]) =>
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

  async function del(p: PlayerRow) {
    const ok = await confirm({
      title: 'Remover jogador',
      message: `Remover ${p.name} do elenco?`,
      danger: true,
      confirmLabel: 'Remover',
    })
    if (!ok) return
    try {
      await remove(p.id)
      if (p.photo_path) void removeImage('players', p.photo_path)
      toast('Jogador removido.', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao remover.', 'error')
    }
  }

  if (draft) {
    return (
      <div className="max-w-2xl">
        <PageHeader title={draft.id ? 'Editar jogador' : 'Novo jogador'} />
        <div className="space-y-5">
          <ImageUpload
            bucket="players"
            label="Foto"
            value={draft.photo_path ?? null}
            onChange={(path) => set('photo_path', path)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nome">
              <TextInput value={draft.name ?? ''} onChange={(e) => set('name', e.target.value)} />
            </Field>
            <Field label="Número (ex.: #7)">
              <TextInput value={draft.number ?? ''} onChange={(e) => set('number', e.target.value)} />
            </Field>
          </div>
          <Field label="Posição (texto, ex.: Centro Avante · Camisa 9)">
            <TextInput value={draft.position ?? ''} onChange={(e) => set('position', e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Função tática (campo)">
              <Select value={draft.role} onChange={(e) => set('role', e.target.value as PositionCode)}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Destaque de cor">
              <Select
                value={draft.accent ?? ''}
                onChange={(e) => set('accent', (e.target.value || null) as PlayerRow['accent'])}
              >
                <option value="">Nenhum</option>
                <option value="accent">Verde</option>
                <option value="gold">Dourado</option>
              </Select>
            </Field>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.starter ?? false}
                onChange={(e) => set('starter', e.target.checked)}
              />
              Titular padrão
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.is_pillar ?? false}
                onChange={(e) => set('is_pillar', e.target.checked)}
              />
              Pilar (destaque na home)
            </label>
          </div>
          <Field label="Frase / dilema (itálico — opcional)">
            <TextInput value={draft.dilemma ?? ''} onChange={(e) => set('dilemma', e.target.value)} />
          </Field>
          <Field label="Descrição (opcional)">
            <TextArea
              rows={3}
              value={draft.description ?? ''}
              onChange={(e) => set('description', e.target.value)}
            />
          </Field>

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
        title="Elenco"
        action={
          <Button variant="primary" onClick={() => setDraft(blank(nextSortOrder()))}>
            + Novo jogador
          </Button>
        }
      />

      {loading && <p className="text-[var(--text-50)]">Carregando…</p>}
      {error && <p className="text-[var(--color-alert)]">{error}</p>}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {rows.map((p) => (
          <Card key={p.id} className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--hairline)] bg-black/40 text-sm">
              {p.photo_path ? (
                <img
                  src={publicImageUrl('players', p.photo_path) ?? ''}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                p.number.replace('#', '')
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {p.name} <span className="text-[var(--text-50)]">{p.number}</span>
              </p>
              <p className="truncate text-xs text-[var(--text-50)]">
                {p.role}
                {p.is_pillar ? ' · pilar' : ''}
                {p.starter ? ' · titular' : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setDraft(p)}>Editar</Button>
              <Button variant="danger" onClick={() => del(p)}>
                ✕
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
