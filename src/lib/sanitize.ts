import DOMPurify from 'dompurify'

// Só incorporamos players de vídeo de domínios confiáveis.
const ALLOWED_IFRAME = /^https?:\/\/(www\.)?(youtube(-nocookie)?\.com|player\.vimeo\.com)\//

let configured = false
function configure() {
  if (configured) return
  DOMPurify.addHook('uponSanitizeElement', (node, data) => {
    if (data.tagName === 'iframe') {
      const el = node as Element
      const src = el.getAttribute('src') ?? ''
      if (!ALLOWED_IFRAME.test(src)) el.parentNode?.removeChild(el)
    }
  })
  configured = true
}

/**
 * Sanitiza o HTML rico de uma matéria antes de renderizar. Bloqueia scripts e
 * tags perigosas, mas mantém `<iframe>` de YouTube/Vimeo (embeds de vídeo).
 */
export function sanitizeNewsHtml(html: string): string {
  configure()
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'src', 'width', 'height'],
  })
}
