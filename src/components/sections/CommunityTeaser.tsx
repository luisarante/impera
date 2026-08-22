import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchTopics, type CommunityTopic } from '../../lib/community'
import GhostButton from '../ui/GhostButton'

/**
 * Faixa "Comunidade" na home — logo abaixo do grid de notícias. Mostra até 2
 * tópicos recentes do fórum e leva para /comunidade.
 */
export default function CommunityTeaser() {
  const navigate = useNavigate()
  const [topics, setTopics] = useState<CommunityTopic[]>([])

  useEffect(() => {
    let alive = true
    fetchTopics(2)
      .then((t) => alive && setTopics(t))
      .catch(() => {
        // teaser é decorativo — falha silenciosa não deve quebrar a home
      })
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="community-teaser hairline-card" data-cursor="Ver comunidade" onClick={() => navigate('/comunidade')}>
      <div className="community-teaser__head">
        <span className="eyebrow" style={{ color: 'var(--color-accent)' }}>
          Comunidade
        </span>
        <h3>O que a torcida está discutindo</h3>
      </div>

      {topics.length > 0 && (
        <ul className="community-teaser__list">
          {topics.map((t) => (
            <li key={t.id}>
              <span className="community-teaser__title">{t.title}</span>
              <span className="community-teaser__meta">
                {t.replyCount} {t.replyCount === 1 ? 'resposta' : 'respostas'}
              </span>
            </li>
          ))}
        </ul>
      )}

      <GhostButton cursorLabel="Ver comunidade" onClick={() => navigate('/comunidade')}>
        Ir para a Comunidade →
      </GhostButton>
    </div>
  )
}
