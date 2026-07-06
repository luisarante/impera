import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../admin/auth'
import { Button, Field, TextInput } from '../../admin/ui'
import AccountLayout from './AccountLayout'

/** Login do torcedor (e-mail + senha). Volta para a página de origem após entrar. */
export default function LoginPage() {
  const { session, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (session) return <Navigate to={from} replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signIn(email.trim(), password)
      navigate(from, { replace: true })
    } catch {
      setError('E-mail ou senha inválidos.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AccountLayout
      title="Entrar"
      subtitle="Imperatrice FC"
      footer={
        <>
          Ainda não tem conta?{' '}
          <Link to="/cadastro" state={{ from }} className="text-white underline">
            Cadastre-se
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="E-mail">
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
      </form>
    </AccountLayout>
  )
}
