import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { gsap, prefersReducedMotion } from '../../lib/gsap'
import { useAuth } from '../../admin/auth'
import { timeAgo } from '../../lib/time'
import {
  addPollOption,
  castPollVote,
  fetchTopic,
  removePollOption,
  toggleTopicLike,
  updatePollOption,
  type PollOption,
  type ReplyThread,
  type TopicDetail,
} from '../../lib/community'
import UserAvatar from '../ui/UserAvatar'
import CommunityReplies from './CommunityReplies'

const ThumbUp = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
  </svg>
)

function PollBlock({
  topicId,
  options,
  totalVotes,
  myVoteOptionId,
  canManage,
  loggedIn,
  onGoLogin,
  onChange,
}: {
  topicId: string
  options: PollOption[]
  totalVotes: number
  myVoteOptionId: string | null
  canManage: boolean
  loggedIn: boolean
  onGoLogin: () => void
  onChange: (updater: (d: TopicDetail) => TopicDetail) => void
}) {
  const [addingOption, setAddingOption] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingLabel, setEditingLabel] = useState('')

  async function vote(optionId: string) {
    if (!loggedIn) return onGoLogin()
    const prevVote = myVoteOptionId
    onChange((d) => ({
      ...d,
      myVoteOptionId: optionId,
      pollOptions: d.pollOptions.map((o) => ({
        ...o,
        votes: o.votes + (o.id === optionId ? 1 : 0) - (o.id === prevVote ? 1 : 0),
      })),
      totalVotes: d.totalVotes + (prevVote ? 0 : 1),
    }))
    try {
      await castPollVote(topicId, optionId)
    } catch {
      onChange((d) => ({
        ...d,
        myVoteOptionId: prevVote,
        pollOptions: d.pollOptions.map((o) => ({
          ...o,
          votes: o.votes - (o.id === optionId ? 1 : 0) + (o.id === prevVote ? 1 : 0),
        })),
        totalVotes: d.totalVotes - (prevVote ? 0 : 1),
      }))
    }
  }

  async function addOption() {
    const label = addingOption.trim()
    if (!label) return
    try {
      const created = await addPollOption(topicId, label, options.length)
      onChange((d) => ({ ...d, pollOptions: [...d.pollOptions, created], topic: { ...d.topic, hasPoll: true } }))
      setAddingOption('')
    } catch {
      // silencioso: usuário pode tentar de novo
    }
  }

  async function saveEdit(id: string) {
    const label = editingLabel.trim()
    if (!label) return
    await updatePollOption(id, label)
    onChange((d) => ({ ...d, pollOptions: d.pollOptions.map((o) => (o.id === id ? { ...o, label } : o)) }))
    setEditingId(null)
  }

  async function removeOption(id: string) {
    await removePollOption(id)
    onChange((d) => ({
      ...d,
      pollOptions: d.pollOptions.filter((o) => o.id !== id),
      myVoteOptionId: d.myVoteOptionId === id ? null : d.myVoteOptionId,
    }))
  }

  return (
    <div className="community-poll">
      {options.map((o) => {
        const pct = totalVotes > 0 ? Math.round((o.votes / totalVotes) * 100) : 0
        const isMine = o.id === myVoteOptionId
        const isEditing = editingId === o.id
        return (
          <div key={o.id} className={`community-poll__option${isMine ? ' is-voted' : ''}`}>
            {isEditing ? (
              <div className="community-poll__edit-row">
                <input
                  className="community-poll-option-input"
                  value={editingLabel}
                  onChange={(e) => setEditingLabel(e.target.value)}
                  maxLength={120}
                  autoFocus
                />
                <button type="button" className="yt-btn yt-btn--primary" onClick={() => saveEdit(o.id)}>
                  Salvar
                </button>
                <button type="button" className="yt-btn yt-btn--ghost" onClick={() => setEditingId(null)}>
                  Cancelar
                </button>
              </div>
            ) : (
              <button type="button" className="community-poll__button" onClick={() => vote(o.id)}>
                <span className="community-poll__bar" style={{ width: `${pct}%` }} aria-hidden />
                <span className="community-poll__label">{o.label}</span>
                <span className="community-poll__pct">
                  {pct}% · {o.votes}
                </span>
              </button>
            )}
            {canManage && !isEditing && (
              <div className="community-poll__manage">
                <button
                  type="button"
                  className="yt-react yt-react--text"
                  onClick={() => {
                    setEditingId(o.id)
                    setEditingLabel(o.label)
                  }}
                >
                  Editar
                </button>
                <button type="button" className="yt-react yt-react--text" onClick={() => removeOption(o.id)}>
                  Remover
                </button>
              </div>
            )}
          </div>
        )
      })}

      {canManage && options.length < 6 && (
        <div className="community-poll__add">
          <input
            className="community-poll-option-input"
            placeholder="Nova opção…"
            value={addingOption}
            onChange={(e) => setAddingOption(e.target.value)}
            maxLength={120}
          />
          <button type="button" className="yt-btn yt-btn--ghost" onClick={addOption} disabled={!addingOption.trim()}>
            + Opção
          </button>
        </div>
      )}

      <p className="news-meta">
        {totalVotes} {totalVotes === 1 ? 'voto' : 'votos'}
      </p>
    </div>
  )
}

