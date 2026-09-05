import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClubData } from '../../lib/data/ClubDataContext'
import { fetchRivals, fetchSeasonStats, type MatchLite, type RivalStats, type SeasonStats } from '../../lib/stats'
import {
  fetchEaCareerStats,
  fetchEaClubStats,
  fetchEaClubStatsHistory,
  type EaClubStats,
  type EaClubStatsSnapshot,
  type EaPlayerCareer,
} from '../../lib/ea'
import SkillRatingChart from './SkillRatingChart'
import PlayerLink from '../ui/PlayerLink'

function StatTile({ label, value, gold }: { label: string; value: string | number; gold?: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--hairline)] bg-white/[0.02] px-3 py-4 text-center">
      <div className={`text-3xl font-bold tabular-nums ${gold ? 'text-[var(--color-gold)]' : ''}`}>{value}</div>
      <div className="mt-1.5 text-[0.62rem] uppercase tracking-[0.14em] text-[var(--text-50)]">{label}</div>
    </div>
  )
}

function HighlightMatch({
  title,
  match,
  tone,
  clubName,
}: {
  title: string
  match: MatchLite | null
  tone: 'gold' | 'alert'
  clubName: string
}) {
  const color = tone === 'gold' ? 'var(--color-gold)' : 'var(--color-alert)'
  return (
    <div className="rounded-xl border border-[var(--hairline)] bg-white/[0.02] p-5">
      <h4 className="text-sm uppercase tracking-[0.14em]" style={{ color }}>
        {title}
      </h4>
      {match ? (
        <>
          <p className="mt-3 text-center text-lg font-bold tabular-nums">
            {clubName} <span style={{ color }}>{match.our}</span>
            <span className="mx-2 text-[var(--text-30)]">×</span>
            {match.opp} {match.opponent}
          </p>
          {match.competition && (
            <p className="mt-1 text-center text-xs text-[var(--text-50)]">{match.competition}</p>
          )}
        </>
      ) : (
        <p className="mt-3 text-sm text-[var(--text-50)]">Ainda não houve.</p>
      )}
    </div>
  )
}

/**
 * PÁGINA DE ESTATÍSTICAS (/estatisticas).
 * Números do TIME (agregados) só da temporada atual (recorte por `club.seasonStart`).
 * Referencia a página do elenco — sem detalhar jogadores aqui.
 */
