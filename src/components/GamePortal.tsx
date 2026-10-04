import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PortalHeader from './PortalHeader'
import { loadOverwatchCover } from '../lib/overwatchCover'

export default function GamePortal() {
  const [overwatchCover, setOverwatchCover] = useState<string | null>(null)
  useEffect(() => { window.scrollTo(0, 0) }, [])
  useEffect(() => {
    let active = true
    loadOverwatchCover().then((url) => { if (active) setOverwatchCover(url) }).catch(() => {})
    return () => { active = false }
  }, [])

  return (
    <div className="impera-page portal-home">
      <PortalHeader />
      <main className="portal-main">
        <div className="portal-intro">
          <h1>Jogos</h1>
        </div>
        <div className="game-portals">
          <Link to="/eafc" className="game-portal game-portal--fc">
            <div className="game-portal__art game-portal__art--fc" aria-hidden="true" />
            <div className="game-portal__content">
              <span className="portal-eyebrow">@imperafc</span>
              <h2>EAFC<span>↗</span></h2>
            </div>
          </Link>
          <Link to="/overwatch" className="game-portal game-portal--ow">
            <div className="game-portal__art game-portal__art--ow" aria-hidden="true">
              {overwatchCover && <img src={overwatchCover} alt="" onError={() => setOverwatchCover(null)} />}
            </div>
            <div className="game-portal__content">
              <span className="portal-eyebrow">@imperaow</span>
              <h2>OVERWATCH<span>↗</span></h2>
            </div>
          </Link>
        </div>
        <section className="portal-news-link" aria-label="Notícias da Impera">
          <div className="portal-news-link__info">
            <span className="portal-eyebrow">Atualizações da Impera</span>
            <h2>Notícias</h2>
            <p>Posts de @imperafc e @imperaow.</p>
          </div>
          <Link to="/noticias" className="portal-button">Abrir notícias <span aria-hidden="true">↗</span></Link>
        </section>
      </main>
      <footer className="portal-footer"><span>IMPERA</span><span>EAFC & Overwatch</span></footer>
    </div>
  )
}
