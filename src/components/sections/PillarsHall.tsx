import { useEffect, useRef } from 'react'
import { gsap, ScrollTrigger, prefersReducedMotion } from '../../lib/gsap'
import { useClubData } from '../../lib/data/ClubDataContext'
import GhostButton from '../ui/GhostButton'

/**
 * SEÇÃO 4 — O HALL DOS PILARES (scroll-lock / pin).
 * A seção trava na viewport e o scroll passa a controlar a transição entre
 * os 4 jogadores (ziguezague espelhado), terminando no ghost button.
 * Tudo via opacity + transform (GPU) — nada re-renderiza.
 */
interface PillarsHallProps {
  onOpenSquad?: () => void
}

export default function PillarsHall({ onOpenSquad }: PillarsHallProps) {
  const { pillars } = useClubData()
  const rootRef = useRef<HTMLElement>(null)
  const slidesRef = useRef<(HTMLDivElement | null)[]>([])
  const closingRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const slides = slidesRef.current.filter(Boolean) as HTMLDivElement[]
    const closing = closingRef.current!

    if (prefersReducedMotion()) {
      // Versão estática: tudo visível, empilhado, sem pin.
      gsap.set(slides, { position: 'relative', opacity: 1, clearProps: 'transform' })
      gsap.set(closing, { position: 'relative', opacity: 1 })
      return
    }

    const ctx = gsap.context(() => {
      // Estado inicial: só o primeiro pilar visível.
      gsap.set(slides, { opacity: 0, scale: 1.04 })
      gsap.set(slides[0], { opacity: 1, scale: 1 })
      gsap.set(closing, { opacity: 0, y: 30 })

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: rootRef.current,
          start: 'top top',
          // Mais distância de scroll por pilar → cada um "segura" mais tempo.
          end: () => `+=${(pillars.length + 2) * window.innerHeight}`,
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
        },
      })

      const HOLD = 1.4 // tempo de leitura de cada pilar (relativo ao scrub)
      const FADE = 0.5 // duração do crossfade

      // Hold inicial: o primeiro pilar permanece antes de qualquer troca.
      tl.to({}, { duration: HOLD })

      // Crossfade entre pilares consecutivos, com hold de leitura após cada um.
      for (let i = 1; i < slides.length; i++) {
        tl.to(slides[i - 1], { opacity: 0, scale: 0.97, duration: FADE }, `seg${i}`)
        tl.to(slides[i], { opacity: 1, scale: 1, duration: FADE }, `seg${i}`)
        tl.to({}, { duration: HOLD }) // respiro de leitura
      }

      // Fecha o último pilar e revela o ghost button.
      tl.to(slides[slides.length - 1], { opacity: 0, scale: 0.97, duration: FADE }, 'close')
      tl.to(closing, { opacity: 1, y: 0, duration: FADE }, 'close')
      tl.to({}, { duration: HOLD })
    }, rootRef)

    return () => {
      ctx.revert()
      ScrollTrigger.refresh()
    }
  }, [])

  return (
    <section id="pilares" ref={rootRef} className="relative h-screen w-full overflow-hidden bg-[var(--color-ink)]">
      <span className="eyebrow absolute left-[8vw] top-12 z-20">O Hall dos Pilares</span>

      {pillars.map((p, i) => {
        const photoRight = i % 2 === 1 // ziguezague
        return (
          <div
            key={p.id}
            ref={(el) => {
              slidesRef.current[i] = el
            }}
            className="absolute inset-0 flex items-center justify-center px-[8vw]"
          >
            <div className="grid w-full max-w-6xl grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12 2xl:max-w-7xl 2xl:gap-16">
              {/* Foto (placeholder esmaecido nas bordas) */}
              <div className={`order-1 ${photoRight ? 'md:order-2' : 'md:order-1'}`}>
                <div className="relative mx-auto block w-full max-w-[13rem] overflow-hidden sm:max-w-[15rem] md:max-w-[clamp(16rem,26vw,36rem)]">
                  {/* O Overlay que cria a sombra interna (Fade) em todos os lados */}
                  <div className="absolute inset-0 z-10 pointer-events-none shadow-[inset_0_0_10px_rgba(0,0,0,1)] bg-gradient-to-t from-black via-transparent to-black before:absolute before:inset-0 before:bg-gradient-to-r before:from-black before:via-transparent before:to-black" />

                  {/* A sua Imagem original */}
                  <img
                    src={p.photo ?? undefined}
                    alt={p.name}
                    className="h-full w-full object-contain"
                  />
                </div>
              </div>

              {/* Especificações */}
              <div
                className={`order-2 text-center ${photoRight ? 'md:order-1 md:text-right' : 'md:order-2 md:text-left'
                  }`}
              >
                <span
                  className="text-sm font-medium uppercase tracking-[0.24em]"
                  style={{ color: p.accent === 'gold' ? 'var(--color-gold)' : 'var(--color-accent)' }}
                >
                  {p.position}
                </span>
                <h3 className="mt-3 text-[clamp(2.5rem,9vw,6rem)] font-bold uppercase leading-[0.9] md:text-[clamp(3rem,6vw,6rem)]">
                  {p.name}
                </h3>
                <p className="mt-4 text-lg italic text-[var(--text-70)] md:mt-6 md:text-xl">{p.dilemma}</p>
                <p
                  className={`mt-5 max-w-md text-[var(--text-50)] leading-relaxed mx-auto md:mx-0 ${photoRight ? 'md:ml-auto' : ''
                    }`}
                >
                  {p.description}
                </p>
              </div>
            </div>
          </div>
        )
      })}

      {/* Fechamento — ghost button */}
      <div
        ref={closingRef}
        className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center"
      >
        <p className="mb-8 max-w-md text-lg text-[var(--text-70)]">
          Quatro pilares. Um elenco inteiro esperando para ser conhecido.
        </p>
        <GhostButton cursorLabel="Ver Elenco" onClick={onOpenSquad}>
          Ver Elenco Completo →
        </GhostButton>
      </div>
    </section>
  )
}
