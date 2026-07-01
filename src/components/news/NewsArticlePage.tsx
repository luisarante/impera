import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useClubData } from '../../lib/data/ClubDataContext'
import { sanitizeNewsHtml } from '../../lib/sanitize'
import VerifiedBadge from '../ui/VerifiedBadge'
import ShareButton from '../ui/ShareButton'

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR')
}

/**
 * PÁGINA DEDICADA DA MATÉRIA (/noticias/:id).
 * Matéria completa em página própria (capa, corpo rico, assinatura e
 * compartilhamento), com URL compartilhável e preview OG (ver api/news-og.js).
 */
export default function NewsArticlePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { club, news } = useClubData()
  const article = news.find((n) => n.id === id) ?? null

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate('/noticias')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  return (
    <div className="news-page">
      <header className="squad-head">
        <button
          type="button"
          className="squad-back"
          data-cursor="Notícias"
          onClick={() => navigate('/noticias')}
        >
          ← Notícias
        </button>
        <div className="squad-title">
          <span className="eyebrow">SilviaNews · {club.name}</span>
          <h2>Matéria</h2>
        </div>
        <span aria-hidden />
      </header>

      {!article ? (
        <div className="mx-auto max-w-md px-6 py-24 text-center">
          <p className="text-[var(--text-70)]">Matéria não encontrada.</p>
          <button
            type="button"
            className="squad-back mt-6"
            data-cursor="Notícias"
            onClick={() => navigate('/noticias')}
          >
            ← Ver notícias
          </button>
        </div>
      ) : (
        <article className="mx-auto w-full max-w-3xl px-[6vw] py-12">
          {article.cover && (
            <div className="mb-10 aspect-[16/9] w-full overflow-hidden rounded-xl border border-[var(--hairline)]">
              <img src={article.cover} alt="" className="h-full w-full object-cover" />
            </div>
          )}

          <span className="eyebrow" style={{ color: 'var(--color-accent)' }}>
            {article.kicker}
          </span>
          <h1 className="mt-3 text-[clamp(2rem,5vw,3.5rem)] font-bold uppercase leading-[1.02]">
            {article.headline}
          </h1>
          <p className="mt-4 text-xs uppercase tracking-[0.16em] text-[var(--text-50)]">
            {article.author}
            {article.author && article.publishedAt ? ' · ' : ''}
            {formatDate(article.publishedAt)}
          </p>

          <p className="mt-6 text-lg leading-relaxed text-[var(--text-70)]">{article.lead}</p>

          <div className="my-8 h-px w-full" style={{ background: 'var(--hairline)' }} />

          {article.html ? (
            <div
              className="news-content text-[var(--text-70)]"
              dangerouslySetInnerHTML={{ __html: sanitizeNewsHtml(article.html) }}
            />
          ) : (
            <div className="news-content space-y-5 text-[var(--text-70)]">
              {(article.body ?? []).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          )}

          {article.verified && (
            <div className="mt-10">
              <VerifiedBadge />
            </div>
          )}

          <div className="mt-10 border-t border-[var(--hairline)] pt-6">
            <p className="mb-3 text-[0.7rem] uppercase tracking-[0.2em] text-[var(--text-50)]">
              Compartilhar
            </p>
            <ShareButton item={article} />
          </div>
        </article>
      )}
    </div>
  )
}
