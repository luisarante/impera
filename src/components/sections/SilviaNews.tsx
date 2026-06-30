import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { NewsItem } from '../../data/club'
import { useClubData } from '../../lib/data/ClubDataContext'
import VerifiedBadge from '../ui/VerifiedBadge'
import GlassPanel from '../ui/GlassPanel'
import GhostButton from '../ui/GhostButton'

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR')
}

/**
 * SEÇÃO 3 — HUB DA MÍDIA FICTÍCIA "SilviaNews".
 * Layout editorial 60/40: manchete principal à esquerda, duas notícias
 * empilhadas à direita. Clique abre painel glass lateral com a matéria.
 */
export default function SilviaNews() {
  const navigate = useNavigate()
  const { news } = useClubData()
  const [active, setActive] = useState<NewsItem | null>(null)
  const featured = news.find((n) => n.featured) ?? news[0]
  const side = news.filter((n) => n.id !== featured.id).slice(0, 2)

  return (
    <section className="relative bg-[var(--color-ink)] px-[8vw] py-32">
      <header className="mx-auto mb-16 flex max-w-6xl items-center justify-between">
        <h2 className="text-4xl uppercase tracking-[-0.02em]">SilviaNews</h2>
        <span className="eyebrow">A maior secadora do Impera</span>
      </header>

      <div className="mx-auto grid max-w-6xl grid-cols-[3fr_2fr] gap-12">
        {/* Manchete principal (60%) */}
        <article
          onClick={() => setActive(featured)}
          data-cursor="Ler matéria"
          className="group flex flex-col"
        >
          <div className="relative mb-7 aspect-[16/10] overflow-hidden hairline-card">
            {featured.cover ? (
              <img
                src={featured.cover}
                alt=""
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              />
            ) : (
              <div className="news-hero-img absolute inset-0 transition-transform duration-700 group-hover:scale-[1.04]" />
            )}
            <span className="absolute left-5 top-5 bg-[var(--color-alert)] px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-white">
              Capa
            </span>
          </div>
          <span className="eyebrow mb-3" style={{ color: 'var(--color-accent)' }}>
            {featured.kicker}
          </span>
          <h3 className="mb-4 text-3xl leading-[1.05] uppercase transition-colors group-hover:text-[var(--color-gold)]">
            {featured.headline}
          </h3>
          <p className="mb-4 max-w-prose text-[var(--text-70)] leading-relaxed">{featured.lead}</p>
          <p className="mb-4 text-[0.7rem] uppercase tracking-[0.16em] text-[var(--text-50)]">
            {featured.author}
            {featured.author && featured.publishedAt ? ' · ' : ''}
            {formatDate(featured.publishedAt)}
          </p>
          {featured.verified && <VerifiedBadge />}
        </article>

        {/* Duas notícias menores (40%) */}
        <div className="flex flex-col divide-y divide-[var(--hairline)]">
          {side.map((n) => (
            <article
              key={n.id}
              onClick={() => setActive(n)}
              data-cursor="Ler matéria"
              className="group flex flex-col py-7 first:pt-0"
            >
              <span className="eyebrow mb-3" style={{ color: 'var(--color-accent)' }}>
                {n.kicker}
              </span>
              <h4 className="mb-3 text-xl leading-snug transition-colors group-hover:text-[var(--color-gold)]">
                {n.headline}
              </h4>
              <p className="mb-3 text-sm text-[var(--text-50)] leading-relaxed">{n.lead}</p>
              <p className="mb-3 text-[0.65rem] uppercase tracking-[0.16em] text-[var(--text-50)]">
                {n.author}
                {n.author && n.publishedAt ? ' · ' : ''}
                {formatDate(n.publishedAt)}
              </p>
              {n.verified && <VerifiedBadge />}
            </article>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-16 flex max-w-6xl justify-center">
        <GhostButton cursorLabel="Ver notícias" onClick={() => navigate('/noticias')}>
          Ver Todas as Notícias →
        </GhostButton>
      </div>

      <GlassPanel item={active} onClose={() => setActive(null)} />
    </section>
  )
}
