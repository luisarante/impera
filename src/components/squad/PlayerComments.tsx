import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  COMMENTS_ENABLED,
  fetchThreads,
  postComment,
  toggleLike,
  type CommentThread,
  type PlayerComment,
} from '../../lib/comments'
import { useAuth } from '../../admin/auth'
import UserAvatar from '../ui/UserAvatar'
import { timeAgo } from '../../lib/time'

interface PlayerCommentsProps {
  playerId: string
  playerName: string
}

const ThumbUp = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
  </svg>
)

/** Composer reutilizável (comentário de topo ou resposta) — só para logados. */
function Composer({
  playerName,
  submitLabel,
  autoFocus,
  onSubmit,
  onCancel,
}: {
  playerName: string
  submitLabel: string
  autoFocus?: boolean
  onSubmit: (body: string) => Promise<void>
  onCancel: () => void
}) {
  const [body, setBody] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setPosting(true)
    setError(null)
    try {
      await onSubmit(body.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao publicar.')
    } finally {
      setPosting(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <textarea
        className="yt-composer__textarea"
        placeholder={`O que você acha do ${playerName}?`}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={500}
        rows={2}
        autoFocus={autoFocus}
      />
      <div className="yt-composer__actions">
        {error && <span className="yt-composer__error">{error}</span>}
        <button type="button" className="yt-btn yt-btn--ghost" onClick={onCancel} disabled={posting}>
          Cancelar
        </button>
        <button
          type="submit"
          className="yt-btn yt-btn--primary"
          disabled={posting || !body.trim()}
        >
          {posting ? 'Enviando…' : submitLabel}
        </button>
      </div>
    </form>
  )
}

export default function PlayerComments({ playerId, playerName }: PlayerCommentsProps) {
  const { session, profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const loggedIn = !!session

  const [threads, setThreads] = useState<CommentThread[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [composingTop, setComposingTop] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // Redireciona para o login preservando a página atual (volta após entrar).
  const goLogin = () => navigate('/entrar', { state: { from: location.pathname } })

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetchThreads(playerId)
      .then((t) => alive && setThreads(t))
      .catch(() => alive && setError('Não foi possível carregar os comentários.'))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [playerId])

  const total = useMemo(
    () => threads.reduce((n, t) => n + 1 + t.replies.length, 0),
    [threads],
  )

  // Atualiza um comentário (de topo ou resposta) por id, imutável.
  function updateComment(id: string, updater: (c: PlayerComment) => PlayerComment) {
    setThreads((prev) =>
      prev.map((t) =>
        t.comment.id === id
          ? { ...t, comment: updater(t.comment) }
          : { ...t, replies: t.replies.map((r) => (r.id === id ? updater(r) : r)) },
      ),
    )
  }

  async function onLike(c: PlayerComment) {
    if (!loggedIn) return goLogin()
    const like = !c.likedByMe
    updateComment(c.id, (x) => ({ ...x, likedByMe: like, likeCount: x.likeCount + (like ? 1 : -1) }))
    try {
      await toggleLike(c.id, like)
    } catch {
      // reverte em caso de erro
      updateComment(c.id, (x) => ({ ...x, likedByMe: !like, likeCount: x.likeCount + (like ? -1 : 1) }))
    }
  }

  async function addTop(body: string) {
    const created = await postComment({ playerId, body })
    setThreads((prev) => [{ comment: created, replies: [] }, ...prev])
    setComposingTop(false)
  }

  async function addReply(parentId: string, body: string) {
    const created = await postComment({ playerId, body, parentId })
    setThreads((prev) =>
      prev.map((t) => (t.comment.id === parentId ? { ...t, replies: [...t.replies, created] } : t)),
    )
    setExpanded((prev) => new Set(prev).add(parentId))
    setReplyingTo(null)
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function renderComment(c: PlayerComment, canReply: boolean) {
    return (
      <div className="yt-comment">
        <UserAvatar name={c.author} avatarUrl={c.avatarUrl} />
        <div className="yt-comment__main">
          <header className="yt-comment__head">
            <span className="yt-comment__author">{c.author}</span>
            <time className="yt-comment__time">{timeAgo(c.createdAt)}</time>
          </header>
          <p className="yt-comment__body">{c.body}</p>
          <div className="yt-comment__actions">
            <button
              type="button"
              className={`yt-react${c.likedByMe ? ' is-active' : ''}`}
              onClick={() => onLike(c)}
              aria-label="Curtir"
            >
              <ThumbUp />
              {c.likeCount > 0 && c.likeCount}
            </button>
            {canReply && (
              <button
                type="button"
                className="yt-react yt-react--text"
                onClick={() =>
                  loggedIn ? setReplyingTo((id) => (id === c.id ? null : c.id)) : goLogin()
                }
              >
                Responder
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="yt-comments">
      <h3 className="yt-comments__count">
        {total} {total === 1 ? 'comentário' : 'comentários'}
      </h3>

      {COMMENTS_ENABLED &&
        (loggedIn ? (
          <div className="yt-composer">
            <UserAvatar name={profile?.displayName ?? ''} avatarUrl={profile?.avatarUrl} />
            <div className="yt-composer__main">
              {composingTop ? (
                <Composer
                  playerName={playerName}
                  submitLabel="Comentar"
                  autoFocus
                  onSubmit={addTop}
                  onCancel={() => setComposingTop(false)}
                />
              ) : (
                <button
                  type="button"
                  className="yt-composer__fake"
                  onClick={() => setComposingTop(true)}
                >
                  Adicionar um comentário…
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="yt-login-cta">
            <p>Entre na sua conta para comentar e curtir.</p>
            <Link
              to="/entrar"
              state={{ from: location.pathname }}
              className="yt-btn yt-btn--primary"
            >
              Entrar para comentar
            </Link>
          </div>
        ))}

      {loading ? (
        <p className="yt-empty">Carregando…</p>
      ) : error ? (
        <p className="yt-empty">{error}</p>
      ) : threads.length === 0 ? (
        <p className="yt-empty">Ainda não há comentários. Seja o primeiro!</p>
      ) : (
        <div className="yt-list">
          {threads.map(({ comment, replies }) => (
            <div key={comment.id} className="yt-thread">
              {renderComment(comment, true)}

              {replyingTo === comment.id && (
                <div className="yt-replies yt-replies--composer">
                  <div className="yt-composer">
                    <UserAvatar name={profile?.displayName ?? ''} avatarUrl={profile?.avatarUrl} />
                    <div className="yt-composer__main">
                      <Composer
                        playerName={playerName}
                        submitLabel="Responder"
                        autoFocus
                        onSubmit={(b) => addReply(comment.id, b)}
                        onCancel={() => setReplyingTo(null)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {replies.length > 0 && (
                <>
                  <button
                    type="button"
                    className="yt-replies__toggle"
                    onClick={() => toggleExpanded(comment.id)}
                  >
                    {expanded.has(comment.id) ? '▾' : '▸'} {replies.length}{' '}
                    {replies.length === 1 ? 'resposta' : 'respostas'}
                  </button>
                  {expanded.has(comment.id) && (
                    <div className="yt-replies">
                      {replies.map((r) => (
                        <div key={r.id}>{renderComment(r, false)}</div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
