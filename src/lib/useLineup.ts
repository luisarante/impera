import { useCallback, useEffect, useMemo, useState } from 'react'
import { computeDefaultLineup, formation, type Player, type FormationSlot } from '../data/club'

const STORAGE_KEY = 'imperatrice:lineup'

type Lineup = Record<string, string> // slotId → playerId

const slotIds = formation.map((s) => s.id)

/**
 * Valida uma escalação carregada do storage: precisa ter exatamente os slots da
 * formação, ids de jogadores existentes e sem repetição. Caso contrário, descarta.
 */
function isValidLineup(value: unknown, byId: Map<string, Player>): value is Lineup {
  if (!value || typeof value !== 'object') return false
  const map = value as Record<string, unknown>
  const seen = new Set<string>()
  for (const slot of slotIds) {
    const pid = map[slot]
    if (typeof pid !== 'string' || !byId.has(pid) || seen.has(pid)) return false
    seen.add(pid)
  }
  // Não pode ter chaves de slot desconhecidas.
  return Object.keys(map).length === slotIds.length
}

function loadLineup(byId: Map<string, Player>, fallback: Lineup): Lineup {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (isValidLineup(parsed, byId)) return parsed
    }
  } catch {
    /* storage indisponível ou JSON inválido → usa o padrão */
  }
  return { ...fallback }
}

export interface StarterEntry {
  slot: FormationSlot
  player: Player
}

export interface UseLineup {
  /** Titulares com seus slots, na ordem da formação. */
  starters: StarterEntry[]
  /** Reservas (jogadores fora da escalação). */
  bench: Player[]
  /** Coloca um jogador num slot, trocando com quem estiver lá (ou banco). */
  assign: (slotId: string, playerId: string) => void
  /** Volta para a escalação titular padrão. */
  reset: () => void
}

/**
 * Estado da escalação do campo virtual. Recebe o elenco vindo do banco, persiste
 * a montagem do usuário no localStorage e expõe a lógica de troca
 * (titular ⇄ titular e banco → titular).
 */
export function useLineup(squad: Player[]): UseLineup {
  const byId = useMemo(() => new Map(squad.map((p) => [p.id, p])), [squad])
  const defaultLineup = useMemo(() => computeDefaultLineup(squad, formation), [squad])

  const [lineup, setLineup] = useState<Lineup>(() => loadLineup(byId, defaultLineup))

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lineup))
    } catch {
      /* ignora falha de persistência (modo privado etc.) */
    }
  }, [lineup])

  const assign = useCallback((slotId: string, playerId: string) => {
    setLineup((prev) => {
      if (prev[slotId] === playerId) return prev // sem mudança
      const next = { ...prev }
      const fromSlot = slotIds.find((s) => next[s] === playerId)
      const occupant = next[slotId]
      next[slotId] = playerId
      // Veio de outro slot → troca de posições; veio do banco → ocupante é reservado.
      if (fromSlot && fromSlot !== slotId) next[fromSlot] = occupant
      return next
    })
  }, [])

  const reset = useCallback(() => setLineup({ ...defaultLineup }), [defaultLineup])

  const starters = useMemo<StarterEntry[]>(
    () =>
      formation.map((slot) => ({
        slot,
        player: byId.get(lineup[slot.id])!,
      })),
    [lineup, byId],
  )

  const bench = useMemo<Player[]>(() => {
    const inField = new Set(Object.values(lineup))
    return squad.filter((p) => !inField.has(p.id))
  }, [lineup, squad])

  return { starters, bench, assign, reset }
}
