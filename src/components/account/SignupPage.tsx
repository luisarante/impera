import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../admin/auth'
import { useClubData } from '../../lib/data/ClubDataContext'
import { Button, Field, Select, TextInput } from '../../admin/ui'
import AccountLayout from './AccountLayout'

/** Cadastro do torcedor: nome de exibição, e-mail, senha e jogador (avatar). */
export default function SignupPage() {
  const { session, signUp } = useAuth()
  const { squad } = useClubData()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [playerId, setPlayerId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  if (session) return <Navigate to={from} replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { needsConfirmation } = await signUp(
        email.trim(),
        password,
        displayName.trim(),
        playerId || null,
      )
      if (needsConfirmation) setDone(true)
      else navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar a conta.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <AccountLayout title="Quase lá" subtitle="Imperatrice FC">
        <p className="text-sm text-[var(--text-70)]">
          Enviamos um e-mail de confirmação para <strong>{email}</strong>. Confirme
          para ativar sua conta e poder comentar e votar.
        </p>
        <Link to="/entrar" state={{ from }} className="mt-6 block">
          <Button type="button" variant="primary" className="w-full">
            Ir para o login
          </Button>
        </Link>
      </AccountLayout>
    )
  }

  return (
    <AccountLayout
      title="Criar conta"
      subtitle="Imperatrice FC"
      footer={
        <>
          Já tem conta?{' '}
          <Link to="/entrar" state={{ from }} className="text-white underline">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nome de exibição">
          <TextInput
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={40}
            required
          />
        </Field>
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
            autoComplete="new-password"
            minLength={6}
            required
          />
        </Field>
        <Field label="Seu jogador (avatar) — opcional">
          <Select value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
            <option value="">Sem jogador (avatar padrão)</option>
            {squad.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.number}
              </option>
            ))}
          </Select>
        </Field>

        {error && <p className="text-sm text-[var(--color-alert)]">{error}</p>}

        <Button type="submit" variant="primary" className="w-full" disabled={busy}>
          {busy ? 'Criando…' : 'Criar conta'}
        </Button>
      </form>
    </AccountLayout>
  )
}
