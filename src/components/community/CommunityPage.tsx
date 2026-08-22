import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { gsap, prefersReducedMotion } from '../../lib/gsap'
import { useAuth } from '../../admin/auth'
import { timeAgo } from '../../lib/time'
import { fetchTopics, type CommunityTopic } from '../../lib/community'
import UserAvatar from '../ui/UserAvatar'

/** Hub da comunidade (/comunidade) — lista de tópicos do fórum da torcida. */
export default function CommunityPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session } = useAuth()
  const rootRef = useRef<HTMLDivElement>(null)

  const [topics, setTopics] = useState<CommunityTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const goBack = useCallback(() => navigate('/'), [navigate])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') goBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goBack])

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetchTopics()
      .then((t) => alive && setTopics(t))
      .catch(() => alive && setError('Não foi possível carregar os tópicos.'))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  useLayoutEffect(() => {
    if (prefersReducedMotion() || !rootRef.current) return
    const ctx = gsap.context(() => {
      gsap.from('[data-anim="head"]', { y: -24, opacity: 0, duration: 0.5, ease: 'power3.out' })
      gsap.from('.community-list-item', {
        opacity: 0,
        y: 24,
        duration: 0.5,
        ease: 'power3.out',
        stagger: 0.06,
        delay: 0.1,
      })
    }, rootRef)
    return () => ctx.revert()
  }, [loading])

  function goNewTopic() {
    if (session) navigate('/comunidade/novo')
    else navigate('/entrar', { state: { from: '/comunidade/novo' } })
  }

  return (
    <div ref={rootRef} className="news-page" aria-label="Comunidade do Imperatrice FC">
      <header className="squad-head" data-anim="head">
        <button type="button" className="squad-back" data-cursor="Voltar" onClick={goBack}>
          ← Voltar
        </button>
        <div className="squad-title">
          <span className="eyebrow">Comunidade</span>
          <h2>Comunidade</h2>
        </div>
        <button type="button" className="squad-reset" data-cursor="Novo tópico" onClick={goNewTopic}>
          + Novo tópico
        </button>
      </header>

      <div className="community-hub">
        {loading ? (
          <p className="news-empty">Carregando…</p>
        ) : error ? (
          <p className="news-empty">{error}</p>
        ) : topics.length === 0 ? (
          <p className="news-empty">Ainda não há tópicos. Comece a discussão!</p>
        ) : (
          <div className="community-list">
            {topics.map((t) => (
              <article
                key={t.id}
                className="community-list-item"
                data-cursor="Ver tópico"
                onClick={() => navigate(`/comunidade/${t.id}`, { state: { from: location.pathname } })}
              >
                <UserAvatar name={t.author} avatarUrl={t.authorAvatarUrl} size="md" />
                <div className="community-list-item__body">
                  <header className="community-list-item__head">
                    {t.pinned && <span className="community-badge community-badge--pinned">Fixado</span>}
                    {t.hasPoll && <span className="community-badge community-badge--poll">Enquete</span>}
                    <h4>{t.title}</h4>
                  </header>
                  <p className="community-list-item__lead">{t.body}</p>
                  <p className="news-meta">
                    {t.author} · {timeAgo(t.createdAt)} · {t.replyCount}{' '}
                    {t.replyCount === 1 ? 'resposta' : 'respostas'} · {t.likeCount}{' '}
                    {t.likeCount === 1 ? 'curtida' : 'curtidas'}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
