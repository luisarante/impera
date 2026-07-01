import { useEffect } from 'react'
import Lenis from 'lenis'
import { gsap, ScrollTrigger, prefersReducedMotion } from './gsap'

// Instância única do Lenis, para travar/destravar o scroll de fora (ex.: modais).
let lenisInstance: Lenis | null = null

/** Congela o scroll do site (usado ao abrir o painel de notícias). */
export function lockScroll() {
  if (lenisInstance) lenisInstance.stop()
  else document.documentElement.style.overflow = 'hidden'
}

/** Destrava o scroll do site. */
export function unlockScroll() {
  if (lenisInstance) lenisInstance.start()
  else document.documentElement.style.overflow = ''
}

type ScrollToOpts = {
  duration?: number
  easing?: (t: number) => number
  lock?: boolean
  offset?: number
  onComplete?: () => void
}

/**
 * Glide suave até uma posição absoluta de scroll (usado pela navegação por
 * marcos da linha do tempo). Cai no scroll nativo se o Lenis não existir.
 */
export function lenisScrollTo(target: number, opts: ScrollToOpts = {}) {
  if (lenisInstance) {
    lenisInstance.scrollTo(target, opts)
  } else {
    window.scrollTo({ top: target, behavior: 'smooth' })
    opts.onComplete?.()
  }
}

/**
 * Glide suave até um elemento (usado pela navegação da página inicial).
 * Aceita um seletor CSS ou o próprio elemento. Cai no scroll nativo suave se
 * o Lenis não existir (ex.: movimento reduzido).
 */
export function lenisScrollToEl(target: string | HTMLElement, opts: ScrollToOpts = {}) {
  if (lenisInstance) {
    lenisInstance.scrollTo(target, opts)
  } else {
    const el =
      typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY + (opts.offset ?? 0)
      window.scrollTo({ top, behavior: 'smooth' })
    }
    opts.onComplete?.()
  }
}

/**
 * Inicializa o motor de scroll suave (Lenis) e faz a ponte com o
 * GSAP/ScrollTrigger. Esta integração é o que evita o conflito clássico
 * entre `position: sticky`/pin e o smooth scroll.
 *
 * - lenis.on('scroll', ScrollTrigger.update): mantém os triggers em sincronia.
 * - gsap.ticker dirige o raf do Lenis: um único loop de animação para tudo.
 *
 * Se o usuário pedir movimento reduzido, não inicializa o Lenis — o scroll
 * nativo assume e o site continua 100% navegável.
 */
export function useLenis() {
  useEffect(() => {
    if (prefersReducedMotion()) return

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    })

    lenisInstance = lenis
    lenis.on('scroll', ScrollTrigger.update)

    const update = (time: number) => {
      // gsap.ticker entrega tempo em segundos; Lenis espera milissegundos.
      lenis.raf(time * 1000)
    }
    gsap.ticker.add(update)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(update)
      lenis.destroy()
      lenisInstance = null
    }
  }, [])
}
