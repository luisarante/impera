import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './auth'

/**
 * Protege as rotas do painel: exige sessão E perfil admin.
 * Sem sessão → login; logado mas sem is_admin → volta para a home
 * (torcedores comuns não acessam o /admin).
 */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-ink)] text-sm uppercase tracking-[0.3em] text-[var(--text-50)]">
        Carregando…
      </div>
    )
  }

  if (!session) return <Navigate to="/entrar" state={{ from: location.pathname }} replace />
  if (!profile?.isAdmin) return <Navigate to="/" replace />

  return <>{children}</>
}
