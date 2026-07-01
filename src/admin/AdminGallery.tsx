import { useState } from 'react'
import { publicImageUrl, removeImage } from '../lib/supabase'
import { useTable } from './useTable'
import { Button, Card, Field, ImageUpload, PageHeader, TextInput } from './ui'
import { useConfirm, useToast } from './feedback'

interface GalleryRow {
  id: string
  bucket: string
  image_path: string
  caption: string
  sort_order: number
}

export default function AdminGallery() {
  const confirm = useConfirm()
  const toast = useToast()
  const { rows, loading, error, insert, remove, nextSortOrder } = useTable<GalleryRow>('gallery_photos')
  const [path, setPath] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [saving, setSaving] = useState(false)

  async function add() {
    if (!path) return
    setSaving(true)
    try {
      await insert({ bucket: 'gallery', image_path: path, caption, sort_order: nextSortOrder() })
      setPath(null)
      setCaption('')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao adicionar.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function del(row: GalleryRow) {
    const ok = await confirm({
      title: 'Remover foto',
      message: 'Remover esta foto da galeria?',
      danger: true,
      confirmLabel: 'Remover',
    })
    if (!ok) return
    try {
      await remove(row.id)
      // Só apaga o arquivo se estiver no bucket próprio da galeria
      // (fotos do seed reaproveitam outros buckets — não devem ser apagadas).
      if (row.bucket === 'gallery') void removeImage('gallery', row.image_path)
      toast('Foto removida.', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao remover.', 'error')
    }
  }

  return (
    <div>
      <PageHeader title="Galeria" />

      <Card className="mb-8 max-w-2xl">
        <h3 className="mb-4 text-sm uppercase tracking-[0.14em] text-[var(--text-50)]">Nova foto</h3>
        <div className="space-y-4">
          <ImageUpload bucket="gallery" label="Imagem" value={path} onChange={setPath} />
          <Field label="Legenda">
            <TextInput value={caption} onChange={(e) => setCaption(e.target.value)} />
          </Field>
          <Button variant="primary" onClick={add} disabled={saving || !path}>
            {saving ? 'Adicionando…' : 'Adicionar à galeria'}
          </Button>
        </div>
      </Card>

      {loading && <p className="text-[var(--text-50)]">Carregando…</p>}
      {error && <p className="text-[var(--color-alert)]">{error}</p>}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {rows.map((row) => (
          <div key={row.id} className="group relative overflow-hidden rounded-lg border border-[var(--hairline)]">
            <img
              src={publicImageUrl(row.bucket, row.image_path) ?? ''}
              alt={row.caption}
              className="aspect-square w-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/80 to-transparent p-3">
              <span className="truncate text-xs text-white">{row.caption}</span>
              <button
                type="button"
                onClick={() => del(row)}
                className="shrink-0 rounded bg-[var(--color-alert)] px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
