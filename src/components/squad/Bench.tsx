import type { Player } from '../../data/club'
import PlayerToken from './PlayerToken'

interface BenchProps {
  bench: Player[]
  draggingId: string | null
  onOpenPlayer: (player: Player) => void
  onDragStart: (playerId: string) => void
  onDragEnd: () => void
}

/**
 * Banco de reservas — fichas arrastáveis que podem entrar na escalação ao serem
 * soltas numa posição do campo (ou via botão "Escalar" no modal do jogador).
 */
export default function Bench({
  bench,
  draggingId,
  onOpenPlayer,
  onDragStart,
  onDragEnd,
}: BenchProps) {
  return (
    <section className="bench" aria-label="Banco de reservas">
      <header className="bench__head">
        <span className="eyebrow">Banco de Reservas</span>
        <span className="bench__count">{bench.length}</span>
      </header>

      {bench.length === 0 ? (
        <p className="bench__empty">Todo o elenco está em campo.</p>
      ) : (
        <div className="bench__grid">
          {bench.map((player) => (
            <PlayerToken
              key={player.id}
              player={player}
              variant="bench"
              dragging={draggingId === player.id}
              onOpen={() => onOpenPlayer(player)}
              onDragStart={() => onDragStart(player.id)}
              onDragEnd={onDragEnd}
            />
          ))}
        </div>
      )}
    </section>
  )
}
