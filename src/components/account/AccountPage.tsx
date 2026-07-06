import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../admin/auth'
import { useClubData } from '../../lib/data/ClubDataContext'
import { Button, Field, Select, TextInput } from '../../admin/ui'
import UserAvatar from '../ui/UserAvatar'
import AccountLayout from './AccountLayout'

/** Perfil do torcedor logado: editar nome/jogador vinculado e sair. */
export default function AccountPage() {
  const { session, profile, loading, updateProfile, signOut } = useAuth()
  const { squad } = useClubData()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState(profile?.displayName ?? '')
  const [playerId, setPlayerId] = useState(profile?.playerId ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-ink)] text-sm uppercase tracking-[0.3em] text-[var(--text-50)]">
        Carregando…
      </div>
    )
  }
  if (!session) return <Navigate to="/entrar" state={{ from: '/conta' }} replace />

  // Enquanto o preview usa o jogador escolhido no formulário.
  const previewPhoto = squad.find((p) => p.id === playerId)?.photo ?? null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      await updateProfile(displayName.trim(), playerId || null)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar.')
    } finally {
      setBusy(false)
    }
  }

  async function handleSignOut() {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <AccountLayout title="Minha conta" subtitle={session.user.email ?? undefined}>
      <div className="mb-6 flex flex-col items-center gap-2">
        <UserAvatar name={displayName} avatarUrl={previewPhoto} size="md" />
        {profile?.isAdmin && (
          <span className="text-[0.65rem] uppercase tracking-[0.16em] text-[var(--color-gold)]">
            Administrador
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nome de exibição">
          <TextInput
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value)
              setSaved(false)
            }}
            maxLength={40}
            required
          />
        </Field>
        <Field label="Seu jogador (avatar)">
          <Select
            value={playerId}
            onChange={(e) => {
              setPlayerId(e.target.value)
              setSaved(false)
            }}
          >
            <option value="">Sem jogador (avatar padrão)</option>
            {squad.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.number}
              </option>
            ))}
          </Select>
        </Field>

        {error && <p className="text-sm text-[var(--color-alert)]">{error}</p>}
        {saved && <p className="text-sm text-[var(--color-accent)]">Perfil atualizado.</p>}

        <Button type="submit" variant="primary" className="w-full" disabled={busy}>
          {busy ? 'Salvando…' : 'Salvar'}
        </Button>
      </form>

      <div className="mt-4 border-t border-[var(--hairline)] pt-4">
        {profile?.isAdmin && (
          <Button
            type="button"
            className="mb-2 w-full"
            onClick={() => navigate('/admin')}
          >
            Painel admin
          </Button>
        )}
        <Button type="button" variant="danger" className="w-full" onClick={handleSignOut}>
          Sair
        </Button>
      </div>
    </AccountLayout>
  )
}
