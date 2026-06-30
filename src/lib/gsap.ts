import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Ponto único de registro de plugins do GSAP.
gsap.registerPlugin(ScrollTrigger)

export { gsap, ScrollTrigger }

// Respeita a preferência de movimento reduzido do sistema.
export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches
