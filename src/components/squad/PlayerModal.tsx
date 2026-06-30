import { useEffect, useState } from 'react'
import type { Player } from '../../data/club'
import {
  COMMENTS_ENABLED,
  fetchComments,
  postComment,
  type PlayerComment,
} from '../../lib/comments'

interface PlayerModalProps {
  player: Player
  isStarter: boolean
  fieldPosition?: string // rótulo do slot quando titular (ex.: "CB")
  canReserve: boolean // há reservas para entrar no lugar?
  onEscalar: () => void
  onReservar: () => void
  onClose: () => void
}

type Tab = 'ficha' | 'comentarios'

/**
 * Modal de detalhes do jogador — abas Ficha (informações) e Comentários.
 * Os comentários são de pessoas reais e ficam disponíveis quando o banco de
 * dados estiver no ar (ver src/lib/comments.ts).
 */
export default function PlayerModal({
  player,
  isStarter,
  fieldPosition,
  canReserve,
  onEscalar,
  onReservar,
  onClose,
}: PlayerModalProps) {
  const [tab, setTab] = useState<Tab>('ficha')
  const [photoOk, setPhotoOk] = useState(Boolean(player.photo))
  const accent = player.accent === 'gold' ? 'var(--color-gold)' : 'var(--color-accent)'

  // Trava o scroll do fundo e fecha no Esc enquanto o modal está aberto.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div
      className="pmodal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`Ficha de ${player.name}`}
      onClick={onClose}
    >
      <div
        className="pmodal"
        style={{ '--token-accent': accent } as React.CSSProperties}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="pmodal__close" data-cursor="Fechar" onClick={onClose}>
          ✕
        </button>

        {/* Cabeçalho */}
        <header className="pmodal__head">
          <span className="pmodal__disc">
            {photoOk && player.photo ? (
              <img
                src={player.photo}
                alt={player.name}
                onError={() => setPhotoOk(false)}
              />
            ) : (
              <span className="pmodal__num">{player.number.replace('#', '')}</span>
            )}
          </span>
          <div className="pmodal__id">
            <span className="pmodal__status">
              {isStarter ? `Titular${fieldPosition ? ` · ${fieldPosition}` : ''}` : 'Reserva'}
            </span>
            <h3>{player.name}</h3>
            <span className="pmodal__meta">
              {player.number} · {player.position}
            </span>
          </div>
          {isStarter ? (
            <button
              type="button"
              className="pmodal__action"
              data-cursor="Reservar"
              disabled={!canReserve}
              onClick={onReservar}
            >
              Mandar pro banco
            </button>
          ) : (
            <button
              type="button"
              className="pmodal__action pmodal__action--primary"
              data-cursor="Escalar"
              onClick={onEscalar}
            >
              Escalar no XI
            </button>
          )}
        </header>

        {/* Abas */}
        <nav className="pmodal__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'ficha'}
            className={`pmodal__tab ${tab === 'ficha' ? 'is-active' : ''}`}
            onClick={() => setTab('ficha')}
          >
            Ficha
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'comentarios'}
            className={`pmodal__tab ${tab === 'comentarios' ? 'is-active' : ''}`}
            onClick={() => setTab('comentarios')}
          >
            Comentários
          </button>
        </nav>

        <div className="pmodal__body">
          {tab === 'ficha' ? <FichaTab player={player} /> : <CommentsTab player={player} />}
        </div>
      </div>
    </div>
  )
}

/** Aba de informações do jogador. */
function FichaTab({ player }: { player: Player }) {
  return (
    <div className="ficha">
      <dl className="ficha__grid">
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

      {player.dilemma && <p className="ficha__dilemma">{player.dilemma}</p>}
      {player.description ? (
        <p className="ficha__desc">{player.description}</p>
      ) : (
        <p className="ficha__empty">Ficha detalhada deste jogador em breve.</p>
      )}
    </div>
  )
}

/** Aba de comentários — pessoas reais (habilita com o banco de dados). */
function CommentsTab({ player }: { player: Player }) {
  const [comments, setComments] = useState<PlayerComment[]>([])
  const [loading, setLoading] = useState(true)
  const [author, setAuthor] = useState('')
  const [body, setBody] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetchComments(player.id)
      .then((list) => alive && setComments(list))
      .catch(() => alive && setError('Não foi possível carregar os comentários.'))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [player.id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!author.trim() || !body.trim()) return
    setPosting(true)
    setError(null)
    try {
      const created = await postComment({ playerId: player.id, author: author.trim(), body: body.trim() })
      setComments((prev) => [created, ...prev])
      setBody('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao publicar.')
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="comments">
      {!COMMENTS_ENABLED && (
        <div className="comments__soon">
          <strong>Comentários em breve 💬</strong>
          <span>
            Quando o banco de dados estiver no ar, a torcida poderá comentar de verdade sobre{' '}
            {player.name}.
          </span>
        </div>
      )}

      {COMMENTS_ENABLED && (
        <form className="comments__form" onSubmit={handleSubmit}>
          <input
            className="comments__input"
            placeholder="Seu nome"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            maxLength={40}
          />
          <textarea
            className="comments__textarea"
            placeholder={`O que você acha do ${player.name}?`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={500}
            rows={3}
          />
          <div className="comments__formfoot">
            {error && <span className="comments__error">{error}</span>}
            <button type="submit" className="comments__submit" disabled={posting}>
              {posting ? 'Enviando…' : 'Comentar'}
            </button>
          </div>
        </form>
      )}

      <div className="comments__list">
        {loading ? (
          <p className="comments__hint">Carregando…</p>
        ) : comments.length === 0 ? (
          <p className="comments__hint">Ainda não há comentários. Seja o primeiro quando abrir!</p>
        ) : (
          comments.map((c) => (
            <article key={c.id} className="comment">
              <header className="comment__head">
                <span className="comment__author">{c.author}</span>
                <time className="comment__date">
                  {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                </time>
              </header>
              <p className="comment__body">{c.body}</p>
            </article>
          ))
        )}
      </div>
    </div>
  )
}
