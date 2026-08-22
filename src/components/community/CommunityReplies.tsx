import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  postReply,
  toggleReplyLike,
  type CommunityReply,
  type ReplyThread,
} from '../../lib/community'
import { useAuth } from '../../admin/auth'
import { timeAgo } from '../../lib/time'
import UserAvatar from '../ui/UserAvatar'

interface CommunityRepliesProps {
  topicId: string
  threads: ReplyThread[]
  onThreadsChange: (updater: (prev: ReplyThread[]) => ReplyThread[]) => void
}

const ThumbUp = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
  </svg>
)

/** Composer reutilizável (resposta de topo ou réplica) — só para logados. */
function Composer({
  submitLabel,
  autoFocus,
  onSubmit,
  onCancel,
}: {
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
        placeholder="Participe da discussão…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={1000}
        rows={2}
        autoFocus={autoFocus}
      />
      <div className="yt-composer__actions">
        {error && <span className="yt-composer__error">{error}</span>}
        <button type="button" className="yt-btn yt-btn--ghost" onClick={onCancel} disabled={posting}>
          Cancelar
        </button>
        <button type="submit" className="yt-btn yt-btn--primary" disabled={posting || !body.trim()}>
          {posting ? 'Enviando…' : submitLabel}
        </button>
      </div>
    </form>
  )
}

/** Seção de respostas de um tópico da comunidade — mesmo padrão visual de PlayerComments. */
export default function CommunityReplies({ topicId, threads, onThreadsChange }: CommunityRepliesProps) {
  const { session, profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const loggedIn = !!session

  const [composingTop, setComposingTop] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const goLogin = () => navigate('/entrar', { state: { from: location.pathname } })

  const total = useMemo(
    () => threads.reduce((n, t) => n + 1 + t.children.length, 0),
    [threads],
  )

  function updateReply(id: string, updater: (c: CommunityReply) => CommunityReply) {
    onThreadsChange((prev) =>
      prev.map((t) =>
        t.reply.id === id
          ? { ...t, reply: updater(t.reply) }
          : { ...t, children: t.children.map((r) => (r.id === id ? updater(r) : r)) },
      ),
    )
  }

  async function onLike(c: CommunityReply) {
    if (!loggedIn) return goLogin()
    const like = !c.likedByMe
    updateReply(c.id, (x) => ({ ...x, likedByMe: like, likeCount: x.likeCount + (like ? 1 : -1) }))
    try {
      await toggleReplyLike(c.id, like)
    } catch {
      updateReply(c.id, (x) => ({ ...x, likedByMe: !like, likeCount: x.likeCount + (like ? -1 : 1) }))
    }
  }

  async function addTop(body: string) {
    const created = await postReply(topicId, body)
    onThreadsChange((prev) => [{ reply: created, children: [] }, ...prev])
    setComposingTop(false)
  }

  async function addChild(parentId: string, body: string) {
    const created = await postReply(topicId, body, parentId)
    onThreadsChange((prev) =>
      prev.map((t) => (t.reply.id === parentId ? { ...t, children: [...t.children, created] } : t)),
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

  function renderReply(c: CommunityReply, canReply: boolean) {
    return (
      <div className="yt-comment">
        <UserAvatar name={c.author} avatarUrl={c.authorAvatarUrl} />
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
                onClick={() => (loggedIn ? setReplyingTo((id) => (id === c.id ? null : c.id)) : goLogin())}
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
        {total} {total === 1 ? 'resposta' : 'respostas'}
      </h3>

      {loggedIn ? (
        <div className="yt-composer">
          <UserAvatar name={profile?.displayName ?? ''} avatarUrl={profile?.avatarUrl} />
          <div className="yt-composer__main">
            {composingTop ? (
              <Composer submitLabel="Responder" autoFocus onSubmit={addTop} onCancel={() => setComposingTop(false)} />
            ) : (
              <button type="button" className="yt-composer__fake" onClick={() => setComposingTop(true)}>
                Participe da discussão…
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="yt-login-cta">
          <p>Entre na sua conta para responder e curtir.</p>
          <Link to="/entrar" state={{ from: location.pathname }} className="yt-btn yt-btn--primary">
            Entrar para responder
          </Link>
        </div>
      )}

      {threads.length === 0 ? (
        <p className="yt-empty">Ainda não há respostas. Seja o primeiro!</p>
      ) : (
        <div className="yt-list">
          {threads.map(({ reply, children }) => (
            <div key={reply.id} className="yt-thread">
              {renderReply(reply, true)}

              {replyingTo === reply.id && (
                <div className="yt-replies yt-replies--composer">
                  <div className="yt-composer">
                    <UserAvatar name={profile?.displayName ?? ''} avatarUrl={profile?.avatarUrl} />
                    <div className="yt-composer__main">
                      <Composer
                        submitLabel="Responder"
                        autoFocus
                        onSubmit={(b) => addChild(reply.id, b)}
                        onCancel={() => setReplyingTo(null)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {children.length > 0 && (
                <>
                  <button type="button" className="yt-replies__toggle" onClick={() => toggleExpanded(reply.id)}>
                    {expanded.has(reply.id) ? '▾' : '▸'} {children.length}{' '}
                    {children.length === 1 ? 'resposta' : 'respostas'}
                  </button>
                  {expanded.has(reply.id) && (
                    <div className="yt-replies">
                      {children.map((r) => (
                        <div key={r.id}>{renderReply(r, false)}</div>
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
