import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { gsap, prefersReducedMotion } from '../../lib/gsap'
import { lenisScrollTo } from '../../lib/useLenis'
import { useClubData } from '../../lib/data/ClubDataContext'

/**
 * SEÇÃO 5 — A JORNADA MAGNÉTICA.
 * Dentro desta seção o scroll é "capturado": cada gesto avança ou volta
 * exatamente um marco, centralizando-o com uma transição bem suave.
 * A linha curva (serpentina, em forma circular) começa SEM cor no primeiro
 * marco e se preenche exatamente conforme a posição do scroll — só colorindo o
 * trecho já percorrido. Ao alcançar o último marco, vira dourada com brilho.
 *
 * O path é desenhado em coordenadas de pixel (viewBox = dimensões reais) para
 * evitar distorção e o artefato de dasharray do `non-scaling-stroke`.
 */

const DUR = 1.15 // segundos (transição entre marcos)
// easeInOutCubic — usado tanto no scroll (Lenis) quanto, implicitamente, no fill.
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

export default function MagneticTimeline() {
  const { milestones } = useClubData()
  const rootRef = useRef<HTMLElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const drawRef = useRef<SVGPathElement>(null)
  const panelsRef = useRef<(HTMLDivElement | null)[]>([])

  const n = milestones.length
  const [dims, setDims] = useState({ w: 1440, h: n * 900 })

  // Mede as dimensões reais da seção (e atualiza no resize).
  useLayoutEffect(() => {
    const measure = () =>
      setDims({ w: window.innerWidth, h: n * window.innerHeight })
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [n])

  // Pontos centrados em cada marco, alternando lados (ziguezague suave), em px.
  const points = useMemo(() => {
    const amp = Math.min(dims.w * 0.18, 260)
    const panelH = dims.h / n
    return milestones.map((_, i) => ({
      x: dims.w / 2 + (i % 2 === 0 ? -amp : amp),
      y: (i + 0.5) * panelH,
    }))
  }, [dims, n])

  // Caminho serpentina com curvas de Bézier suaves entre marcos consecutivos.
  const d = useMemo(() => {
    const k = dims.h / n / 2 // tensão = meia altura de painel
    let path = `M ${points[0].x} ${points[0].y}`
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1]
      const b = points[i]
      path += ` C ${a.x} ${a.y + k}, ${b.x} ${b.y - k}, ${b.x} ${b.y}`
    }
    return path
  }, [points, dims, n])

  useEffect(() => {
    const draw = drawRef.current!
    const svg = svgRef.current!

    // Comprimento real do traço (px) para o efeito "draw on".
    const len = draw.getTotalLength()
    gsap.set(draw, { strokeDasharray: len })

    // Acessibilidade / sem Lenis: linha cheia e estática, scroll nativo.
    if (prefersReducedMotion()) {
      gsap.set(draw, { strokeDashoffset: 0 })
      return
    }

    // Estado inicial: linha vazia.
    gsap.set(draw, { strokeDashoffset: len })

    // Preenchimento dirigido pela posição REAL do scroll.
    const updateFill = () => {
      const root = rootRef.current
      if (!root) return
      const rect = root.getBoundingClientRect()
      if (rect.bottom < 0 || rect.top > window.innerHeight) return // fora da tela
      const sectionTop = rect.top + window.scrollY
      const span = (n - 1) * window.innerHeight // marco0 centrado → último centrado
      const frac = Math.max(0, Math.min(1, (window.scrollY - sectionTop) / span))
      draw.style.strokeDashoffset = String(len * (1 - frac))
      svg.classList.toggle('is-gold', frac > 0.9)
    }
    gsap.ticker.add(updateFill)

    const panels = () => panelsRef.current.filter(Boolean) as HTMLDivElement[]

    let idx = 0
    let engaged = false
    let releaseDir = 0
    let animating = false

    const centerY = () => window.innerHeight / 2
    const targetY = (i: number) =>
      panelsRef.current[i]!.getBoundingClientRect().top + window.scrollY

    const nearestIndex = () => {
      const cy = centerY()
      let best = 0
      let bestDist = Infinity
      panels().forEach((el, i) => {
        const r = el.getBoundingClientRect()
        const mid = (r.top + r.bottom) / 2
        const dist = Math.abs(mid - cy)
        if (dist < bestDist) {
          bestDist = dist
          best = i
        }
      })
      return best
    }

    const sectionInView = () => {
      const r = rootRef.current!.getBoundingClientRect()
      const cy = centerY()
      return r.top <= cy && r.bottom >= cy
    }

    const pulse = (i: number) => {
      const date = panelsRef.current[i]?.querySelector('.ms-date') as HTMLElement | null
      if (!date) return
      date.classList.remove('milestone-pulse')
      void date.offsetWidth
      date.classList.add('milestone-pulse')
    }

    const goTo = (i: number) => {
      i = Math.max(0, Math.min(n - 1, i))
      idx = i
      animating = true

      // Conteúdo do marco entra de leve (clean/fluido). O preenchimento da
      // linha NÃO é animado aqui — segue a posição real do scroll no ticker.
      const content = panelsRef.current[i]?.querySelector('.ms-content') as HTMLElement | null
      if (content) {
        gsap.fromTo(
          content,
          { opacity: 0.35, scale: 0.985, y: 18 },
          { opacity: 1, scale: 1, y: 0, duration: DUR * 0.85, ease: 'power2.out', overwrite: true },
        )
      }

      lenisScrollTo(targetY(i), {
        duration: DUR,
        easing: easeInOutCubic,
        lock: true,
        onComplete: () => {
          pulse(i)
          setTimeout(() => {
            animating = false
          }, 90)
        },
      })
    }

    const capture = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }

    const onWheel = (e: WheelEvent) => {
      if (!sectionInView()) {
        engaged = false
        releaseDir = 0
        return
      }
      if (animating) {
        capture(e)
        return
      }

      const dir = e.deltaY > 0 ? 1 : -1

      if (!engaged) {
        if (releaseDir !== 0 && dir === releaseDir) return // continua saindo
        engaged = true
        releaseDir = 0
        capture(e)
        goTo(nearestIndex())
        return
      }

      const target = idx + dir
      if (target < 0 || target >= n) {
        engaged = false
        releaseDir = dir
        return
      }
      capture(e)
      goTo(target)
    }

    window.addEventListener('wheel', onWheel, { passive: false, capture: true })

    return () => {
      gsap.ticker.remove(updateFill)
      window.removeEventListener('wheel', onWheel, { capture: true } as EventListenerOptions)
    }
  }, [n, d])

  return (
    <section ref={rootRef} className="relative bg-[var(--color-ink)]">
      <header className="absolute left-[8vw] top-16 z-20">
        <span className="eyebrow">A Jornada</span>
      </header>

      {/* Linha curva que se desenha (SVG em coordenadas de pixel) */}
      <svg
        ref={svgRef}
        className="tl-svg pointer-events-none absolute inset-0 z-0 h-full w-full"
        viewBox={`0 0 ${dims.w} ${dims.h}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        {/* Trilho fraco com o caminho completo */}
        <path d={d} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={1.5} />
        {/* Linha animada por cima */}
        <path ref={drawRef} className="tl-line" d={d} fill="none" strokeWidth={2.5} strokeLinecap="round" />
      </svg>

      {milestones.map((m, i) => (
        <div
          key={m.id}
          ref={(el) => {
            panelsRef.current[i] = el
          }}
          className="relative z-10 flex min-h-screen flex-col items-center justify-center px-[8vw] text-center"
        >
          <div className="ms-content flex flex-col items-center">
            <span className="ms-date text-[clamp(3rem,7vw,6.5rem)] font-light leading-none tracking-[0.04em] text-[var(--color-paper)]">
              {m.date}
            </span>
            <h3 className="mt-8 text-2xl font-medium uppercase tracking-[0.12em] text-[var(--color-accent)]">
              {m.title}
            </h3>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-[var(--text-70)]">{m.text}</p>
          </div>
        </div>
      ))}
    </section>
  )
}
