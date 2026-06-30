import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase, publicImageUrl } from '../supabase'
import type {
  BigNumber,
  Club,
  GalleryPhoto,
  Kit,
  Milestone,
  NewsItem,
  Player,
} from '../../data/club'

/** Conteúdo do clube carregado do banco, já mapeado para os tipos da UI. */
export interface ClubData {
  club: Club
  squad: Player[] // elenco inteiro (pilares + restante)
  pillars: Player[] // só os pilares (destaque na home)
  news: NewsItem[]
  gallery: GalleryPhoto[]
  kits: Kit[]
  milestones: Milestone[]
  bigNumbers: BigNumber[]
  heroUrl: string | null // imagem de fundo da Hero (bucket "hero")
}

interface ClubDataState {
  data: ClubData | null
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

const ClubDataCtx = createContext<ClubDataState | null>(null)

// ── Mapeamento linha do banco (snake_case) → tipo da UI ──────────────────────

function mapPlayer(row: Record<string, unknown>): Player {
  return {
    id: row.id as string,
    name: row.name as string,
    number: row.number as string,
    position: row.position as string,
    role: row.role as Player['role'],
    starter: (row.starter as boolean) ?? false,
    isPillar: (row.is_pillar as boolean) ?? false,
    dilemma: (row.dilemma as string) ?? undefined,
    description: (row.description as string) ?? undefined,
    accent: (row.accent as Player['accent']) ?? undefined,
    photo: publicImageUrl('players', row.photo_path as string | null),
  }
}

function mapNews(row: Record<string, unknown>): NewsItem {
  return {
    id: row.id as string,
    kicker: row.kicker as string,
    headline: row.headline as string,
    lead: row.lead as string,
    author: (row.author as string) ?? '',
    publishedAt: (row.published_at as string) ?? '',
    cover: publicImageUrl('news', row.cover_path as string | null) ?? undefined,
    html: (row.content_html as string) ?? '',
    body: (row.body as string[]) ?? [],
    verified: (row.verified as boolean) ?? false,
    featured: (row.featured as boolean) ?? false,
  }
}

function mapGallery(row: Record<string, unknown>): GalleryPhoto {
  return {
    id: row.id as string,
    src: publicImageUrl(row.bucket as string, row.image_path as string) ?? '',
    caption: (row.caption as string) ?? '',
  }
}

function mapKit(row: Record<string, unknown>): Kit {
  return {
    id: row.id as string,
    label: row.label as string,
    name: row.name as string,
    description: row.description as string,
    price: row.price as string,
    primary: row.primary_color as string,
    secondary: row.secondary_color as string,
    image: publicImageUrl('kits', row.image_path as string | null) ?? undefined,
    imageBack: publicImageUrl('kits', row.image_back_path as string | null) ?? undefined,
  }
}

function mapMilestone(row: Record<string, unknown>): Milestone {
  return {
    id: row.id as string,
    date: row.date_label as string,
    title: row.title as string,
    text: row.text_body as string,
  }
}

function mapBigNumber(row: Record<string, unknown>): BigNumber {
  return {
    value: row.value as string,
    numeric: (row.numeric_value as number) ?? undefined,
    prefix: (row.prefix as string) ?? undefined,
    suffix: (row.suffix as string) ?? undefined,
    label: row.label as string,
    highlight: (row.highlight as BigNumber['highlight']) ?? undefined,
  }
}

/**
 * Resolve a imagem da Hero a partir do bucket "hero": pega o objeto chamado
 * "hero" (com ou sem extensão); se não houver, a primeira imagem do bucket.
 * Tolerante a falhas — devolve null e a Hero cai no asset local de fallback.
 */
async function loadHeroUrl(): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('hero')
    .list('', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } })
  if (error || !data) return null
  const images = data.filter((o) => /\.(jpe?g|png|webp|avif|gif)$/i.test(o.name))
  const pick =
    images.find((o) => /^hero\./i.test(o.name)) ??
    data.find((o) => /^hero$/i.test(o.name)) ??
    images[0]
  return pick ? publicImageUrl('hero', pick.name) : null
}

async function loadClubData(): Promise<ClubData> {
  const [club, players, newsRes, gallery, kits, milestones, bigNumbers, heroUrl] = await Promise.all([
    supabase.from('club').select('*').eq('id', 1).single(),
    supabase.from('players').select('*').order('sort_order'),
    // Ordena por created_at (sempre existe); a data de publicação refina no cliente.
    supabase.from('news').select('*').order('created_at', { ascending: false }),
    supabase.from('gallery_photos').select('*').order('sort_order'),
    supabase.from('kits').select('*').order('sort_order'),
    supabase.from('milestones').select('*').order('sort_order'),
    supabase.from('big_numbers').select('*').order('sort_order'),
    loadHeroUrl(),
  ])

  const firstError =
    club.error || players.error || newsRes.error || gallery.error || kits.error || milestones.error || bigNumbers.error
  if (firstError) throw firstError

  const c = club.data as Record<string, unknown>
  const squad = (players.data ?? []).map(mapPlayer)

  // Notícias mais recentes primeiro (por data de publicação quando disponível).
  const news = (newsRes.data ?? [])
    .map(mapNews)
    .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''))

  return {
    club: {
      name: c.name as string,
      badgeName: c.badge_name as string,
      tagline: c.tagline as string,
      eternalMotto: c.eternal_motto as string,
    },
    squad,
    pillars: squad.filter((p) => p.isPillar),
    news,
    gallery: (gallery.data ?? []).map(mapGallery),
    kits: (kits.data ?? []).map(mapKit),
    milestones: (milestones.data ?? []).map(mapMilestone),
    bigNumbers: (bigNumbers.data ?? []).map(mapBigNumber),
    heroUrl,
  }
}

/**
 * Carrega TODO o conteúdo do clube uma vez e o disponibiliza via contexto.
 * As rotas só renderizam depois que os dados chegam (ver `App`), de modo que
 * cada seção recebe os arrays já populados — preservando as animações GSAP que
 * dependem do tamanho das listas na montagem.
 */
export function ClubDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ClubData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await loadClubData())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar os dados do clube.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return (
    <ClubDataCtx.Provider value={{ data, loading, error, reload }}>{children}</ClubDataCtx.Provider>
  )
}

/** Estado bruto do carregamento (loading/error/reload). */
export function useClubDataState(): ClubDataState {
  const ctx = useContext(ClubDataCtx)
  if (!ctx) throw new Error('useClubDataState deve ser usado dentro de <ClubDataProvider>')
  return ctx
}

/**
 * Dados já carregados do clube. Só pode ser chamado por componentes renderizados
 * depois do gate de carregamento (rotas dentro de `App`).
 */
export function useClubData(): ClubData {
  const { data } = useClubDataState()
  if (!data) throw new Error('useClubData usado antes dos dados carregarem')
  return data
}