/** Página de um tópico único da comunidade (/comunidade/:id). */
export default function CommunityTopicPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { session } = useAuth()
  const loggedIn = !!session
  const rootRef = useRef<HTMLDivElement>(null)

  const [detail, setDetail] = useState<TopicDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const goBack = useCallback(() => {
    if (location.state && (location.state as { from?: string }).from) navigate(-1)
    else navigate('/comunidade')
  }, [navigate, location.state])

  const goLogin = () => navigate('/entrar', { state: { from: location.pathname } })

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
    if (!id) return
    let alive = true
    setLoading(true)
    fetchTopic(id)
      .then((d) => alive && setDetail(d))
      .catch(() => alive && setError('Não foi possível carregar o tópico.'))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [id])

  useLayoutEffect(() => {
    if (prefersReducedMotion() || !rootRef.current || loading) return
    const ctx = gsap.context(() => {
      gsap.from('[data-anim="head"]', { y: -24, opacity: 0, duration: 0.5, ease: 'power3.out' })
      gsap.from('[data-anim="body"]', { opacity: 0, y: 24, duration: 0.5, ease: 'power3.out', delay: 0.1 })
    }, rootRef)
    return () => ctx.revert()
  }, [loading])

  async function onLikeTopic() {
    if (!detail) return
    if (!loggedIn) return goLogin()
    const like = !detail.topic.likedByMe
    setDetail((d) =>
      d
        ? { ...d, topic: { ...d.topic, likedByMe: like, likeCount: d.topic.likeCount + (like ? 1 : -1) } }
        : d,
    )
    try {
      await toggleTopicLike(detail.topic.id, like)
    } catch {
      setDetail((d) =>
        d
          ? { ...d, topic: { ...d.topic, likedByMe: !like, likeCount: d.topic.likeCount + (like ? -1 : 1) } }
          : d,
      )
    }
  }

  function setThreads(updater: (prev: ReplyThread[]) => ReplyThread[]) {
    setDetail((d) => (d ? { ...d, threads: updater(d.threads) } : d))
  }

  if (loading) {
    return (
      <div className="news-page">
        <p className="news-empty">Carregando…</p>
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="news-page">
        <header className="squad-head">
          <button type="button" className="squad-back" onClick={goBack}>
            ← Voltar
          </button>
          <div className="squad-title">
            <span className="eyebrow">Comunidade</span>
          </div>
          <span />
        </header>
        <p className="news-empty">{error ?? 'Tópico não encontrado.'}</p>
      </div>
    )
  }

  const { topic } = detail

  return (
    <div ref={rootRef} className="news-page" aria-label={topic.title}>
      <header className="squad-head" data-anim="head">
        <button type="button" className="squad-back" data-cursor="Voltar" onClick={goBack}>
          ← Voltar
        </button>
        <div className="squad-title">
          <span className="eyebrow">Comunidade</span>
          <h2>{topic.title}</h2>
        </div>
        <span />
      </header>

      <div className="community-topic" data-anim="body">
        <article className="community-topic__post">
          <div className="community-topic__author">
            <UserAvatar name={topic.author} avatarUrl={topic.authorAvatarUrl} size="md" />
            <div>
              <span className="yt-comment__author">{topic.author}</span>
              <time className="yt-comment__time"> · {timeAgo(topic.createdAt)}</time>
            </div>
          </div>
          <p className="community-topic__body">{topic.body}</p>
          <button
            type="button"
            className={`yt-react${topic.likedByMe ? ' is-active' : ''}`}
            onClick={onLikeTopic}
            aria-label="Curtir"
          >
            <ThumbUp />
            {topic.likeCount > 0 && topic.likeCount}
          </button>
        </article>

        {topic.hasPoll && (
          <PollBlock
            topicId={topic.id}
            options={detail.pollOptions}
            totalVotes={detail.totalVotes}
            myVoteOptionId={detail.myVoteOptionId}
            canManage={detail.canManagePoll}
            loggedIn={loggedIn}
            onGoLogin={goLogin}
            onChange={(updater) => setDetail((d) => (d ? updater(d) : d))}
          />
        )}

        {!topic.hasPoll && detail.canManagePoll && (
          <PollBlock
            topicId={topic.id}
            options={[]}
            totalVotes={0}
            myVoteOptionId={null}
            canManage
            loggedIn={loggedIn}
            onGoLogin={goLogin}
            onChange={(updater) => setDetail((d) => (d ? updater(d) : d))}
          />
        )}

        <CommunityReplies topicId={topic.id} threads={detail.threads} onThreadsChange={setThreads} />
      </div>
    </div>
  )
}