export default function StatsPage() {
  const navigate = useNavigate()
  const { club, squad } = useClubData()
  const [stats, setStats] = useState<SeasonStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [eaClub, setEaClub] = useState<EaClubStats | null>(null)
  const [eaCareers, setEaCareers] = useState<EaPlayerCareer[]>([])
  const [eaHistory, setEaHistory] = useState<EaClubStatsSnapshot[]>([])
  const [rivals, setRivals] = useState<RivalStats[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setStats(await fetchSeasonStats(club.seasonStart))
    } catch {
      setError('Não foi possível carregar as estatísticas.')
    } finally {
      setLoading(false)
    }
    // Números oficiais da EA (histórico completo) — extra, não bloqueia a página.
    try {
      const [clubStats, careers, history, rivalsList] = await Promise.all([
        fetchEaClubStats(),
        fetchEaCareerStats(),
        fetchEaClubStatsHistory(),
        fetchRivals(),
      ])
      setEaClub(clubStats)
      setEaCareers(careers)
      setEaHistory(history)
      setRivals(rivalsList)
    } catch {
      // painel opcional — falha silenciosa não deve travar o resto da página
    }
  }, [club.seasonStart])

  useEffect(() => {
    window.scrollTo(0, 0)
    load()
  }, [load])

  const seasonLabel = club.seasonLabel || 'Temporada atual'

  return (
    <div className="news-page">
      <header className="squad-head">
        <button type="button" className="squad-back" data-cursor="Início" onClick={() => navigate('/')}>
          ← Início
        </button>
        <div className="squad-title">
          <span className="eyebrow">Estatísticas · {club.name}</span>
          <h2>Números do Time</h2>
        </div>
        <span aria-hidden />
      </header>

      <div className="mx-auto w-full max-w-4xl px-[6vw] pb-16">
        <p className="mb-10 text-sm uppercase tracking-[0.16em] text-[var(--color-accent)]">{seasonLabel}</p>

        {loading ? (
          <p className="py-16 text-center text-[var(--text-50)]">Carregando…</p>
        ) : error ? (
          <p className="py-16 text-center text-[var(--color-alert)]">{error}</p>
        ) : !stats || stats.played === 0 ? (
          <p className="py-16 text-center text-[var(--text-50)]">
            Ainda não há partidas registradas nesta temporada.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Jogos" value={stats.played} />
              <StatTile label="Vitórias" value={stats.wins} gold />
              <StatTile label="Empates" value={stats.draws} />
              <StatTile label="Derrotas" value={stats.losses} />
              <StatTile label="Aproveitamento" value={`${stats.winRate}%`} gold />
              <StatTile label="Gols pró" value={stats.goalsFor} />
              <StatTile label="Gols contra" value={stats.goalsAgainst} />
              <StatTile label="Saldo" value={`${stats.goalDiff >= 0 ? '+' : ''}${stats.goalDiff}`} />
              <StatTile label="Média gols/jogo" value={stats.avgGoalsFor.toLocaleString('pt-BR')} />
              <StatTile label="Jogos sem sofrer" value={stats.cleanSheets} />
              <StatTile label="Noites disputadas" value={stats.nights} />
            </div>

            {stats.streakLabel && (
              <div className="mt-6 flex flex-col items-center rounded-xl border border-[color-mix(in_srgb,var(--color-gold)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-gold)_5%,transparent)] px-5 py-5 text-center">
                <span className="eyebrow" style={{ color: 'var(--color-gold)' }}>
                  Sequência atual
                </span>
                <p className="mt-2 text-xl font-bold uppercase tracking-[0.02em]">{stats.streakLabel}</p>
              </div>
            )}

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <HighlightMatch title="Maior goleada" match={stats.biggestWin} tone="gold" clubName={club.name} />
              <HighlightMatch title="Maior derrota" match={stats.biggestLoss} tone="alert" clubName={club.name} />
            </div>

            {stats.topAssisters.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm uppercase tracking-[0.14em] text-[var(--color-gold)]">
                  Garçons da temporada
                </h3>
                <ol className="mt-4 grid gap-2 sm:grid-cols-2">
                  {stats.topAssisters.map(({ playerId, assists }, i) => {
                    const player = squad.find((p) => p.id === playerId)
                    return (
                      <li
                        key={playerId}
                        className="flex items-center gap-3 rounded-lg border border-[var(--hairline)] bg-white/[0.02] px-3 py-2"
                      >
                        <span className="w-5 shrink-0 text-center text-sm font-bold text-[var(--text-50)]">
                          {i + 1}
                        </span>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--hairline)] bg-black/40 text-xs">
                          {player?.photo ? (
                            <img src={player.photo} alt="" className="h-full w-full object-cover" />
                          ) : (
                            player?.number.replace('#', '') ?? '–'
                          )}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {player ? <PlayerLink id={player.id} name={player.name} /> : 'Jogador'}
                        </span>
                        <span className="shrink-0 text-sm font-semibold tabular-nums">
                          {assists} {assists === 1 ? 'assist' : 'assists'}
                        </span>
                      </li>
                    )
                  })}
                </ol>
              </div>
            )}

            {/* Referência à página do elenco (só o link) */}
            <div className="mt-12 flex flex-col items-center gap-3 border-t border-[var(--hairline)] pt-10">
              <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-50)]">
                Conheça quem faz esses números
              </span>
              <button
                type="button"
                data-cursor="Elenco"
                onClick={() => navigate('/elenco')}
                className="rounded-full border border-[var(--hairline)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.1em] text-[var(--text-70)] transition-colors hover:border-[var(--color-accent)] hover:text-white"
              >
                Ver o elenco →
              </button>
            </div>
          </>
        )}

        {eaClub && (
          <div className="mt-16 border-t border-[var(--hairline)] pt-10">
            <span className="eyebrow" style={{ color: 'var(--color-gold)' }}>
              Histórico completo · dados oficiais da EA
            </span>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Jogos (liga)" value={eaClub.gamesPlayed} />
              <StatTile label="Jogos (playoff)" value={eaClub.gamesPlayedPlayoff} />
              <StatTile label="Vitórias" value={eaClub.wins} gold />
              <StatTile label="Empates" value={eaClub.ties} />
              <StatTile label="Derrotas" value={eaClub.losses} />
              <StatTile label="Gols pró" value={eaClub.goals} />
              <StatTile label="Gols contra" value={eaClub.goalsAgainst} />
              <StatTile label="Saldo" value={`${eaClub.goals - eaClub.goalsAgainst >= 0 ? '+' : ''}${eaClub.goals - eaClub.goalsAgainst}`} />
              <StatTile label="Promoções" value={eaClub.promotions} gold />
              <StatTile label="Rebaixamentos" value={eaClub.relegations} />
              <StatTile label="Troféus (1º lugar)" value={eaClub.titles} gold />
              {eaClub.skillRating != null && <StatTile label="Skill rating" value={eaClub.skillRating} />}
            </div>

            {eaHistory.length > 1 && (
              <div className="mt-8">
                <h3 className="text-sm uppercase tracking-[0.14em] text-[var(--color-gold)]">
                  Evolução do Skill Rating
                </h3>
                <SkillRatingChart history={eaHistory} />
              </div>
            )}

            {(eaClub.winStreak > 1 || eaClub.unbeatenStreak > 1) && (
              <div className="mt-6 flex flex-col items-center rounded-xl border border-[color-mix(in_srgb,var(--color-gold)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-gold)_5%,transparent)] px-5 py-5 text-center">
                <span className="eyebrow" style={{ color: 'var(--color-gold)' }}>
                  Sequência (histórico EA)
                </span>
                <p className="mt-2 text-xl font-bold uppercase tracking-[0.02em]">
                  {eaClub.winStreak > 1
                    ? `${eaClub.winStreak} vitórias seguidas`
                    : `invicto há ${eaClub.unbeatenStreak} jogos`}
                </p>
              </div>
            )}

            {eaCareers.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm uppercase tracking-[0.14em] text-[var(--color-gold)]">
                  Carreira dos jogadores (EA)
                </h3>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead>
                      <tr className="border-b border-[var(--hairline)] text-left text-[0.65rem] uppercase tracking-[0.12em] text-[var(--text-50)]">
                        <th className="py-2 pr-3">Jogador</th>
                        <th className="px-2 py-2 text-right">Jogos</th>
                        <th className="px-2 py-2 text-right">Gols</th>
                        <th className="px-2 py-2 text-right">Assist.</th>
                        <th className="px-2 py-2 text-right">Craques</th>
                        <th className="py-2 pl-2 text-right">Média</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eaCareers.map((c) => {
                        const player = c.playerId ? squad.find((p) => p.id === c.playerId) : null
                        return (
                          <tr key={c.personaName} className="border-b border-[var(--hairline)]/50">
                            <td className="py-2 pr-3 font-medium">
                              {player ? <PlayerLink id={player.id} name={player.name} /> : c.personaName}
                            </td>
                            <td className="px-2 py-2 text-right tabular-nums">{c.gamesPlayed}</td>
                            <td className="px-2 py-2 text-right tabular-nums text-[var(--color-gold)]">{c.goals}</td>
                            <td className="px-2 py-2 text-right tabular-nums">{c.assists}</td>
                            <td className="px-2 py-2 text-right tabular-nums">{c.motm}</td>
                            <td className="py-2 pl-2 text-right tabular-nums">{c.ratingAvg?.toFixed(1) ?? '–'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {rivals.length > 0 && (
          <div className={eaClub ? 'mt-10' : 'mt-16 border-t border-[var(--hairline)] pt-10'}>
            <h3 className="text-sm uppercase tracking-[0.14em] text-[var(--color-gold)]">
              Maiores rivais (histórico completo)
            </h3>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--hairline)] text-left text-[0.65rem] uppercase tracking-[0.12em] text-[var(--text-50)]">
                    <th className="py-2 pr-3">Adversário</th>
                    <th className="px-2 py-2 text-right">Jogos</th>
                    <th className="px-2 py-2 text-right">V</th>
                    <th className="px-2 py-2 text-right">E</th>
                    <th className="px-2 py-2 text-right">D</th>
                    <th className="py-2 pl-2 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {rivals.map((r) => (
                    <tr key={r.opponent} className="border-b border-[var(--hairline)]/50">
                      <td className="py-2 pr-3 font-medium">{r.opponent}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{r.played}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-[var(--color-gold)]">{r.wins}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{r.draws}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{r.losses}</td>
                      <td className="py-2 pl-2 text-right tabular-nums">
                        {r.goalsFor - r.goalsAgainst >= 0 ? '+' : ''}
                        {r.goalsFor - r.goalsAgainst}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
