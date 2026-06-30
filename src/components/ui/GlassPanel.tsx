import { useEffect } from 'react'
import type { NewsItem } from '../../data/club'
import { lockScroll, unlockScroll } from '../../lib/useLenis'
import { sanitizeNewsHtml } from '../../lib/sanitize'
import VerifiedBadge from './VerifiedBadge'

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR')
}

interface GlassPanelProps {
  item: NewsItem | null
  onClose: () => void
}

/**
 * Painel lateral "vidro fosco" (glassmorphism) que desliza da direita
 * para ler a matéria completa sem trocar de página.
 */
export default function GlassPanel({ item, onClose }: GlassPanelProps) {
  const open = item !== null

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Trava o scroll do site enquanto o painel está aberto — só a matéria rola.
  useEffect(() => {
    if (open) lockScroll()
    else unlockScroll()
    return () => unlockScroll()
  }, [open])

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[1000] bg-black/55 transition-opacity duration-500 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden
      />

      {/* Painel */}
      <aside
        className={`fixed right-0 top-0 z-[1001] flex h-full w-[min(560px,46vw)] flex-col transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          background: 'rgba(12, 20, 14, 0.55)',
          backdropFilter: 'blur(26px)',
          WebkitBackdropFilter: 'blur(26px)',
          borderLeft: '1px solid var(--hairline)',
        }}
        role="dialog"
        aria-modal="true"
      >
        {item && (
          <div data-lenis-prevent className="flex h-full flex-col overflow-y-auto px-12 py-14">
            <button
              onClick={onClose}
              data-cursor="Fechar"
              className="mb-10 self-start text-[0.7rem] uppercase tracking-[0.2em] text-[var(--text-50)] transition-colors hover:text-white"
            >
              ← Fechar
            </button>

            <span className="eyebrow mb-4" style={{ color: 'var(--color-accent)' }}>
              {item.kicker}
            </span>

            <h2 className="mb-4 text-3xl leading-[1.08] uppercase">{item.headline}</h2>

            <p className="mb-5 text-xs uppercase tracking-[0.16em] text-[var(--text-50)]">
              {item.author}
              {item.author && item.publishedAt ? ' · ' : ''}
              {formatDate(item.publishedAt)}
            </p>

            <p className="mb-8 text-lg leading-relaxed text-[var(--text-70)]">{item.lead}</p>

            <div className="mb-10 h-px w-full" style={{ background: 'var(--hairline)' }} />

            {item.html ? (
              <div
                className="news-content text-[var(--text-70)]"
                dangerouslySetInnerHTML={{ __html: sanitizeNewsHtml(item.html) }}
              />
            ) : (
              <div className="news-content space-y-5 text-[var(--text-70)]">
                {(item.body ?? []).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            )}

            <div className="mt-auto pt-10">
              {item.verified && <VerifiedBadge />}
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
