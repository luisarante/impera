import { Link } from 'react-router-dom'
import AccountMenu from './account/AccountMenu'

export default function PortalHeader() {
  return (
    <header className="portal-header">
      <Link to="/" className="portal-brand" aria-label="Impera — página inicial">IMPERA<span>↗</span></Link>
      <nav aria-label="Navegação principal">
        <Link to="/">Jogos</Link>
        <Link to="/noticias">Notícias</Link>
        <AccountMenu />
      </nav>
    </header>
  )
}
