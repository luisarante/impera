import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { gsap, prefersReducedMotion } from '../../lib/gsap'
import { useClubData } from '../../lib/data/ClubDataContext'

/**
 * PÁGINA DA GALERIA (/galeria) — grade completa de fotos do time.
 * Clicar numa foto abre o lightbox (com navegação por setas/teclado).
 */
export default function GalleryPage() {
  const navigate = useNavigate()
  const { gallery, club } = useClubData()
  const [active, setActive] = useState<number | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const goBack = useCallback(() => navigate('/'), [navigate])
  const close = useCallback(() => setActive(null), [])
  const next = useCallback(() => setActive((i) => (i === null ? i : (i + 1) % gallery.length)), [])
  const prev = useCallback(
    () => setActive((i) => (i === null ? i : (i - 1 + gallery.length) % gallery.length)),
    [],
  )

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // Teclado: Esc fecha o lightbox (ou volta); setas navegam as fotos.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (active !== null) close()
        else goBack()
      } else if (active !== null && e.key === 'ArrowRight') next()
      else if (active !== null && e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, close, goBack, next, prev])

  // Trava o scroll de fundo enquanto o lightbox está aberto.
  useEffect(() => {
    if (active === null) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [active])

  // Animação de entrada da grade.
  useLayoutEffect(() => {
    if (prefersReducedMotion() || !rootRef.current) return
    const ctx = gsap.context(() => {
      gsap.from('[data-anim="head"]', { y: -24, opacity: 0, duration: 0.5, ease: 'power3.out' })
      gsap.from('.gallery-item', {
        opacity: 0,
        y: 24,
        duration: 0.5,
        ease: 'power3.out',
        stagger: 0.05,
      })
    }, rootRef)
    return () => ctx.revert()
  }, [])

  const photo = active !== null ? gallery[active] : null

  return (
    <div ref={rootRef} className="gallery-page" aria-label="Galeria de fotos do Imperatrice FC">
      <header className="squad-head" data-anim="head">
        <button type="button" className="squad-back" data-cursor="Voltar" onClick={goBack}>
          ← Voltar
        </button>
        <div className="squad-title">
          <span className="eyebrow">Momentos · {club.name}</span>
          <h2>Galeria Completa</h2>
        </div>
        <span className="gallery-count">{gallery.length} fotos</span>
      </header>

      <div className="gallery-grid">
        {gallery.map((p, i) => (
          <button
            key={p.id}
            type="button"
            className="gallery-item"
            data-cursor="Ampliar"
            onClick={() => setActive(i)}
          >
            <img src={p.src} alt={p.caption} loading="lazy" />
            <span className="gallery-item__cap">{p.caption}</span>
          </button>
        ))}
      </div>

      {photo && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={photo.caption} onClick={close}>
          <button type="button" className="lightbox__close" data-cursor="Fechar" onClick={close}>
            ✕
          </button>
          <button
            type="button"
            className="lightbox__nav lightbox__nav--prev"
            data-cursor="Anterior"
            onClick={(e) => {
              e.stopPropagation()
              prev()
            }}
          >
            ‹
          </button>
          <figure className="lightbox__figure" onClick={(e) => e.stopPropagation()}>
            <img className="lightbox__img" src={photo.src} alt={photo.caption} />
            <figcaption className="lightbox__cap">{photo.caption}</figcaption>
          </figure>
          <button
            type="button"
            className="lightbox__nav lightbox__nav--next"
            data-cursor="Próxima"
            onClick={(e) => {
              e.stopPropagation()
              next()
            }}
          >
            ›
          </button>
        </div>
      )}
    </div>
  )
}
