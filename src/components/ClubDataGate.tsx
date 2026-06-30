import type { ReactNode } from 'react'
import { useClubDataState } from '../lib/data/ClubDataContext'
import Badge from './ui/Badge'

/**
 * Segura a renderização das páginas públicas até o conteúdo do clube chegar do
 * banco. Garante que cada seção receba os arrays já populados na primeira
 * renderização — preservando as animações GSAP que dependem do tamanho das listas.
 */
export default function ClubDataGate({ children }: { children: ReactNode }) {
  const { data, loading, error, reload } = useClubDataState()

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--color-ink)] text-center">
        <div className="animate-pulse">
          <Badge size={88} glow />
        </div>
        <span className="text-xs uppercase tracking-[0.3em] text-[var(--text-50)]">Carregando…</span>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--color-ink)] px-6 text-center">
        <Badge size={72} />
        <p className="max-w-md text-[var(--text-70)]">
          Não foi possível carregar o conteúdo do clube.
          <br />
          <span className="text-sm text-[var(--text-50)]">{error}</span>
        </p>
        <button
          type="button"
          onClick={() => reload()}
          className="border border-[var(--color-accent)] px-8 py-3 text-sm uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-80"
          style={{ borderRadius: 'var(--radius-card)' }}
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  return <>{children}</>
}
