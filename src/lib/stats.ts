/**
 * Estatísticas do TIME (agregadas) para a página /estatisticas.
 * Conta apenas partidas com placar definido, recortadas pela temporada atual
 * (noites com `date >= seasonStart`; se `seasonStart` for nulo, conta todas).
 */
import { supabase } from './supabase'

export interface MatchLite {
  opponent: string
  our: number
  opp: number
  competition: string | null
}

export interface SeasonStats {
  nights: number // noites de jogo no recorte
  played: number // partidas com placar definido
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  winRate: number // 0–100 (%)
  cleanSheets: number // partidas sem sofrer gol
  avgGoalsFor: number // média de gols pró por partida
  biggestWin: MatchLite | null
  biggestLoss: MatchLite | null
  streakLabel: string | null // ex.: "5 vitórias seguidas", "invicto há 8 jogos"
  topAssisters: { playerId: string; assists: number }[] // garçons da temporada (top 5)
}

interface NightRow {
  id: string
  date: string
}
interface MatchRow {
  id: string
  night_id: string
  our_score: number | null
  opp_score: number | null
  opponent: string
  competition: string | null
  sort_order: number
}

/** Retrospecto histórico (todas as partidas com placar, temporadas passadas incluídas). */
export interface RivalStats {
  opponent: string
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
}

/** Maiores rivais (adversários mais enfrentados), do histórico completo. */
export async function fetchRivals(limit = 5): Promise<RivalStats[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('opponent, our_score, opp_score')
    .not('our_score', 'is', null)
    .not('opp_score', 'is', null)
  if (error) throw new Error('Falha ao carregar o histórico de confrontos.')

  const byOpponent = new Map<string, RivalStats>()
  for (const m of data ?? []) {
    const opponent = (m.opponent as string).trim()
    const cur = byOpponent.get(opponent) ?? {
      opponent,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
    }
    const our = m.our_score as number
    const opp = m.opp_score as number
    cur.played += 1
    cur.goalsFor += our
    cur.goalsAgainst += opp
    if (our > opp) cur.wins += 1
    else if (our < opp) cur.losses += 1
    else cur.draws += 1
    byOpponent.set(opponent, cur)
  }

  return [...byOpponent.values()].sort((a, b) => b.played - a.played).slice(0, limit)
}

