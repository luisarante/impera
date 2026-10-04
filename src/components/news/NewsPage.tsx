import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useClubData } from '../../lib/data/ClubDataContext'
import { officialAccounts, type OfficialAccount } from '../../data/officialAccounts'
import AccountMenu from '../account/AccountMenu'
import OfficialAvatar from './OfficialAvatar'
import FeedIcon from './FeedIcon'
import FeedPost from './FeedPost'
import '../../styles/news-feed.css'

const STORAGE_KEY = 'impera.news.preferences.v1'
type Preferences = { liked: string[]; saved: string[] }

function readPreferences(): Preferences {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : []
    return { liked: strings(stored.liked), saved: strings(stored.saved) }
  } catch {
    return { liked: [], saved: [] }
  }
}

export default function NewsPage() {
  const { news } = useClubData()
  const [params, setParams] = useSearchParams()
  const [preferences, setPreferences] = useState(readPreferences)
  const [storageMessage, setStorageMessage] = useState('')
  const requested = params.get('perfil')
  const selected = requested === 'imperafc' || requested === 'imperaow' ? requested : null
  const savedOnly = params.get('aba') === 'salvos'
  const profile = selected ? officialAccounts[selected] : null
  const posts = news.filter((post) => (!selected || post.officialAccount === selected) && (!savedOnly || preferences.saved.includes(post.id)))

  useEffect(() => { window.scrollTo(0, 0) }, [selected, savedOnly])

  function togglePreference(kind: keyof Preferences, id: string) {
    const values = preferences[kind]
    const next = { ...preferences, [kind]: values.includes(id) ? values.filter((value) => value !== id) : [...values, id] }
    setPreferences(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      setStorageMessage('')
    } catch {
      setStorageMessage('O navegador não permitiu salvar. Suas escolhas ficarão disponíveis apenas nesta sessão.')
    }
  }

  function selectProfile(account: OfficialAccount | null) {
    setParams(account ? { perfil: account } : {})
  }

  return (
    <div className="instagram-page">
      <aside className="feed-sidebar" aria-label="Navegação do feed">
        <Link to="/" className="feed-wordmark">impera<span>↗</span></Link>
        <nav>
          <Link to="/noticias" className={!savedOnly && !selected ? 'is-active' : ''} aria-current={!savedOnly && !selected ? 'page' : undefined}><FeedIcon name="home" /><span>Página inicial</span></Link>
          <Link to="/noticias?aba=salvos" className={savedOnly ? 'is-active' : ''} aria-current={savedOnly ? 'page' : undefined}><FeedIcon name="bookmark" /><span>Salvos</span></Link>
          <Link to="/"><FeedIcon name="game" /><span>Nossos jogos</span></Link>
        </nav>
        <div className="feed-sidebar__accounts"><span>CONTAS OFICIAIS</span>
          {Object.values(officialAccounts).map((account) => (
            <Link key={account.handle} to={`/noticias?perfil=${account.handle}`} className={selected === account.handle ? 'is-active' : ''}><OfficialAvatar account={account.handle} /><span>{account.handle}</span></Link>
          ))}
        </div>
        <div className="feed-sidebar__bottom"><AccountMenu /><p>Dois jogos. A mesma paixão.</p><Link to="/">← Voltar ao site</Link></div>
      </aside>

      <header className="feed-mobile-header"><Link to="/" className="feed-wordmark">impera<span>↗</span></Link><AccountMenu /></header>

      <div className="feed-layout">
        <main className="feed-main">
          <header className="feed-heading">
            <h1>{savedOnly ? 'Salvos' : profile ? `@${profile.handle}` : 'Seu feed'}</h1>
            <span>{savedOnly ? 'Neste navegador' : 'Mais recentes'}</span>
          </header>

          {!savedOnly && <nav className="feed-stories" aria-label="Filtrar por conta oficial">
            <button type="button" onClick={() => selectProfile(null)} aria-pressed={!selected} className={!selected ? 'is-active' : ''}><span className="feed-story-ring feed-story-ring--all"><span className="feed-story-all"><FeedIcon name="grid" /></span></span><span>Todos</span></button>
            {Object.values(officialAccounts).map((account) => (
              <button type="button" key={account.handle} onClick={() => selectProfile(account.handle)} aria-pressed={selected === account.handle} className={selected === account.handle ? 'is-active' : ''}><span className={`feed-story-ring feed-story-ring--${account.handle}`}><OfficialAvatar account={account.handle} large /></span><span>{account.handle}</span></button>
            ))}
          </nav>}

          {profile && selected && (
            <section className="feed-profile" aria-label={`Perfil @${profile.handle}`}>
              <div className="feed-profile__top"><OfficialAvatar account={selected} large /><div><h2>{profile.handle} <span className="feed-verified" aria-label="Conta oficial"><FeedIcon name="check" filled /></span></h2><p><strong>{posts.length}</strong> publicações</p><span>{profile.game} · Conta oficial</span></div></div>
              <h3>{profile.name}</h3><p>{profile.bio}</p><Link to={profile.path}>Página de {profile.game} ↗</Link>
            </section>
          )}

          {storageMessage && <p className="feed-notice" role="status">{storageMessage}</p>}
          {posts.length === 0 ? (
            <section className="feed-empty"><span><FeedIcon name={savedOnly ? 'bookmark' : 'grid'} /></span><h2>{savedOnly ? 'Guarde o que vale rever' : 'Ainda sem publicações'}</h2><p>{savedOnly ? 'Toque no marcador de uma publicação para encontrá-la aqui. Seus salvos ficam neste navegador.' : `As novidades de @${profile?.handle ?? 'impera'} vão aparecer aqui.`}</p><Link to="/noticias">Explorar o feed</Link></section>
          ) : (
            <div className="feed-posts">
              {posts.map((post) => <FeedPost key={post.id} post={post} liked={preferences.liked.includes(post.id)} saved={preferences.saved.includes(post.id)} onLike={() => togglePreference('liked', post.id)} onSave={() => togglePreference('saved', post.id)} />)}
              <div className="feed-end"><span><FeedIcon name="check" /></span><strong>Você está em dia</strong><p>Essas são todas as publicações {savedOnly ? 'salvas por você' : profile ? `de @${profile.handle}` : 'do Impera'}.</p></div>
            </div>
          )}
        </main>

        <aside className="feed-suggestions" aria-label="Contas oficiais do Impera">
          <div className="feed-suggestions__intro"><span className="feed-impera-avatar">i↗</span><div><strong>O universo Impera</strong><p>EAFC & Overwatch</p></div></div>
          <div className="feed-suggestions__title"><h2>Contas para acompanhar</h2><Link to="/noticias">Ver todas</Link></div>
          {Object.values(officialAccounts).map((account) => (
            <div className="feed-suggestion" key={account.handle}><Link to={`/noticias?perfil=${account.handle}`}><OfficialAvatar account={account.handle} /><span><strong>{account.handle} <span className="feed-verified" aria-label="Conta oficial"><FeedIcon name="check" filled /></span></strong><small>{account.name} · {account.game}</small></span></Link><Link to={`/noticias?perfil=${account.handle}`} aria-label={`Ver perfil @${account.handle}`}>Ver perfil</Link></div>
          ))}
          <div className="feed-suggestions__footer"><Link to="/">Sobre o Impera</Link><span>·</span><Link to="/eafc">EAFC</Link><span>·</span><Link to="/overwatch">Overwatch</Link><p>Notícias e bastidores. Dentro e fora do jogo.</p><small>© {new Date().getFullYear()} IMPERA</small></div>
        </aside>
      </div>

      <nav className="feed-mobile-nav" aria-label="Navegação móvel">
        <Link to="/noticias" aria-label="Feed" aria-current={!savedOnly && !selected ? 'page' : undefined}><FeedIcon name="home" /></Link>
        <Link to="/" aria-label="Nossos jogos"><FeedIcon name="game" /></Link>
        <Link to="/noticias?aba=salvos" aria-label="Salvos" aria-current={savedOnly ? 'page' : undefined}><FeedIcon name="bookmark" filled={savedOnly} /></Link>
        <Link to="/noticias?perfil=imperafc" aria-label="Perfil @imperafc"><OfficialAvatar account="imperafc" /></Link>
        <Link to="/noticias?perfil=imperaow" aria-label="Perfil @imperaow"><OfficialAvatar account="imperaow" /></Link>
      </nav>
    </div>
  )
}
