import { useNavigate } from 'react-router-dom'
import { useClubData } from '../../lib/data/ClubDataContext'
import GhostButton from '../ui/GhostButton'

/**
 * SEÇÃO — GALERIA (teaser na home).
 * Mosaico de fotos ao fundo só para chamar atenção, com CTA para a página
 * dedicada com a galeria completa (/galeria).
 */
export default function GalleryTeaser() {
  const navigate = useNavigate()
  const { gallery } = useClubData()
  const preview = gallery.slice(0, 5)

  return (
    <section id="galeria" className="gallery-teaser">
      <div className="gallery-teaser__mosaic" aria-hidden>
        {preview.map((p) => (
          <div key={p.id} className="gallery-teaser__cell">
            <img src={p.src} alt="" loading="lazy" />
          </div>
        ))}
      </div>
      <div className="gallery-teaser__overlay" aria-hidden />

      <div className="gallery-teaser__content">
        <span className="eyebrow">Momentos</span>
        <h2 className="mt-4 text-[clamp(2.5rem,7vw,5.5rem)] font-bold uppercase leading-[0.9]">
          A Galeria
        </h2>
        <p className="mx-auto mt-6 max-w-md text-lg text-[var(--text-70)]">
          Os instantes que viraram história — gols, viradas e a resenha que ninguém vê.
        </p>
        <div className="mt-8">
          <GhostButton cursorLabel="Abrir galeria" onClick={() => navigate('/galeria')}>
            Ver Galeria Completa →
          </GhostButton>
        </div>
      </div>
    </section>
  )
}
