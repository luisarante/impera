import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../lib/gsap'

/**
 * Cursor custom: um círculo vazado que segue o mouse com interpolação suave.
 * Ao passar por elementos com [data-cursor="rótulo"], o círculo expande e
 * exibe o rótulo flutuante (ex.: "Girar 360°", "Ver Ficha").
 */
export default function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (prefersReducedMotion()) return
    // Em telas touch não faz sentido — não monta.
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

    const dot = dotRef.current!
    const label = labelRef.current!

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const pos = { ...target }
    let raf = 0

    const onMove = (e: MouseEvent) => {
      target.x = e.clientX
      target.y = e.clientY

      const interactive = (e.target as HTMLElement)?.closest('[data-cursor]')
      if (interactive) {
        const text = interactive.getAttribute('data-cursor') ?? ''
        dot.classList.add('cursor--active')
        label.textContent = text
      } else {
        dot.classList.remove('cursor--active')
        label.textContent = ''
      }
    }

    const onDown = () => dot.classList.add('cursor--down')
    const onUp = () => dot.classList.remove('cursor--down')

    const render = () => {
      pos.x += (target.x - pos.x) * 0.18
      pos.y += (target.y - pos.y) * 0.18
      dot.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%)`
      raf = requestAnimationFrame(render)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)
    raf = requestAnimationFrame(render)

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div ref={dotRef} className="cursor" aria-hidden="true">
      <span ref={labelRef} className="cursor__label" />
    </div>
  )
}
