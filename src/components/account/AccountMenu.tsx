import { Link } from 'react-router-dom'
import { useAuth } from '../../admin/auth'
import UserAvatar from '../ui/UserAvatar'

/**
 * Entrada de conta no nav: avatar + nome (leva ao perfil) quando logado;
 * senão um botão "Entrar". Visual discreto, alinhado ao nav do site.
 */
export default function AccountMenu() {
  const { session, profile, loading } = useAuth()

  if (loading) return null

  if (!session) {
    return (
      <Link to="/entrar" className="home-nav__account home-nav__account--in" data-cursor="Entrar">
        Entrar
      </Link>
    )
  }

  const name = profile?.displayName ?? session.user.email ?? 'Conta'
  return (
    <Link to="/conta" className="home-nav__account" data-cursor="Conta" title={name}>
      <UserAvatar name={name} avatarUrl={profile?.avatarUrl} size="xs" />
      <span className="home-nav__account-name">{name}</span>
    </Link>
  )
}
