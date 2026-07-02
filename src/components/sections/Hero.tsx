import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { gsap, ScrollTrigger } from '../../lib/gsap'
import { useClubData } from '../../lib/data/ClubDataContext'
import Badge from '../ui/Badge'
import GhostButton from '../ui/GhostButton'

/**
 * SEÇÃO 1 — HERO cine-minimalista.
 * Vídeo de fundo (placeholder) + overlay que escurece até 100% no scroll,
 * fundindo-se nativamente no preto da Seção 2 (fade-into-black).
 */
export default function Hero() {
  const { club, heroUrl } = useClubData()
  const navigate = useNavigate()
  const sectionRef = useRef<HTMLElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Fade-into-black: overlay vai a opaco conforme rola a hero.
      gsap.fromTo(
        overlayRef.current,
        { '--ov': 0.55 },
        {
          '--ov': 1,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
          },
        },
      )
      // Conteúdo sobe e some um pouco mais rápido (parallax sutil).
      gsap.to(contentRef.current, {
        y: -80,
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: 'bottom center',
          scrub: true,
        },
      })
    }, sectionRef)

    return () => {
      ctx.revert()
      ScrollTrigger.refresh()
    }
  }, [])

  return (
    <section id="inicio" ref={sectionRef} className="relative h-screen w-full overflow-hidden">
      {/* Vídeo cinematográfico (trocar /assets/hero.mp4). Fallback: pitch animado. */}
      {/* <div className="hero-pitch absolute inset-0" aria-hidden />
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        poster=""
      >
        <source src="/assets/hero.mp4" type="video/mp4" />
      </video> */}
      <img
        src={heroUrl ?? '/assets/hero.jpeg'}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        onError={(e) => {
          // Se a imagem do bucket falhar, cai no asset local empacotado.
          const img = e.currentTarget
          if (img.src !== window.location.origin + '/assets/hero.jpeg') {
            img.src = '/assets/hero.jpeg'
          }
        }}
      />

      {/* Overlay escuro denso → fade-into-black */}
      <div
        ref={overlayRef}
        className="absolute inset-0"
        style={{
          // @ts-expect-error custom property
          '--ov': 0.55,
          background:
            'radial-gradient(120% 90% at 50% 35%, rgba(0,0,0,calc(var(--ov) * 0.7)) 0%, rgba(0,0,0,var(--ov)) 70%, #000 100%)',
        }}
      />

      {/* Fade linear inferior para suavizar a transição com a próxima seção */}
      <div className="absolute bottom-0 left-0 right-0 h-36 bg-gradient-to-t from-black to-transparent pointer-events-none" />

      {/* Conteúdo */}
      <div
        ref={contentRef}
        className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center"
      >
        <Badge size={110} glow />
        <h1 className="mt-10 text-[clamp(3rem,9vw,8.5rem)] font-bold uppercase leading-[0.92] tracking-[-0.03em]">
          {club.name}
        </h1>
        <p className="mt-6 max-w-md text-sm uppercase tracking-[0.32em] text-[var(--text-70)]">
          {club.tagline}
        </p>
        <div className="mt-8">
          <GhostButton cursorLabel="Ver jogos" onClick={() => navigate('/jogos')}>
            Últimos jogos →
          </GhostButton>
        </div>
      </div>

      {/* Indicador de scroll */}
      {/* <div className="absolute bottom-10 left-1/2 z-10 -translate-x-1/2">
        <div className="scroll-hint" aria-hidden>
          <span className="s croll-hint__dot" />
        </div>
        <p className="mt-3 text-[0.6rem] uppercase tracking-[0.3em] text-[var(--text-50)]">
          Role para entrar
        </p>
      </div> */}
    </section>
  )
}
