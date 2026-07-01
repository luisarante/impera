import { useEffect, useState } from 'react'
import { lenisScrollToEl } from '../lib/useLenis'
import { useClubData } from '../lib/data/ClubDataContext'
import Badge from './ui/Badge'

/**
 * Navegação fixa da página inicial: leva direto às seções importantes com
 * scroll suave (Lenis). Segue o visual do site — hairline verde, tipografia
 * caixa-alta espaçada, fundo translúcido que só aparece após sair da hero.
 *
 * O estado ativo acompanha a seção no centro da viewport (IntersectionObserver),
 * e no mobile os links viram um menu recolhível.
 */
const LINKS = [
  { id: 'inicio', label: 'Início' },
  { id: 'noticias', label: 'Notícias' },
  { id: 'pilares', label: 'Pilares' },
  { id: 'jornada', label: 'A Jornada' },
  { id: 'galeria', label: 'Galeria' },
  { id: 'manto', label: 'O Manto' },
] as const

export default function HomeNav() {
  const { club } = useClubData()
  const [active, setActive] = useState<string>('inicio')
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const sections = LINKS.map((l) => document.getElementById(l.id)).filter(
      (el): el is HTMLElement => el != null,
    )

    // A seção que cruza o meio da viewport vira a ativa.
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id)
        })
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    )
    sections.forEach((s) => io.observe(s))

    // Fundo do nav aparece depois de rolar além da hero.
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  const go = (id: string) => {
    setOpen(false)
    lenisScrollToEl(`#${id}`, { duration: 1.15, lock: true })
  }

  return (
    <header className={`home-nav${scrolled ? ' is-scrolled' : ''}`}>
      <button className="home-nav__brand" onClick={() => go('inicio')} data-cursor="Topo">
        <Badge size={30} />
        <span>{club.name}</span>
      </button>

      <nav className={`home-nav__links${open ? ' is-open' : ''}`}>
        {LINKS.map((l) => (
          <button
            key={l.id}
            className={`home-nav__link${active === l.id ? ' is-active' : ''}`}
            onClick={() => go(l.id)}
            data-cursor="Ir"
          >
            {l.label}
          </button>
        ))}
      </nav>

      <button
        className={`home-nav__toggle${open ? ' is-open' : ''}`}
        aria-label="Menu de seções"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        data-cursor="Menu"
      >
        <span />
        <span />
        <span />
      </button>
    </header>
  )
}
