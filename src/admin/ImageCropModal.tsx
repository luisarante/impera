import { useCallback, useEffect, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import 'react-easy-crop/react-easy-crop.css'

interface ImageCropModalProps {
  /** Object URL (blob:) da imagem escolhida — mesma origem, canvas não é "tainted". */
  src: string
  /** Proporção do recorte (ex.: 16/9). */
  aspect: number
  /** Rótulo curto da proporção exibido na dica (ex.: "16:9"). */
  aspectLabel?: string
  onCancel: () => void
  onConfirm: (blob: Blob) => void
}

/**
 * Recorta a imagem na área escolhida e devolve um JPEG. Limita a largura de
 * saída para manter o arquivo enxuto sem perder nitidez na capa.
 */
async function getCroppedBlob(src: string, area: Area, maxWidth = 1600): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Não foi possível carregar a imagem.'))
    img.src = src
  })

  const scale = area.width > maxWidth ? maxWidth / area.width : 1
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(area.width * scale))
  canvas.height = Math.max(1, Math.round(area.height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas indisponível.')

  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Falha ao gerar a imagem recortada.'))),
      'image/jpeg',
      0.9,
    )
  })
}

/**
 * Modal de enquadramento da capa: o usuário arrasta e dá zoom para escolher
 * exatamente o que aparece, numa proporção fixa. Evita o corte "cego" do
 * `object-cover` na exibição do site.
 */
export default function ImageCropModal({
  src,
  aspect,
  aspectLabel = '16:9',
  onCancel,
  onConfirm,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [areaPixels, setAreaPixels] = useState<Area | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onCropComplete = useCallback((_area: Area, pixels: Area) => setAreaPixels(pixels), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onCancel])

  async function apply() {
    if (!areaPixels) return
    setBusy(true)
    setError(null)
    try {
      const blob = await getCroppedBlob(src, areaPixels)
      onConfirm(blob)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao recortar.')
      setBusy(false)
    }
  }

  return (
    <div
      className="admin-shell fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Enquadrar capa"
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[var(--hairline)] bg-[#0b120d] shadow-2xl">
        <div className="border-b border-[var(--hairline)] px-5 py-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em]">Enquadrar capa</h3>
          <p className="mt-1 text-xs text-[var(--text-50)]">
            Arraste para posicionar e use o zoom para escolher o recorte · proporção {aspectLabel}
          </p>
        </div>

        {/* Área do cropper (react-easy-crop exige container com tamanho definido) */}
        <div className="relative h-[46vh] min-h-[220px] w-full bg-black">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            minZoom={1}
            maxZoom={4}
            restrictPosition
            zoomWithScroll
            showGrid
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="flex items-center gap-3 px-5 py-3">
          <span className="text-xs uppercase tracking-[0.14em] text-[var(--text-50)]">Zoom</span>
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-[var(--color-accent)]"
            aria-label="Zoom"
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[var(--hairline)] px-5 py-4">
          {error && <span className="mr-auto text-xs text-[var(--color-alert)]">{error}</span>}
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-md border border-[var(--hairline)] px-5 py-2.5 text-sm uppercase tracking-[0.08em] text-[var(--text-70)] transition-colors hover:text-white disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={busy || !areaPixels}
            className="rounded-md bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium uppercase tracking-[0.08em] text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Aplicando…' : 'Aplicar recorte'}
          </button>
        </div>
      </div>
    </div>
  )
}
