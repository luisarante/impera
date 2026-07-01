const VISITOR_KEY = 'imperatrice:visitor'

/**
 * Id anônimo e estável deste navegador — usado para deduplicar interações da
 * torcida (curtidas de comentários, voto de craque) sem exigir login.
 */
export function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(VISITOR_KEY, id)
    }
    return id
  } catch {
    // Storage indisponível (modo privado): id efêmero por sessão.
    return 'anon-' + Math.random().toString(36).slice(2, 12)
  }
}
