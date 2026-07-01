import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { gsap, prefersReducedMotion } from '../../lib/gsap'
import { useClubData } from '../../lib/data/ClubDataContext'
import VerifiedBadge from '../ui/VerifiedBadge'

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR')
}

/**
 * PÁGINA DEDICADA DE NOTÍCIAS (/noticias) — hub da SilviaNews.
 * A matéria-capa (featured) abre o topo; as demais vêm numa grade, da mais
 * recente para a mais antiga. Clicar abre o painel de leitura (GlassPanel).
 */
export default function NewsPage() {
  const navigate = useNavigate()
  const { news, club } = useClubData()
  const rootRef = useRef<HTMLDivElement>(null)

  const goBack = useCallback(() => navigate('/'), [navigate])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // Esc volta para a home.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') goBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goBack])

  useLayoutEffect(() => {
    if (prefersReducedMotion() || !rootRef.current) return
    const ctx = gsap.context(() => {
      gsap.from('[data-anim="head"]', { y: -24, opacity: 0, duration: 0.5, ease: 'power3.out' })
      gsap.from('.news-cover', { opacity: 0, y: 24, duration: 0.55, ease: 'power3.out' })
      gsap.from('.news-card', {
        opacity: 0,
        y: 24,
        duration: 0.5,
        ease: 'power3.out',
        stagger: 0.06,
        delay: 0.1,
      })
    }, rootRef)
    return () => ctx.revert()
  }, [])

  const cover = news.find((n) => n.featured) ?? news[0] ?? null
  const rest = cover ? news.filter((n) => n.id !== cover.id) : news

  return (
    <div ref={rootRef} className="news-page" aria-label="Notícias do Imperatrice FC">
      <header className="squad-head" data-anim="head">
        <button type="button" className="squad-back" data-cursor="Voltar" onClick={goBack}>
          ← Voltar
        </button>
        <div className="squad-title">
          <span className="eyebrow">SilviaNews · {club.name}</span>
          <h2>Notícias</h2>
        </div>
        <span className="gallery-count">{news.length} matérias</span>
      </header>

      {news.length === 0 ? (
        <p className="news-empty">Nenhuma notícia publicada ainda.</p>
      ) : (
        <div className="news-hub">
          {cover && (
            <article
              className="news-cover"
              data-cursor="Ler matéria"
              onClick={() => navigate(`/noticias/${cover.id}`)}
            >
              <div className="news-cover__media">
                {cover.cover ? (
                  <img src={cover.cover} alt="" />
                ) : (
                  <div className="news-hero-img absolute inset-0" />
                )}
                <span className="news-badge">Capa</span>
              </div>
              <div className="news-cover__body">
                <span className="eyebrow" style={{ color: 'var(--color-accent)' }}>
                  {cover.kicker}
                </span>
                <h3>{cover.headline}</h3>
                <p className="news-cover__lead">{cover.lead}</p>
                <p className="news-meta">
                  {cover.author}
                  {cover.author && cover.publishedAt ? ' · ' : ''}
                  {formatDate(cover.publishedAt)}
                </p>
                {cover.verified && <VerifiedBadge />}
              </div>
            </article>
          )}

          <div className="news-grid">
            {rest.map((n) => (
              <article
                key={n.id}
                className="news-card"
                data-cursor="Ler matéria"
                onClick={() => navigate(`/noticias/${n.id}`)}
              >
                <div className="news-card__media">
                  {n.cover ? (
                    <img src={n.cover} alt="" />
                  ) : (
                    <div className="news-hero-img absolute inset-0" />
                  )}
                </div>
                <div className="news-card__body">
                  <span className="eyebrow" style={{ color: 'var(--color-accent)' }}>
                    {n.kicker}
                  </span>
                  <h4>{n.headline}</h4>
                  <p className="news-card__lead">{n.lead}</p>
                  <p className="news-meta mt-auto">
                    {n.author}
                    {n.author && n.publishedAt ? ' · ' : ''}
                    {formatDate(n.publishedAt)}
                  </p>
                  {n.verified && <VerifiedBadge />}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
