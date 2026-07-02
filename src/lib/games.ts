/**
 * Camada de acesso às NOITES DE JOGO (partidas, craque da noite e eventos).
 * Conteúdo é público; o voto de craque é anônimo (1 por visitante/noite,
 * trocável via upsert) usando o mesmo `visitor_id` das curtidas (ver visitor.ts).
 */
import { supabase } from './supabase'
import { getVisitorId } from './visitor'

export type MatchStatus = 'agendada' | 'ao_vivo' | 'encerrada'

/** Estado da noite: em andamento (editável) ou encerrada (libera o craque). */
export type NightStatus = 'em_andamento' | 'encerrada'

/** Estado da votação de craque: ainda não aberta, aberta ou encerrada (apurada). */
export type MvpStatus = 'nao_iniciada' | 'aberta' | 'encerrada'

export interface GameNight {
  id: string
  title: string
  date: string // ISO date (yyyy-mm-dd)
  subtitle: string | null
  status: NightStatus
  mvpStatus: MvpStatus
  mvpWinnerId: string | null // craque eleito (definido quando a votação encerra)
}

export interface Goal {
  playerId: string
  minute: number | null // minuto do gol (opcional)
}

export interface Match {
  id: string
  opponent: string
  ourScore: number | null
  oppScore: number | null
  competition: string | null
  status: MatchStatus
  goals: Goal[] // gols do Imperatrice (só elenco), em ordem de minuto
}

export interface NightEvent {
  id: string
  timeLabel: string | null
  title: string
  description: string | null
}

export interface NightData {
  night: GameNight
  matches: Match[]
  events: NightEvent[]
  candidateIds: string[] // ids dos jogadores que entraram em campo (candidatos)
  tally: Record<string, number> // playerId -> nº de votos
  totalVotes: number
  myVote: string | null // playerId em que este visitante votou
}

function mapNight(row: Record<string, unknown>): GameNight {
  return {
    id: row.id as string,
    title: row.title as string,
    date: row.date as string,
    subtitle: (row.subtitle as string) ?? null,
    status: (row.status as NightStatus) ?? 'em_andamento',
    mvpStatus: (row.mvp_status as MvpStatus) ?? 'nao_iniciada',
    mvpWinnerId: (row.mvp_winner_id as string) ?? null,
  }
}

function mapMatch(row: Record<string, unknown>): Match {
  return {
    id: row.id as string,
    opponent: row.opponent as string,
    ourScore: (row.our_score as number) ?? null,
    oppScore: (row.opp_score as number) ?? null,
    competition: (row.competition as string) ?? null,
    status: (row.status as MatchStatus) ?? 'encerrada',
    goals: [],
  }
}

function mapEvent(row: Record<string, unknown>): NightEvent {
  return {
    id: row.id as string,
    timeLabel: (row.time_label as string) ?? null,
    title: row.title as string,
    description: (row.description as string) ?? null,
  }
}

/** Lista resumida de noites (para o seletor de histórico), da mais recente. */
export async function fetchNights(): Promise<GameNight[]> {
  const { data, error } = await supabase
    .from('game_nights')
    .select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw new Error('Falha ao carregar as noites de jogo.')
  return (data ?? []).map(mapNight)
}

/** Noite completa: por `id`, ou a mais recente quando `id` não é informado. */
export async function fetchNight(id?: string): Promise<NightData | null> {
  const base = supabase.from('game_nights').select('*')
  const { data: nightRow, error } = id
    ? await base.eq('id', id).maybeSingle()
    : await base
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
  if (error) throw new Error('Falha ao carregar a noite de jogo.')
  if (!nightRow) return null

  const night = mapNight(nightRow as Record<string, unknown>)

  const [matches, events, candidates, votes] = await Promise.all([
    supabase.from('matches').select('*').eq('night_id', night.id).order('sort_order'),
    supabase.from('night_events').select('*').eq('night_id', night.id).order('sort_order'),
    supabase.from('mvp_candidates').select('player_id').eq('night_id', night.id).order('sort_order'),
    supabase.from('mvp_votes').select('player_id, visitor_id').eq('night_id', night.id),
  ])

  const mappedMatches = (matches.data ?? []).map(mapMatch)

  // Gols do Imperatrice por partida, em ordem de minuto (nulos por último).
  const matchIds = mappedMatches.map((m) => m.id)
  if (matchIds.length) {
    const { data: goals } = await supabase
      .from('match_goals')
      .select('match_id, player_id, minute')
      .in('match_id', matchIds)
      .order('minute', { ascending: true, nullsFirst: false })
      .order('sort_order')
    const byMatch = new Map<string, Goal[]>()
    for (const g of goals ?? []) {
      const mid = g.match_id as string
      if (!byMatch.has(mid)) byMatch.set(mid, [])
      byMatch.get(mid)!.push({ playerId: g.player_id as string, minute: (g.minute as number) ?? null })
    }
    for (const m of mappedMatches) m.goals = byMatch.get(m.id) ?? []
  }

  const tally: Record<string, number> = {}
  let myVote: string | null = null
  const visitor = getVisitorId()
  for (const v of votes.data ?? []) {
    const pid = v.player_id as string
    tally[pid] = (tally[pid] ?? 0) + 1
    if (v.visitor_id === visitor) myVote = pid
  }

  return {
    night,
    matches: mappedMatches,
    events: (events.data ?? []).map(mapEvent),
    candidateIds: (candidates.data ?? []).map((c) => c.player_id as string),
    tally,
    totalVotes: (votes.data ?? []).length,
    myVote,
  }
}

