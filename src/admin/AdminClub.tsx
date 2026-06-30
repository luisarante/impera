import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Button, Field, PageHeader, TextInput } from './ui'

interface ClubRow {
  name: string
  badge_name: string
  tagline: string
  eternal_motto: string
}

export default function AdminClub() {
  const [form, setForm] = useState<ClubRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('club')
      .select('name, badge_name, tagline, eternal_motto')
      .eq('id', 1)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setForm(data as ClubRow)
        setLoading(false)
      })
  }, [])

  const set = <K extends keyof ClubRow>(key: K, value: ClubRow[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f))

  async function save() {
    if (!form) return
    setSaving(true)
    setSaved(false)
    setError(null)
    const { error } = await supabase.from('club').update(form).eq('id', 1)
    if (error) setError(error.message)
    else setSaved(true)
    setSaving(false)
  }

  if (loading) return <p className="text-[var(--text-50)]">Carregando…</p>
  if (!form) return <p className="text-[var(--color-alert)]">{error ?? 'Clube não encontrado.'}</p>

  return (
    <div className="max-w-2xl">
      <PageHeader title="Clube" />
      <div className="space-y-5">
        <Field label="Nome">
          <TextInput value={form.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label="Sigla do escudo (ex.: IMP)">
          <TextInput value={form.badge_name} onChange={(e) => set('badge_name', e.target.value)} />
        </Field>
        <Field label="Tagline">
          <TextInput value={form.tagline} onChange={(e) => set('tagline', e.target.value)} />
        </Field>
        <Field label="Lema eterno">
          <TextInput value={form.eternal_motto} onChange={(e) => set('eternal_motto', e.target.value)} />
        </Field>

        {error && <p className="text-sm text-[var(--color-alert)]">{error}</p>}
        {saved && <p className="text-sm text-[var(--color-accent)]">Salvo!</p>}

        <Button variant="primary" onClick={save} disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar'}
        </Button>
      </div>
    </div>
  )
}
