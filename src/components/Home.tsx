import { useNavigate } from 'react-router-dom'
import { useLenis } from '../lib/useLenis'
import HomeNav from './HomeNav'
import Hero from './sections/Hero'
import BigNumbers from './sections/BigNumbers'
import SilviaNews from './sections/SilviaNews'
import PillarsHall from './sections/PillarsHall'
import MagneticTimeline from './sections/MagneticTimeline'
import GalleryTeaser from './sections/GalleryTeaser'
import KitRoom from './sections/KitRoom'
import FinalWhistle from './sections/FinalWhistle'

/**
 * Página inicial — a experiência imersiva com scroll suave (Lenis) e as seções
 * do clube. O botão "Ver Elenco Completo" navega para a página dedicada do elenco.
 */
export default function Home() {
  useLenis()
  const navigate = useNavigate()

  return (
    <main>
      <HomeNav />
      <Hero />
      <BigNumbers />
      <SilviaNews />
      <PillarsHall onOpenSquad={() => navigate('/elenco')} />
      <MagneticTimeline />
      <GalleryTeaser />
      <KitRoom />
      <FinalWhistle />
    </main>
  )
}