/** Vota (ou troca o voto) no craque da noite. Um voto por visitante/noite. */
export async function castMvpVote(nightId: string, playerId: string): Promise<void> {
  const visitor = getVisitorId()
  const { error } = await supabase
    .from('mvp_votes')
    .upsert(
      { night_id: nightId, player_id: playerId, visitor_id: visitor },
      { onConflict: 'night_id,visitor_id' },
    )
  if (error) throw new Error('Falha ao registrar o voto.')
}

// ── Ações do admin sobre o ciclo de vida da noite ───────────────────────────
// (Escritas exigem sessão autenticada — protegidas pelo RLS `write_auth`.)

/** Encerra a noite de jogos — habilita abrir a votação de craque. */
export async function closeNight(nightId: string): Promise<void> {
  const { error } = await supabase.from('game_nights').update({ status: 'encerrada' }).eq('id', nightId)
  if (error) throw new Error('Falha ao encerrar a noite.')
}

/** Reabre a noite (volta a "em andamento"). */
export async function reopenNight(nightId: string): Promise<void> {
  const { error } = await supabase
    .from('game_nights')
    .update({ status: 'em_andamento' })
    .eq('id', nightId)
  if (error) throw new Error('Falha ao reabrir a noite.')
}

/** Abre a votação de craque (some qualquer craque previamente apurado). */
export async function openMvpVoting(nightId: string): Promise<void> {
  const { error } = await supabase
    .from('game_nights')
    .update({ mvp_status: 'aberta', mvp_winner_id: null })
    .eq('id', nightId)
  if (error) throw new Error('Falha ao abrir a votação.')
}

/**
 * Encerra a votação: apura o craque (jogador mais votado, empate resolvido pela
 * ordem dos candidatos) e o salva na noite. Devolve o id do craque (ou null).
 */
export async function closeMvpVoting(nightId: string): Promise<string | null> {
  const [{ data: votes }, { data: cands }] = await Promise.all([
    supabase.from('mvp_votes').select('player_id').eq('night_id', nightId),
    supabase
      .from('mvp_candidates')
      .select('player_id, sort_order')
      .eq('night_id', nightId)
      .order('sort_order'),
  ])

  const tally = new Map<string, number>()
  for (const v of votes ?? []) {
    const pid = v.player_id as string
    tally.set(pid, (tally.get(pid) ?? 0) + 1)
  }

  let winner: string | null = null
  let best = 0
  for (const c of cands ?? []) {
    const n = tally.get(c.player_id as string) ?? 0
    if (n > best) {
      best = n
      winner = c.player_id as string
    }
  }

  const { error } = await supabase
    .from('game_nights')
    .update({ mvp_status: 'encerrada', mvp_winner_id: winner })
    .eq('id', nightId)
  if (error) throw new Error('Falha ao encerrar a votação.')
  return winner
}

/** Nº de vezes que o jogador foi eleito craque da noite (votações encerradas). */
export async function fetchMvpTitleCount(playerId: string): Promise<number> {
  const { count, error } = await supabase
    .from('game_nights')
    .select('id', { count: 'exact', head: true })
    .eq('mvp_status', 'encerrada')
    .eq('mvp_winner_id', playerId)
  if (error) throw new Error('Falha ao carregar os títulos de craque.')
  return count ?? 0
}
