import type { ReactNode } from 'react'

interface GhostButtonProps {
  children: ReactNode
  onClick?: () => void
  cursorLabel?: string
}

/**
 * Botão fantasma vazado em verde — borda fina, preenche no hover.
 */
export default function GhostButton({ children, onClick, cursorLabel }: GhostButtonProps) {
  return (
    <button
      onClick={onClick}
      data-cursor={cursorLabel}
      className="group relative inline-flex items-center gap-3 border border-[var(--color-accent)] px-8 py-4 text-sm font-medium uppercase tracking-[0.18em] text-[var(--color-accent)] transition-colors duration-300 hover:text-black"
      style={{ borderRadius: 'var(--radius-card)' }}
    >
      <span
        className="absolute inset-0 origin-left scale-x-0 bg-[var(--color-accent)] transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100"
        style={{ borderRadius: 'var(--radius-card)' }}
        aria-hidden
      />
      <span className="relative">{children}</span>
    </button>
  )
}
