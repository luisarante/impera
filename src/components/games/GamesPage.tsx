import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useClubData } from '../../lib/data/ClubDataContext'
import { shareMessage } from '../../lib/share'
import Badge from '../ui/Badge'
import {
  castMvpVote,
  fetchNight,
  fetchNights,
  type GameNight,
  type Match,
  type NightData,
} from '../../lib/games'

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden>
    <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
  </svg>
)

/** Monta a mensagem de compartilhamento da partida (formatação do WhatsApp). */
function buildMatchShare(
  clubName: string,
  m: Match,
  scorerLines: { name: string; minsTxt: string }[],
): string {
  const decided = m.ourScore != null && m.oppScore != null
  let head = `⚽ *${clubName} x ${m.opponent}*`
  if (decided) {
    if ((m.ourScore as number) > (m.oppScore as number)) head = '🟢 *VITÓRIA DO IMPERATRICE!*'
    else if ((m.ourScore as number) < (m.oppScore as number))
      head = '🔴 *Derrota — mas a Imperatrice volta mais forte.*'
    else head = '🟡 *Empate valente da Imperatrice.*'
  }
  const scoreLine = `*${clubName} ${m.ourScore ?? '–'} x ${m.oppScore ?? '–'} ${m.opponent}*`
  const comp = m.competition ? `\n_${m.competition}_` : ''
  const goals = scorerLines.length
    ? '\n\n' + scorerLines.map((s) => `⚽ ${s.name}${s.minsTxt ? ` ${s.minsTxt}` : ''}`).join('\n')
    : ''
  return `${head}\n\n${scoreLine}${comp}${goals}\n\n📲 Veja a noite e vote no craque:`
}

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(`${iso}T00:00:00`)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR')
}

const STATUS_LABEL: Record<Match['status'], string> = {
  agendada: 'Agendada',
  ao_vivo: 'Ao vivo',
  encerrada: 'Encerrada',
}

/**
 * PÁGINA NOITES DE JOGO (/jogos, /jogos/:id).
 * Abre na noite mais recente; o seletor navega no histórico. Cada noite mostra
 * as partidas (placar), a votação de craque (torcida vota, resultado ao vivo) e
 * os eventos informativos criados no admin.
 */
