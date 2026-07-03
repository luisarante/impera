import { Link } from 'react-router-dom'

/**
 * Nome de jogador clicável → página dedicada (`/elenco/:id`). Herda a cor do
 * contexto (funciona sobre texto claro, cinza, dourado…) e destaca no hover.
 * Use para referências **estruturadas** (goleadores, craque etc.); para nomes
 * citados em texto livre, ver `linkifyPlayers`.
 */
export default function PlayerLink({
  id,
  name,
  className = '',
}: {
  id: string
  name: string
  className?: string
}) {
  return (
    <Link
      to={`/elenco/${id}`}
      className={`underline decoration-dotted decoration-[color-mix(in_srgb,currentColor_45%,transparent)] underline-offset-2 transition-colors hover:text-[var(--color-accent)] hover:decoration-[var(--color-accent)] ${className}`}
    >
      {name}
    </Link>
  )
}
