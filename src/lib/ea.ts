/**
 * Camada de acesso aos vínculos EA→jogador (a sincronização em si roda
 * localmente, ver scripts/ea-sync-local.mjs — a EA bloqueia chamadas de
 * servidores de nuvem). Leitura pública; escrita exige sessão de admin.
 */
import { supabase } from './supabase'

export interface EaPlayerMapRow {
  eaPlayerId: string
  personaName: string
  playerId: string | null
}

/** Todos os vínculos EA→jogador conhecidos (mapeados ou não). */
export async function fetchEaPlayerMap(): Promise<EaPlayerMapRow[]> {
  const { data, error } = await supabase
    .from('ea_player_map')
    .select('ea_player_id, ea_persona_name, player_id')
    .order('ea_persona_name')
  if (error) throw new Error('Falha ao carregar os vínculos EA.')
  return (data ?? []).map((r) => ({
    eaPlayerId: r.ea_player_id as string,
    personaName: r.ea_persona_name as string,
    playerId: (r.player_id as string) ?? null,
  }))
}

/** Vincula (ou desvincula, com `playerId: null`) uma persona da EA a um jogador do elenco. */
export async function setEaPlayerMapping(eaPlayerId: string, playerId: string | null): Promise<void> {
  const { error } = await supabase
    .from('ea_player_map')
    .update({ player_id: playerId, updated_at: new Date().toISOString() })
    .eq('ea_player_id', eaPlayerId)
  if (error) throw new Error('Falha ao salvar o vínculo.')
}

/** Números acumulados do clube na EA (histórico completo, não só a temporada atual). */
export interface EaClubStats {
  gamesPlayed: number
  gamesPlayedPlayoff: number
  wins: number
  losses: number
  ties: number
  goals: number
  goalsAgainst: number
  promotions: number
  relegations: number
  bestDivision: number | null
  bestFinishGroup: number | null
  skillRating: number | null
  winStreak: number
  unbeatenStreak: number
  leagueAppearances: number
  titles: number // soma das vezes que terminou em 1º em qualquer divisão
  updatedAt: string
}

export async function fetchEaClubStats(): Promise<EaClubStats | null> {
  const { data, error } = await supabase.from('ea_club_stats').select('*').maybeSingle()
  if (error) throw new Error('Falha ao carregar os números oficiais da EA.')
  if (!data) return null
  const finishes = (data.division_finishes as Record<string, number>) ?? {}
  const titles = Object.values(finishes).reduce((sum, n) => sum + (n ?? 0), 0)
  return {
    gamesPlayed: (data.games_played as number) ?? 0,
    gamesPlayedPlayoff: (data.games_played_playoff as number) ?? 0,
    wins: (data.wins as number) ?? 0,
    losses: (data.losses as number) ?? 0,
    ties: (data.ties as number) ?? 0,
    goals: (data.goals as number) ?? 0,
    goalsAgainst: (data.goals_against as number) ?? 0,
    promotions: (data.promotions as number) ?? 0,
    relegations: (data.relegations as number) ?? 0,
    bestDivision: (data.best_division as number) ?? null,
    bestFinishGroup: (data.best_finish_group as number) ?? null,
    skillRating: (data.skill_rating as number) ?? null,
    winStreak: (data.win_streak as number) ?? 0,
    unbeatenStreak: (data.unbeaten_streak as number) ?? 0,
    leagueAppearances: (data.league_appearances as number) ?? 0,
    titles,
    updatedAt: data.updated_at as string,
  }
}

/** Carreira acumulada de um jogador que já apareceu pelo clube na EA. */
export interface EaPlayerCareer {
  playerId: string | null // resolvido via ea_player_map; null = persona ainda não vinculada
  personaName: string
  gamesPlayed: number
  goals: number
  assists: number
  motm: number
  ratingAvg: number | null
  favoritePosition: string | null
}

/** Carreira somada por jogador (soma personas, caso o jogador já tenha trocado de gamertag). */
export interface PlayerCareerAgg {
  gamesPlayed: number
  goals: number
  assists: number
  motm: number
  ratingAvg: number | null
}

export function aggregateCareerByPlayer(careers: EaPlayerCareer[]): Map<string, PlayerCareerAgg> {
  const byPlayer = new Map<string, PlayerCareerAgg & { ratingWeighted: number }>()
  for (const c of careers) {
    if (!c.playerId) continue
    const cur = byPlayer.get(c.playerId) ?? { gamesPlayed: 0, goals: 0, assists: 0, motm: 0, ratingAvg: null, ratingWeighted: 0 }
    cur.gamesPlayed += c.gamesPlayed
    cur.goals += c.goals
    cur.assists += c.assists
    cur.motm += c.motm
    if (c.ratingAvg != null) cur.ratingWeighted += c.ratingAvg * c.gamesPlayed
    byPlayer.set(c.playerId, cur)
  }
  const result = new Map<string, PlayerCareerAgg>()
  for (const [playerId, v] of byPlayer) {
    result.set(playerId, {
      gamesPlayed: v.gamesPlayed,
      goals: v.goals,
      assists: v.assists,
      motm: v.motm,
      ratingAvg: v.gamesPlayed ? Math.round((v.ratingWeighted / v.gamesPlayed) * 10) / 10 : null,
    })
  }
  return result
}

export async function fetchEaCareerStats(): Promise<EaPlayerCareer[]> {
  const [{ data: careerRows, error: careerErr }, { data: mapRows }] = await Promise.all([
    supabase.from('ea_member_career_stats').select('*').order('goals', { ascending: false }),
    supabase.from('ea_player_map').select('ea_persona_name, player_id'),
  ])
  if (careerErr) throw new Error('Falha ao carregar a carreira dos jogadores.')
  const playerIdByName = new Map(
    (mapRows ?? []).map((r) => [r.ea_persona_name as string, (r.player_id as string) ?? null]),
  )
  return (careerRows ?? []).map((r) => ({
    playerId: playerIdByName.get(r.ea_persona_name as string) ?? null,
    personaName: r.ea_persona_name as string,
    gamesPlayed: (r.games_played as number) ?? 0,
    goals: (r.goals as number) ?? 0,
    assists: (r.assists as number) ?? 0,
    motm: (r.man_of_the_match as number) ?? 0,
    ratingAvg: (r.rating_avg as number) ?? null,
    favoritePosition: (r.favorite_position as string) ?? null,
  }))
}

/** Um "print" dos números do clube num momento — alimenta o gráfico de evolução. */
export interface EaClubStatsSnapshot {
  recordedAt: string
  skillRating: number | null
  wins: number
  losses: number
  ties: number
  goals: number
  goalsAgainst: number
  bestDivision: number | null
}

export async function fetchEaClubStatsHistory(): Promise<EaClubStatsSnapshot[]> {
  const { data, error } = await supabase
    .from('ea_club_stats_history')
    .select('*')
    .order('recorded_at', { ascending: true })
  if (error) throw new Error('Falha ao carregar o histórico de evolução do clube.')
  return (data ?? []).map((r) => ({
    recordedAt: r.recorded_at as string,
    skillRating: (r.skill_rating as number) ?? null,
    wins: (r.wins as number) ?? 0,
    losses: (r.losses as number) ?? 0,
    ties: (r.ties as number) ?? 0,
    goals: (r.goals as number) ?? 0,
    goalsAgainst: (r.goals_against as number) ?? 0,
    bestDivision: (r.best_division as number) ?? null,
  }))
}
