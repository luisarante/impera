import { useEffect, useState } from 'react'
import { loadOverwatchCover, uploadOverwatchCover } from '../lib/overwatchCover'

export default function OverwatchCoverField() {
  const [cover, setCover] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let active = true
    loadOverwatchCover()
      .then((url) => { if (active) setCover(url) })
      .catch((err) => { if (active) setError(err.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  async function upload(file: File) {
    setUploading(true)
    setError('')
    setSaved(false)
    try {
      setCover(await uploadOverwatchCover(file))
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar a imagem.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <section className="mb-8 rounded-lg border border-[var(--hairline)] p-5" aria-labelledby="overwatch-cover-title">
      <h2 id="overwatch-cover-title" className="text-lg font-semibold">Foto de Overwatch na página inicial</h2>
      <p className="mb-4 mt-2 text-sm leading-relaxed text-[var(--text-70)]">
        Escolha uma imagem horizontal, de preferência 1600 × 1000 px. JPG, PNG ou WebP, até 10 MB.
        A foto será salva assim que o envio terminar.
      </p>
      {cover && <img src={cover} alt="Foto atual do painel de Overwatch" className="mb-4 aspect-[8/5] w-full rounded-md object-cover" />}
      {loading && <p className="mb-3 text-sm text-[var(--text-50)]">Carregando foto…</p>}
      <label className="block text-sm">
        <span className="mb-2 block">{cover ? 'Trocar foto' : 'Enviar foto'}</span>
        <input type="file" accept="image/jpeg,image/png,image/webp" disabled={loading || uploading}
          className="block w-full text-sm file:mr-4 file:rounded file:border-0 file:bg-[var(--color-accent)] file:px-4 file:py-2 file:text-white disabled:opacity-50"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void upload(file)
            event.target.value = ''
          }} />
      </label>
      <p role="status" className="mt-3 text-sm text-[var(--color-accent)]">{uploading ? 'Enviando foto…' : saved ? 'Foto atualizada na página inicial.' : ''}</p>
      {error && <p role="alert" className="mt-3 text-sm text-[var(--color-alert)]">{error}</p>}
    </section>
  )
}
