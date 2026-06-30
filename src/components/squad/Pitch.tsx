import { useState } from 'react'
import type { Player } from '../../data/club'
import type { StarterEntry } from '../../lib/useLineup'
import PlayerToken from './PlayerToken'

interface PitchProps {
  starters: StarterEntry[]
  draggingId: string | null
  /** Abrir o modal de detalhes de um jogador. */
  onOpenPlayer: (player: Player) => void
  /** Soltar um jogador (por id) num slot. */
  onDropToSlot: (slotId: string, playerId: string) => void
  onDragStart: (playerId: string) => void
  onDragEnd: () => void
}

/**
 * O campo virtual: gramado desenhado em CSS com os 11 titulares posicionados
 * pela formação. Cada posição é alvo de drop (arrastar) para montar a escalação.
 */
export default function Pitch({
  starters,
  draggingId,
  onOpenPlayer,
  onDropToSlot,
  onDragStart,
  onDragEnd,
}: PitchProps) {
  const [overSlot, setOverSlot] = useState<string | null>(null)

  return (
    <div className="pitch" role="group" aria-label="Campo — escalação titular">
      {/* Marcações do campo */}
      <span className="pitch__line pitch__line--mid" aria-hidden />
      <span className="pitch__circle" aria-hidden />
      <span className="pitch__box pitch__box--top" aria-hidden />
      <span className="pitch__box pitch__box--bottom" aria-hidden />

      {starters.map(({ slot, player }) => (
        <div
          key={slot.id}
          className={`pitch__slot ${overSlot === slot.id ? 'is-drop-target' : ''}`}
          style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
          onDragOver={(e) => {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
            if (overSlot !== slot.id) setOverSlot(slot.id)
          }}
          onDragLeave={() => setOverSlot((s) => (s === slot.id ? null : s))}
          onDrop={(e) => {
            e.preventDefault()
            setOverSlot(null)
            const pid = e.dataTransfer.getData('text/plain')
            if (pid) onDropToSlot(slot.id, pid)
          }}
        >
          <PlayerToken
            player={player}
            variant="field"
            dragging={draggingId === player.id}
            onOpen={() => onOpenPlayer(player)}
            onDragStart={() => onDragStart(player.id)}
            onDragEnd={onDragEnd}
          />
        </div>
      ))}
    </div>
  )
}
