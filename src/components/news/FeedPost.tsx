import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { NewsItem } from '../../data/club'
import { officialAccounts } from '../../data/officialAccounts'
import OfficialAvatar from './OfficialAvatar'
import FeedIcon from './FeedIcon'

interface FeedPostProps {
  post: NewsItem
  liked: boolean
  saved: boolean
  onLike: () => void
  onSave: () => void
}

export function postDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('pt-BR', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo',
  })
}

export default function FeedPost({ post, liked, saved, onLike, onSave }: FeedPostProps) {
  const account = officialAccounts[post.officialAccount]
  const [expanded, setExpanded] = useState(false)
  const [shareStatus, setShareStatus] = useState('')
  const [imageFailed, setImageFailed] = useState(false)
  const caption = `${post.headline}${post.lead ? ` — ${post.lead}` : ''}`
  const longCaption = caption.length > 150

  async function share() {
    const url = `${window.location.origin}/noticias/${post.id}`
    try {
      if (navigator.share) {
        await navigator.share({ title: post.headline, url })
      } else {
        await navigator.clipboard.writeText(url)
        setShareStatus('Link copiado!')
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
      setShareStatus('Não foi possível compartilhar. Abra a publicação para copiar o endereço.')
    }
  }

  return (
    <article className={`feed-post feed-post--${account.handle}`} aria-label={`Publicação de @${account.handle}: ${post.headline}`}>
      <header className="feed-post__header">
        <Link to={`/noticias?perfil=${account.handle}`} className="feed-post__identity">
          <OfficialAvatar account={account.handle} />
          <span><strong>{account.handle} <span className="feed-verified" aria-label="Conta oficial"><FeedIcon name="check" filled /></span></strong><small>{account.game} · {post.kicker || 'Conta oficial'}</small></span>
        </Link>
        <Link to={`/noticias/${post.id}`} className="feed-icon-button feed-post__open" aria-label="Abrir publicação completa" title="Abrir publicação completa"><FeedIcon name="article" /></Link>
      </header>

      <Link to={`/noticias/${post.id}`} className="feed-post__media" aria-label={`Ler publicação: ${post.headline}`}>
        {post.cover && !imageFailed ? (
          <img src={post.cover} alt={post.headline} loading="lazy" onError={() => setImageFailed(true)} />
        ) : (
          <div className="feed-post__art"><span>IMPERA <span>↗</span></span><strong>{post.headline}</strong><small>@{account.handle} / {account.game}</small></div>
        )}
      </Link>

      <div className="feed-post__body">
        <div className="feed-post__actions">
          <button type="button" className={`feed-icon-button${liked ? ' is-liked' : ''}`} onClick={onLike} aria-label={liked ? 'Descurtir publicação' : 'Curtir publicação'} aria-pressed={liked} title="Curtida pessoal neste navegador"><FeedIcon name="heart" filled={liked} /></button>
          <button type="button" className="feed-icon-button" onClick={share} aria-label="Compartilhar publicação"><FeedIcon name="send" /></button>
          <button type="button" className={`feed-icon-button feed-post__save${saved ? ' is-saved' : ''}`} onClick={onSave} aria-label={saved ? 'Remover dos salvos' : 'Salvar publicação'} aria-pressed={saved} title="Salvar neste navegador"><FeedIcon name="bookmark" filled={saved} /></button>
        </div>
        {liked && <p className="feed-post__liked">Curtido por <strong>você</strong></p>}
        <p className="feed-post__caption">
          <Link to={`/noticias?perfil=${account.handle}`}>{account.handle}</Link>{' '}
          {expanded || !longCaption ? caption : `${caption.slice(0, 150).trimEnd()}…`}{' '}
          {longCaption && <button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>{expanded ? 'menos' : 'mais'}</button>}
        </p>
        <Link to={`/noticias/${post.id}`} className="feed-post__read">Ver publicação completa</Link>
        <time className="feed-post__date" dateTime={post.publishedAt}>{postDate(post.publishedAt)}</time>
        <p className="feed-post__status" role="status">{shareStatus}</p>
      </div>
    </article>
  )
}