export default function GamesPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { club, squad } = useClubData()

  const [nights, setNights] = useState<GameNight[]>([])
  const [data, setData] = useState<NightData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [voting, setVoting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [list, night] = await Promise.all([fetchNights(), fetchNight(id)])
      setNights(list)
      setData(night)
    } catch {
      setError('Não foi possível carregar as noites de jogo.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    window.scrollTo(0, 0)
    load()
  }, [load])

  async function vote(playerId: string) {
    if (!data || !data.night.mvpOpen || voting) return
    setVoting(true)
    try {
      await castMvpVote(data.night.id, playerId)
      setData(await fetchNight(data.night.id))
    } catch {
      alert('Falha ao registrar o voto.')
    } finally {
      setVoting(false)
    }
  }

  const candidates = data
    ? data.candidateIds
        .map((pid) => squad.find((p) => p.id === pid))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
        .map((p) => ({ player: p, votes: data.tally[p.id] ?? 0 }))
        .sort((a, b) => b.votes - a.votes)
    : []

  return (
    <div className="news-page">
      <header className="squad-head">
        <button type="button" className="squad-back" data-cursor="Voltar" onClick={() => navigate('/')}>
          ← Voltar
        </button>
        <div className="squad-title">
          <span className="eyebrow">Noites de Jogo · {club.name}</span>
          <h2>Últimos Jogos</h2>
        </div>
        <span aria-hidden />
      </header>

      <div className="mx-auto w-full max-w-4xl px-[6vw] pb-16">
        {loading ? (
          <p className="py-16 text-center text-[var(--text-50)]">Carregando…</p>
        ) : error ? (
          <p className="py-16 text-center text-[var(--color-alert)]">{error}</p>
        ) : !data ? (
          <p className="py-16 text-center text-[var(--text-50)]">
            Nenhuma noite de jogo cadastrada ainda.
          </p>
        ) : (
          <>
            {/* Seletor de noites (histórico) */}
            {nights.length > 1 && (
              <div className="mb-10 flex gap-2 overflow-x-auto pb-2">
                {nights.map((n) => {
                  const active = n.id === data.night.id
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => navigate(`/jogos/${n.id}`)}
                      className={`shrink-0 rounded-full border px-4 py-2 text-sm transition-colors ${
                        active
                          ? 'border-[var(--color-accent)] text-white'
                          : 'border-[var(--hairline)] text-[var(--text-50)] hover:text-white'
                      }`}
                    >
                      {n.title}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Cabeçalho da noite */}
            <div className="mb-12">
              <h3 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold uppercase leading-tight">
                {data.night.title}
              </h3>
              <p className="mt-2 text-sm uppercase tracking-[0.16em] text-[var(--text-50)]">
                {formatDate(data.night.date)}
                {data.night.subtitle ? ` · ${data.night.subtitle}` : ''}
              </p>
            </div>

            {/* Partidas */}
            <section className="mb-14">
              <span className="eyebrow" style={{ color: 'var(--color-accent)' }}>
                Partidas
              </span>
              {data.matches.length === 0 ? (
                <p className="mt-4 text-sm text-[var(--text-50)]">Nenhuma partida cadastrada.</p>
              ) : (
                <div className="mt-4 space-y-4">
                  {data.matches.map((m) => {
                    // Agrupa os gols por jogador preservando os minutos.
                    const byPlayer = new Map<string, (number | null)[]>()
                    for (const g of m.goals) {
                      if (!byPlayer.has(g.playerId)) byPlayer.set(g.playerId, [])
                      byPlayer.get(g.playerId)!.push(g.minute)
                    }
                    const scorerLines = [...byPlayer.entries()].map(([pid, mins]) => {
                      const name = squad.find((p) => p.id === pid)?.name ?? '—'
                      const minsTxt = mins.filter((x) => x != null).map((x) => `${x}'`).join(', ')
                      return { name, minsTxt }
                    })
                    const decided = m.ourScore != null && m.oppScore != null
                    const ourWin = decided && (m.ourScore as number) > (m.oppScore as number)
                    const oppWin = decided && (m.oppScore as number) > (m.ourScore as number)
                    return (
                      <div
                        key={m.id}
                        className="rounded-xl border border-[var(--hairline)] bg-white/[0.02] p-5"
                      >
                        <p className="text-center text-[0.7rem] uppercase tracking-[0.16em] text-[var(--text-50)]">
                          {[m.competition, STATUS_LABEL[m.status]].filter(Boolean).join(' · ')}
                        </p>

                        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                          {/* Imperatrice */}
                          <div className="flex flex-col items-center gap-2 text-center">
                            <Badge size={44} />
                            <span className="text-sm font-semibold uppercase leading-tight">
                              {club.name}
                            </span>
                          </div>

                          {/* Placar */}
                          <div className="px-1 text-center text-3xl font-bold tabular-nums sm:text-4xl">
                            <span className={ourWin ? 'text-[var(--color-gold)]' : ''}>
                              {m.ourScore ?? '–'}
                            </span>
                            <span className="mx-2 text-[var(--text-30)]">-</span>
                            <span className={oppWin ? 'text-[var(--color-gold)]' : ''}>
                              {m.oppScore ?? '–'}
                            </span>
                          </div>

                          {/* Adversário */}
                          <div className="flex flex-col items-center gap-2 text-center">
                            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--hairline)] bg-black/40 text-base font-bold uppercase text-[var(--text-70)]">
                              {m.opponent.charAt(0)}
                            </span>
                            <span className="text-sm font-semibold uppercase leading-tight">
                              {m.opponent}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 border-t border-[var(--hairline)] pt-3">
                          {scorerLines.length > 0 && (
                            <div className="grid grid-cols-2 gap-3 text-xs text-[var(--text-70)]">
                              <div className="space-y-1">
                                {scorerLines.map((s, i) => (
                                  <p key={i}>
                                    <span aria-hidden>⚽ </span>
                                    {s.name}
                                    {s.minsTxt ? ` ${s.minsTxt}` : ''}
                                  </p>
                                ))}
                              </div>
                              <div aria-hidden />
                            </div>
                          )}
                          <div className={`flex justify-center ${scorerLines.length ? 'mt-3' : ''}`}>
                            <button
                              type="button"
                              onClick={() =>
                                shareMessage({
                                  title: 'Imperatrice FC',
                                  text: buildMatchShare(club.name, m, scorerLines),
                                  url: `${window.location.origin}/jogos/${data.night.id}`,
                                })
                              }
                              className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-xs font-semibold text-black transition-opacity hover:opacity-90"
                            >
                              <WhatsAppIcon />
                              Compartilhar no WhatsApp
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Craque da noite (votação) */}
            <section className="mb-14">
              <div className="flex items-baseline justify-between">
                <span className="eyebrow" style={{ color: 'var(--color-gold)' }}>
                  Craque da Noite
                </span>
                <span className="text-xs text-[var(--text-50)]">
                  {data.totalVotes} {data.totalVotes === 1 ? 'voto' : 'votos'}
                  {!data.night.mvpOpen ? ' · encerrada' : ''}
                </span>
              </div>

              {candidates.length === 0 ? (
                <p className="mt-4 text-sm text-[var(--text-50)]">
                  A votação será liberada quando os jogadores da noite forem definidos.
                </p>
              ) : (
                <div className="mt-4 space-y-2">
                  {candidates.map(({ player, votes }) => {
                    const pct = data.totalVotes ? Math.round((votes / data.totalVotes) * 100) : 0
                    const mine = data.myVote === player.id
                    return (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() => vote(player.id)}
                        disabled={!data.night.mvpOpen || voting}
                        className={`relative w-full overflow-hidden rounded-lg border text-left transition-colors ${
                          mine ? 'border-[var(--color-gold)]' : 'border-[var(--hairline)]'
                        } ${data.night.mvpOpen ? 'hover:border-[var(--color-accent)]' : 'cursor-default'}`}
                      >
                        <span
                          className="absolute inset-y-0 left-0"
                          style={{
                            width: `${pct}%`,
                            background: mine ? 'rgba(255,208,0,0.16)' : 'rgba(0,150,64,0.16)',
                          }}
                          aria-hidden
                        />
                        <span className="relative flex items-center gap-3 px-4 py-3">
                          <span
                            className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--hairline)] bg-black/40 text-sm"
                          >
                            {player.photo ? (
                              <img src={player.photo} alt="" className="h-full w-full object-cover" />
                            ) : (
                              player.number.replace('#', '')
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">
                              {player.name}
                              {mine && (
                                <span className="ml-2 text-xs text-[var(--color-gold)]">seu voto</span>
                              )}
                            </span>
                            <span className="block text-xs text-[var(--text-50)]">{player.position}</span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="block font-semibold tabular-nums">{pct}%</span>
                            <span className="block text-xs text-[var(--text-50)]">
                              {votes} {votes === 1 ? 'voto' : 'votos'}
                            </span>
                          </span>
                        </span>
                      </button>
                    )
                  })}
                  {data.night.mvpOpen && (
                    <p className="pt-1 text-xs text-[var(--text-50)]">
                      Toque num jogador para votar. Você pode trocar seu voto a qualquer momento.
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* Eventos */}
            {data.events.length > 0 && (
              <section>
                <span className="eyebrow" style={{ color: 'var(--color-accent)' }}>
                  Eventos da Noite
                </span>
                <div className="mt-4 space-y-3">
                  {data.events.map((ev) => (
                    <div
                      key={ev.id}
                      className="rounded-lg border border-[var(--hairline)] bg-white/[0.02] px-5 py-4"
                    >
                      <div className="flex items-baseline gap-3">
                        {ev.timeLabel && (
                          <span className="text-xs font-semibold text-[var(--color-accent)]">
                            {ev.timeLabel}
                          </span>
                        )}
                        <h4 className="font-semibold uppercase tracking-[0.02em]">{ev.title}</h4>
                      </div>
                      {ev.description && (
                        <p className="mt-2 text-sm leading-relaxed text-[var(--text-70)]">
                          {ev.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
