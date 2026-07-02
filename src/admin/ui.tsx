import { useRef, useState, type ReactNode } from 'react'
import { publicImageUrl, removeImage, uploadImage } from '../lib/supabase'

const inputCls =
  'w-full rounded-md border border-[var(--hairline)] bg-black/30 px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-[var(--color-accent)]'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-[0.16em] text-[var(--text-50)]">
        {label}
      </span>
      {children}
    </label>
  )
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ''}`} />
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputCls} ${props.className ?? ''}`} />
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputCls} ${props.className ?? ''}`} />
}

type ButtonVariant = 'primary' | 'ghost' | 'danger'

export function Button({
  variant = 'ghost',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const styles: Record<ButtonVariant, string> = {
    primary: 'bg-[var(--color-accent)] text-black hover:opacity-90',
    ghost: 'border border-[var(--hairline)] text-white hover:border-[var(--color-accent)]',
    danger: 'border border-[var(--color-alert)] text-[var(--color-alert)] hover:bg-[var(--color-alert)] hover:text-white',
  }
  return (
    <button
      {...props}
      className={`rounded-md px-5 py-2.5 text-sm font-medium uppercase tracking-[0.1em] transition-all disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
    />
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-[var(--hairline)] bg-white/[0.02] p-5 ${className}`}>
      {children}
    </div>
  )
}

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-xl font-semibold uppercase tracking-[0.04em] sm:text-2xl">{title}</h1>
      {action}
    </div>
  )
}

/**
 * Upload de imagem para um bucket do Storage. Mostra preview da imagem atual,
 * permite trocar (sobe a nova e apaga a antiga) e remover.
 */
export function ImageUpload({
  bucket,
  value,
  onChange,
  label = 'Imagem',
}: {
  bucket: string
  value: string | null
  onChange: (path: string | null) => void
  label?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const url = publicImageUrl(bucket, value)

  async function handleFile(file: File) {
    setBusy(true)
    setError(null)
    try {
      const path = await uploadImage(bucket, file)
      const previous = value
      onChange(path)
      // Limpa o objeto antigo (best-effort) depois de trocar a referência.
      if (previous) void removeImage(bucket, previous)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no upload.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Field label={label}>
      <div className="flex items-center gap-4">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[var(--hairline)] bg-black/40">
          {url ? (
            <img src={url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[0.6rem] uppercase tracking-[0.16em] text-[var(--text-50)]">
              sem foto
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
              e.target.value = ''
            }}
          />
          <Button type="button" onClick={() => inputRef.current?.click()} disabled={busy}>
            {busy ? 'Enviando…' : url ? 'Trocar' : 'Enviar'}
          </Button>
          {value && (
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                const previous = value
                onChange(null)
                if (previous) void removeImage(bucket, previous)
              }}
            >
              Remover
            </Button>
          )}
          {error && <span className="text-xs text-[var(--color-alert)]">{error}</span>}
        </div>
      </div>
    </Field>
  )
}
