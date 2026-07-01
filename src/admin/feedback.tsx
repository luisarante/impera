import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

// ── Confirmação (modal) ──────────────────────────────────────────────────────
interface ConfirmOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

// ── Toast (aviso transitório) ────────────────────────────────────────────────
type ToastVariant = 'info' | 'success' | 'error'
interface Toast {
  id: number
  message: string
  variant: ToastVariant
}

interface FeedbackApi {
  confirm: (opts: ConfirmOptions) => Promise<boolean>
  toast: (message: string, variant?: ToastVariant) => void
}

const FeedbackCtx = createContext<FeedbackApi | null>(null)

/**
 * Provê `confirm()` (modal estilizado) e `toast()` para o painel admin,
 * substituindo os pop-ups nativos do navegador. Envolver o admin com este
 * provider (ver AdminLayout).
 */
export function AdminFeedbackProvider({ children }: { children: ReactNode }) {
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null)
  const resolveRef = useRef<((v: boolean) => void) | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const confirm = useCallback((opts: ConfirmOptions) => {
    setConfirmState(opts)
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve
    })
  }, [])

  const settle = useCallback((value: boolean) => {
    resolveRef.current?.(value)
    resolveRef.current = null
    setConfirmState(null)
  }, [])

  const toast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = nextId.current++
    setToasts((prev) => [...prev, { id, message, variant }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3400)
  }, [])

  const toastColor: Record<ToastVariant, string> = {
    info: 'var(--color-accent)',
    success: 'var(--color-accent)',
    error: 'var(--color-alert)',
  }

  return (
    <FeedbackCtx.Provider value={{ confirm, toast }}>
      {children}

      {/* Modal de confirmação */}
      {confirmState && (
        <div
          className="admin-shell fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 px-6"
          role="dialog"
          aria-modal="true"
          onClick={() => settle(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-[var(--hairline)] bg-[#0b120d] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {confirmState.title && (
              <h3 className="mb-2 text-lg font-semibold uppercase tracking-[0.04em]">
                {confirmState.title}
              </h3>
            )}
            <p className="text-sm leading-relaxed text-[var(--text-70)]">{confirmState.message}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => settle(false)}
                className="rounded-md border border-[var(--hairline)] px-5 py-2.5 text-sm uppercase tracking-[0.08em] text-[var(--text-70)] transition-colors hover:text-white"
              >
                {confirmState.cancelLabel ?? 'Cancelar'}
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => settle(true)}
                className={`rounded-md px-5 py-2.5 text-sm font-medium uppercase tracking-[0.08em] transition-opacity hover:opacity-90 ${
                  confirmState.danger
                    ? 'bg-[var(--color-alert)] text-white'
                    : 'bg-[var(--color-accent)] text-black'
                }`}
              >
                {confirmState.confirmLabel ?? 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="admin-shell pointer-events-none fixed bottom-4 right-4 z-[2100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto min-w-[220px] max-w-sm rounded-lg border bg-[#0b120d] px-4 py-3 text-sm text-white shadow-xl"
            style={{ borderColor: toastColor[t.variant] }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </FeedbackCtx.Provider>
  )
}

function useFeedback(): FeedbackApi {
  const ctx = useContext(FeedbackCtx)
  if (!ctx) throw new Error('useFeedback deve ser usado dentro de <AdminFeedbackProvider>')
  return ctx
}

export function useConfirm() {
  return useFeedback().confirm
}

export function useToast() {
  return useFeedback().toast
}
