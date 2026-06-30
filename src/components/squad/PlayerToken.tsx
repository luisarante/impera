import { useState } from 'react'
import type { Player } from '../../data/club'

interface PlayerTokenProps {
  player: Player
  variant: 'field' | 'bench'
  dragging?: boolean
  onOpen?: () => void
  onDragStart?: () => void
  onDragEnd?: () => void
}

/**
 * Ficha arrastável de um jogador — usada tanto no campo quanto no banco.
 * Clique abre o modal de detalhes; arrastar troca a escalação.
 * Mostra a foto real (pilares) ou um disco com o número da camisa.
 */
export default function PlayerToken({
  player,
  variant,
  dragging = false,
  onOpen,
  onDragStart,
  onDragEnd,
}: PlayerTokenProps) {
  const [photoOk, setPhotoOk] = useState(Boolean(player.photo))
  const accent = player.accent === 'gold' ? 'var(--color-gold)' : 'var(--color-accent)'

  return (
    <button
      type="button"
      draggable
      data-cursor="Ver ficha"
      onClick={onOpen}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', player.id)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart?.()
      }}
      onDragEnd={() => onDragEnd?.()}
      className={`player-token ${variant === 'bench' ? 'player-token--bench' : 'player-token--field'} ${
        dragging ? 'is-dragging' : ''
      }`}
      style={{ '--token-accent': accent } as React.CSSProperties}
    >
      <span className="player-token__disc">
        {photoOk && player.photo ? (
          <img
            src={player.photo}
            alt={player.name}
            draggable={false}
            onError={() => setPhotoOk(false)}
          />
        ) : (
          <span className="player-token__num">{player.number.replace('#', '')}</span>
        )}
      </span>
      <span className="player-token__name">{player.name}</span>
      <span className="player-token__role">{player.role}</span>
    </button>
  )
}