export async function fetchSeasonStats(seasonStart: string | null): Promise<SeasonStats> {
  let nq = supabase.from('game_nights').select('id,date')
  if (seasonStart) nq = nq.gte('date', seasonStart)
  const { data: nightsData, error: ne } = await nq.order('date', { ascending: true })
  if (ne) throw new Error('Falha ao carregar as noites de jogo.')

  const nights = (nightsData as NightRow[]) ?? []
  const nightIds = nights.map((n) => n.id)
  const dateOf = new Map(nights.map((n) => [n.id, n.date]))

  let matches: MatchRow[] = []
  if (nightIds.length) {
    const { data, error } = await supabase
      .from('matches')
      .select('id,night_id,our_score,opp_score,opponent,competition,sort_order')
      .in('night_id', nightIds)
    if (error) throw new Error('Falha ao carregar as partidas.')
    matches = (data as MatchRow[]) ?? []
  }

  // Partidas decididas (com placar), em ordem cronológica: data da noite → sort_order.
  const decided = matches
    .filter((m) => m.our_score != null && m.opp_score != null)
    .sort((a, b) => {
      const da = dateOf.get(a.night_id) ?? ''
      const db = dateOf.get(b.night_id) ?? ''
      if (da !== db) return da < db ? -1 : 1
      return (a.sort_order ?? 0) - (b.sort_order ?? 0)
    })

  let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0, cleanSheets = 0
  let biggestWin: MatchLite | null = null, bestWinDiff = 0
  let biggestLoss: MatchLite | null = null, worstLossDiff = 0
  const results: Array<'V' | 'E' | 'D'> = []

  for (const m of decided) {
    const our = m.our_score as number
    const opp = m.opp_score as number
    goalsFor += our
    goalsAgainst += opp
    if (opp === 0) cleanSheets++
    const lite: MatchLite = { opponent: m.opponent, our, opp, competition: m.competition ?? null }
    if (our > opp) {
      wins++
      results.push('V')
      if (our - opp > bestWinDiff) { bestWinDiff = our - opp; biggestWin = lite }
    } else if (our < opp) {
      losses++
      results.push('D')
      if (opp - our > worstLossDiff) { worstLossDiff = opp - our; biggestLoss = lite }
    } else {
      draws++
      results.push('E')
    }
  }

  const played = decided.length
  const winRate = played ? Math.round((wins / played) * 100) : 0
  const avgGoalsFor = played ? Math.round((goalsFor / played) * 10) / 10 : 0

  // Sequência atual (a partir da partida mais recente).
  let streakLabel: string | null = null
  if (results.length) {
    const last = results[results.length - 1]
    let run = 0
    for (let i = results.length - 1; i >= 0 && results[i] === last; i--) run++
    const plural = (n: number, s: string, p: string) => (n === 1 ? s : p)
    if (last === 'V') streakLabel = `${run} ${plural(run, 'vitória seguida', 'vitórias seguidas')}`
    else if (last === 'D') streakLabel = `${run} ${plural(run, 'derrota seguida', 'derrotas seguidas')}`
    else {
      let unbeaten = 0
      for (let i = results.length - 1; i >= 0 && results[i] !== 'D'; i--) unbeaten++
      streakLabel =
        unbeaten > 1
          ? `invicto há ${unbeaten} jogos`
          : `${run} ${plural(run, 'empate seguido', 'empates seguidos')}`
    }
  }

  // Garçons da temporada: assistências das partidas do recorte. Partidas
  // sincronizadas da EA (têm linhas em match_player_stats) usam a contagem
  // agregada de lá; as demais (manuais) usam os gols com assist_id.
  const matchIds = matches.map((m) => m.id)
  const assistCount = new Map<string, number>()
  if (matchIds.length) {
    const { data: statsRows } = await supabase
      .from('match_player_stats')
      .select('match_id, ea_player_id, assists')
      .in('match_id', matchIds)
      .gt('assists', 0)
    const eaMatchIds = new Set((statsRows ?? []).map((r) => r.match_id as string))

    if (statsRows?.length) {
      const eaPlayerIds = [...new Set(statsRows.map((r) => r.ea_player_id as string))]
      const { data: mapRows } = await supabase
        .from('ea_player_map')
        .select('ea_player_id, player_id')
        .in('ea_player_id', eaPlayerIds)
      const playerIdOf = new Map((mapRows ?? []).map((r) => [r.ea_player_id as string, r.player_id as string | null]))
      for (const r of statsRows) {
        const pid = playerIdOf.get(r.ea_player_id as string)
        if (!pid) continue
        assistCount.set(pid, (assistCount.get(pid) ?? 0) + ((r.assists as number) ?? 0))
      }
    }

    const manualMatchIds = matchIds.filter((id) => !eaMatchIds.has(id))
    if (manualMatchIds.length) {
      const { data: assistsData } = await supabase
        .from('match_goals')
        .select('assist_id')
        .in('match_id', manualMatchIds)
        .eq('team', 'nos')
        .not('assist_id', 'is', null)
      for (const a of assistsData ?? []) {
        const pid = a.assist_id as string
        assistCount.set(pid, (assistCount.get(pid) ?? 0) + 1)
      }
    }
  }
  const topAssisters = [...assistCount.entries()]
    .map(([playerId, assists]) => ({ playerId, assists }))
    .sort((a, b) => b.assists - a.assists)
    .slice(0, 5)

  return {
    nights: nights.length,
    played,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    goalDiff: goalsFor - goalsAgainst,
    winRate,
    cleanSheets,
    avgGoalsFor,
    biggestWin,
    biggestLoss,
    streakLabel,
    topAssisters,
  }
}
