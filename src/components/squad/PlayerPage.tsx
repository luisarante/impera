import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useClubData } from '../../lib/data/ClubDataContext'
import { fetchMvpTitleCount } from '../../lib/games'
import PlayerComments from './PlayerComments'

/**
 * PÁGINA DEDICADA DO JOGADOR (/elenco/:id).
 * Ficha completa + mural de comentários da torcida, com URL compartilhável.
 */
export default function PlayerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { club, squad } = useClubData()
  const player = squad.find((p) => p.id === id) ?? null
  const [photoOk, setPhotoOk] = useState(Boolean(player?.photo))
  const [mvpTitles, setMvpTitles] = useState<number | null>(null)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id])

  // Nº de vezes que este jogador foi eleito craque da noite.
  useEffect(() => {
    if (!id) return
    let alive = true
    setMvpTitles(null)
    fetchMvpTitleCount(id)
      .then((n) => {
        if (alive) setMvpTitles(n)
      })
      .catch(() => {
        if (alive) setMvpTitles(0)
      })
    return () => {
      alive = false
    }
  }, [id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate('/elenco')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  const accent = player?.accent === 'gold' ? 'var(--color-gold)' : 'var(--color-accent)'

  return (
    <div className="squad-page">
      <header className="squad-head">
        <button
          type="button"
          className="squad-back"
          data-cursor="Elenco"
          onClick={() => navigate('/elenco')}
        >
          ← Elenco
        </button>
        <div className="squad-title">
          <span className="eyebrow">Ficha · {club.name}</span>
          <h2>{player ? player.name : 'Jogador'}</h2>
        </div>
        <span aria-hidden />
      </header>

      {!player ? (
        <div className="mx-auto max-w-md px-6 py-24 text-center">
          <p className="text-[var(--text-70)]">Jogador não encontrado.</p>
          <button
            type="button"
            className="squad-back mt-6"
            data-cursor="Elenco"
            onClick={() => navigate('/elenco')}
          >
            ← Ver elenco
          </button>
        </div>
      ) : (
        <div
          className="mx-auto w-full max-w-4xl px-[6vw] py-12"
          style={{ '--token-accent': accent } as React.CSSProperties}
        >
          <div className="grid items-start gap-8 md:grid-cols-[minmax(0,300px)_1fr]">
            {/* Foto / disco com número */}
            <div
              className="relative mx-auto flex aspect-[3/4] w-full max-w-[300px] items-center justify-center overflow-hidden rounded-xl border"
              style={{ borderColor: 'var(--hairline)', background: 'rgba(0,0,0,0.4)' }}
            >
              {photoOk && player.photo ? (
                <img
                  src={player.photo}
                  alt={player.name}
                  className="h-full w-full object-cover"
                  onError={() => setPhotoOk(false)}
                />
              ) : (
                <span className="text-7xl font-bold" style={{ color: accent }}>
                  {player.number.replace('#', '')}
                </span>
              )}
              {player.isPillar && (
                <span
                  className="absolute left-3 top-3 rounded px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-black"
                  style={{ background: accent }}
                >
                  Pilar
                </span>
              )}
            </div>

            {/* Identidade + ficha */}
            <div>
              <span className="eyebrow" style={{ color: accent }}>
                {player.position}
              </span>
              <h1 className="mt-3 text-[clamp(2.5rem,6vw,4.5rem)] font-bold uppercase leading-[0.95]">
                {player.name}
              </h1>
              <p className="mt-3 text-[var(--text-50)]">
                {player.number} · {player.role}
                {player.starter ? ' · Titular' : ' · Reserva'}
              </p>

              {mvpTitles != null && mvpTitles > 0 && (
                <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--color-gold)] px-3 py-1 text-sm font-semibold text-[var(--color-gold)]">
                  <span aria-hidden>👑</span>
                  Craque da noite · {mvpTitles}
                  {mvpTitles === 1 ? ' vez' : ' vezes'}
                </p>
              )}

              {player.dilemma && <p className="ficha__dilemma">{player.dilemma}</p>}
              {player.description && <p className="ficha__desc">{player.description}</p>}

              <dl className="ficha__grid mt-8">
                <div>
                  <dt>Camisa</dt>
                  <dd>{player.number}</dd>
                </div>
                <div>
                  <dt>Posição</dt>
                  <dd>{player.position}</dd>
                </div>
                <div>
                  <dt>Função em campo</dt>
                  <dd>{player.role}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Mural de comentários */}
          <section className="mt-14">
            <h2 className="eyebrow mb-5">Mural da torcida</h2>
            <PlayerComments playerId={player.id} playerName={player.name} />
          </section>
        </div>
      )}
    </div>
  )
}
