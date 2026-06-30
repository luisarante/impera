import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './auth'

/** Protege as rotas do painel: sem sessão → redireciona para o login. */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-ink)] text-sm uppercase tracking-[0.3em] text-[var(--text-50)]">
        Carregando…
      </div>
    )
  }

  if (!session) return <Navigate to="/admin/login" replace />

  return <>{children}</>
}
