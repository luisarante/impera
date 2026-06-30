import { useEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from '../../lib/gsap'

interface CounterProps {
  to: number
  prefix?: string
  duration?: number // ms
}

/**
 * Conta de 0 até `to` quando entra no campo de visão (uma vez só).
 * Usa Intersection Observer + requestAnimationFrame com easing.
 */
export default function Counter({ to, prefix = '', duration = 1000 }: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [value, setValue] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (prefersReducedMotion()) {
      setValue(to)
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !started.current) {
            started.current = true
            const start = performance.now()
            const tick = (now: number) => {
              const p = Math.min(1, (now - start) / duration)
              // easeOutExpo
              const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p)
              setValue(Math.round(eased * to))
              if (p < 1) requestAnimationFrame(tick)
            }
            requestAnimationFrame(tick)
          }
        })
      },
      { threshold: 0.6 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [to, duration])

  return (
    <span ref={ref}>
      {prefix}
      {value.toLocaleString('pt-BR')}
    </span>
  )
}
