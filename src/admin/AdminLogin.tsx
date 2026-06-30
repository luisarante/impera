import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from './auth'
import { Button, Field, TextInput } from './ui'
import Badge from '../components/ui/Badge'

/** Tela de login do painel admin (Supabase Auth, email + senha). */
export default function AdminLogin() {
  const { session, signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (session) return <Navigate to="/admin" replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signIn(email.trim(), password)
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao entrar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-shell flex min-h-screen items-center justify-center bg-[var(--color-ink)] px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-[var(--hairline)] bg-white/[0.02] p-8"
      >
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Badge size={64} glow />
          <h1 className="text-lg font-semibold uppercase tracking-[0.18em]">Painel Admin</h1>
          <p className="text-xs text-[var(--text-50)]">Imperatrice FC</p>
        </div>

        <div className="space-y-4">
          <Field label="Email">
            <TextInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </Field>
          <Field label="Senha">
            <TextInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>

          {error && <p className="text-sm text-[var(--color-alert)]">{error}</p>}

          <Button type="submit" variant="primary" className="w-full" disabled={busy}>
            {busy ? 'Entrando…' : 'Entrar'}
          </Button>
        </div>
      </form>
    </div>
  )
}
