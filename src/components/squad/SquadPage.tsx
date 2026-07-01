import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { gsap, prefersReducedMotion } from '../../lib/gsap'
import { useLineup } from '../../lib/useLineup'
import { useClubData } from '../../lib/data/ClubDataContext'
import type { Player } from '../../data/club'
import Pitch from './Pitch'
import Bench from './Bench'

/**
 * PÁGINA DO ELENCO (/elenco) — o board tático do Imperatrice FC.
 * Mostra a escalação titular (4-3-3) e, logo abaixo, o banco de reservas.
 * Arrastar troca a escalação; clicar num jogador abre a página dedicada dele
 * (/elenco/:id). A montagem é persistida no localStorage via `useLineup`.
 */
export default function SquadPage() {
  const navigate = useNavigate()
  const { club, squad } = useClubData()
  const { starters, bench, assign, reset } = useLineup(squad)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const goBack = useCallback(() => navigate('/'), [navigate])

  // Entra no topo da página.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // Volta para a home no Esc.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') goBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goBack])

  // Animação de entrada.
  useLayoutEffect(() => {
    if (prefersReducedMotion() || !rootRef.current) return
    const ctx = gsap.context(() => {
      gsap.from('[data-anim="head"]', { y: -24, opacity: 0, duration: 0.5, ease: 'power3.out' })
      gsap.from('.pitch', { opacity: 0, scale: 0.96, duration: 0.6, ease: 'power3.out' })
      gsap.from('.pitch__slot', {
        opacity: 0,
        scale: 0.6,
        duration: 0.4,
        ease: 'back.out(1.6)',
        stagger: 0.03,
        delay: 0.15,
      })
      gsap.from('.bench', { y: 24, opacity: 0, duration: 0.5, ease: 'power3.out', delay: 0.2 })
    }, rootRef)
    return () => ctx.revert()
  }, [])

  const onDropToSlot = useCallback(
    (slotId: string, playerId: string) => {
      assign(slotId, playerId)
      setDraggingId(null)
    },
    [assign],
  )

  // Clicar num jogador leva à página dedicada dele.
  const openPlayer = useCallback(
    (player: Player) => navigate(`/elenco/${player.id}`),
    [navigate],
  )

  return (
    <div ref={rootRef} className="squad-page" aria-label="Elenco completo do Imperatrice FC">
      <header className="squad-head" data-anim="head">
        <button type="button" className="squad-back" data-cursor="Voltar" onClick={goBack}>
          ← Voltar
        </button>
        <div className="squad-title">
          <span className="eyebrow">Tática · {club.name}</span>
          <h2>Elenco Completo</h2>
        </div>
        <button type="button" className="squad-reset" data-cursor="Padrão" onClick={reset}>
          Resetar
        </button>
      </header>

      <p className="squad-hint">
        Clique num jogador para abrir a ficha e os comentários. Arraste um reserva para uma posição
        do campo para escalá-lo.
      </p>

      <div className="squad-body">
        <Pitch
          starters={starters}
          draggingId={draggingId}
          onOpenPlayer={openPlayer}
          onDropToSlot={onDropToSlot}
          onDragStart={setDraggingId}
          onDragEnd={() => setDraggingId(null)}
        />
        <Bench
          bench={bench}
          draggingId={draggingId}
          onOpenPlayer={openPlayer}
          onDragStart={setDraggingId}
          onDragEnd={() => setDraggingId(null)}
        />
      </div>
    </div>
  )
}
