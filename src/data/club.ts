/**
 * TIPOS e configuração estática do clube.
 *
 * Os DADOS (elenco, notícias, galeria, kits, marcos, números) agora vivem no
 * banco (Supabase) e são carregados em runtime por `ClubDataContext`. Este
 * arquivo guarda apenas os tipos compartilhados, o layout da formação tática
 * (que é configuração visual, não conteúdo editável) e o utilitário que monta
 * a escalação titular padrão a partir do elenco vindo do banco.
 */

export interface Club {
  name: string
  badgeName: string
  tagline: string
  eternalMotto: string
}

export interface BigNumber {
  value: string // valor textual ou numérico
  numeric?: number // se animável por contador
  prefix?: string
  suffix?: string
  label: string
  highlight?: 'gold' | 'paper'
}

/** Códigos de posição usados para posicionar o jogador no campo virtual. */
export type PositionCode = 'GK' | 'LB' | 'CB' | 'RB' | 'CM' | 'LW' | 'ST' | 'RW'

export interface Player {
  id: string
  name: string
  number: string
  position: string
  role: PositionCode // posição tática (campo virtual)
  starter?: boolean // faz parte da escalação titular padrão
  isPillar?: boolean // é um dos pilares (destaque na home, com foto)
  dilemma?: string // frase em itálico (só os pilares têm)
  description?: string
  accent?: 'accent' | 'gold'
  photo?: string | null // URL pública da foto (Storage); ausente → disco com número
}

export interface NewsItem {
  id: string
  kicker: string // chapéu / categoria
  headline: string
  lead: string
  author: string // quem escreveu a matéria
  publishedAt: string // ISO 8601 — data de publicação
  cover?: string // URL da imagem de capa (Storage)
  html: string // corpo rico (HTML do editor; sanitizado na renderização)
  body?: string[] // legado: corpo antigo em parágrafos
  verified?: boolean
  featured?: boolean
}

export interface Milestone {
  id: string
  date: string // ex.: "DEZ — 2024"
  title: string
  text: string
}

export interface Kit {
  id: string
  label: string
  name: string
  description: string
  price: string
  primary: string // cor base para o placeholder visual
  secondary: string
  image?: string // foto frontal real; ausente → placeholder estilizado
  imageBack?: string // foto das costas; ausente → painel com cor do kit
}

export interface GalleryPhoto {
  id: string
  src: string // URL pública (Storage)
  caption: string
}

/** Um slot posicional do campo virtual (visão vertical, % do gramado). */
export interface FormationSlot {
  id: string // identificador do slot (ex.: 'gk', 'cb-l')
  label: PositionCode
  x: number // 0–100 (esquerda → direita)
  y: number // 0–100 (ataque no topo → gol embaixo)
}

/** Formação 4-3-3 — gol embaixo (y alto), ataque no topo (y baixo). */
export const formation: FormationSlot[] = [
  { id: 'gk', label: 'GK', x: 50, y: 90 },
  { id: 'lb', label: 'LB', x: 16, y: 70 },
  { id: 'cb-l', label: 'CB', x: 38, y: 74 },
  { id: 'cb-r', label: 'CB', x: 62, y: 74 },
  { id: 'rb', label: 'RB', x: 84, y: 70 },
  { id: 'cm-l', label: 'CM', x: 28, y: 48 },
  { id: 'cm-c', label: 'CM', x: 50, y: 44 },
  { id: 'cm-r', label: 'CM', x: 72, y: 48 },
  { id: 'lw', label: 'LW', x: 20, y: 18 },
  { id: 'st', label: 'ST', x: 50, y: 12 },
  { id: 'rw', label: 'RW', x: 80, y: 18 },
]

/**
 * Monta a escalação titular padrão: associa cada slot a um jogador `starter`,
 * casando primeiro por `role` exato e consumindo os titulares na ordem do elenco.
 */
export function computeDefaultLineup(
  squad: Player[],
  slots: FormationSlot[] = formation,
): Record<string, string> {
  const map: Record<string, string> = {}
  const byId = new Map(squad.map((p) => [p.id, p]))
  const pool = squad.filter((p) => p.starter).map((p) => p.id)
  const taken = new Set<string>()

  const grab = (predicate: (p: Player) => boolean): string | undefined => {
    const id = pool.find((pid) => !taken.has(pid) && predicate(byId.get(pid)!))
    if (id) taken.add(id)
    return id
  }

  for (const slot of slots) {
    // 1ª tentativa: jogador com role idêntico ao slot; senão, qualquer titular livre.
    const id = grab((p) => p.role === slot.label) ?? grab(() => true)
    if (id) map[slot.id] = id
  }
  return map
}
