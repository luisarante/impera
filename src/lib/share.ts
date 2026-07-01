/**
 * Compartilhamento genérico: usa o menu nativo (Web Share API) quando disponível
 * — no mobile abre WhatsApp/Instagram/etc. — e cai num link direto do WhatsApp
 * (wa.me) no desktop. O texto usa a formatação do WhatsApp (*negrito*, _itálico_).
 */
export async function shareMessage(opts: { title?: string; text: string; url?: string }): Promise<void> {
  const { title, text, url } = opts
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url })
      return
    } catch (err) {
      // Usuário cancelou o menu nativo → não faz nada.
      if (err instanceof Error && err.name === 'AbortError') return
    }
  }
  const body = [text, url].filter(Boolean).join('\n\n')
  window.open(`https://wa.me/?text=${encodeURIComponent(body)}`, '_blank', 'noopener,noreferrer')
}
