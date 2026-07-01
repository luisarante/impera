import { useState } from 'react'
import type { NewsItem } from '../../data/club'

interface ShareButtonProps {
  item: NewsItem
}

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
    <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
  </svg>
)

const LinkIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
  </svg>
)

/**
 * Compartilhamento da matéria. No mobile abre o menu nativo (Web Share API,
 * incluindo WhatsApp/Instagram); no desktop cai num link direto do WhatsApp.
 * Também oferece "copiar link".
 */
export default function ShareButton({ item }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  const url = `${window.location.origin}/noticias/${item.id}`
  const title = item.headline
  const text = `*${item.headline}*${item.lead ? ` — ${item.lead}` : ''}`

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url })
        return
      } catch (err) {
        // Usuário cancelou o menu nativo → não faz nada.
        if (err instanceof Error && err.name === 'AbortError') return
      }
    }
    // Fallback (desktop / sem Web Share): WhatsApp.
    const wa = `https://wa.me/?text=${encodeURIComponent(`${text}\n\n${url}`)}`
    window.open(wa, '_blank', 'noopener,noreferrer')
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard indisponível — ignora */
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={share}
        data-cursor="Compartilhar"
        className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
      >
        <WhatsAppIcon />
        Compartilhar
      </button>
      <button
        type="button"
        onClick={copyLink}
        data-cursor="Copiar"
        className="inline-flex items-center gap-2 rounded-full border border-[var(--hairline)] px-4 py-2 text-sm text-[var(--text-70)] transition-colors hover:border-[var(--color-accent)] hover:text-white"
      >
        <LinkIcon />
        {copied ? 'Link copiado!' : 'Copiar link'}
      </button>
    </div>
  )
}
