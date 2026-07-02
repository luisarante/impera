import { useEffect } from 'react'
import { ScrollTrigger } from './gsap'
import { scrollToInstant } from './useLenis'

/**
 * Memória de scroll da página inicial. Guarda a última posição enquanto o
 * usuário navega na home e a restaura quando ele volta de outra página — em vez
 * de reabrir a home no topo.
 *
 * Como a `Home` desmonta ao navegar (React Router com `<Routes>`), a posição
 * precisa viver fora do componente: uma variável de módulo. Ela reseta num
 * reload de página inteira, então recarregar começa no topo (comportamento
 * natural e esperado).
 */
let savedY = 0

export function useHomeScroll() {
  useEffect(() => {
    // Captura o alvo de forma síncrona, antes de o listener de scroll (abaixo)
    // ter chance de sobrescrever com o scrollY = 0 do momento da montagem.
    const target = savedY

    if (target > 0) {
      const restore = () => {
        // Recria os pin-spacers do GSAP → altura idêntica à de quando o valor
        // foi salvo, garantindo que o scrollY aponte para o mesmo ponto visual.
        ScrollTrigger.refresh()
        scrollToInstant(target) // Lenis (immediate) ou window.scrollTo no fallback
        ScrollTrigger.update()
      }
      // rAF duplo: espera o layout (e os ScrollTriggers das seções) assentarem.
      requestAnimationFrame(() => requestAnimationFrame(restore))
    }

    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        savedY = window.scrollY
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])
}
