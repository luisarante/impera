import type { Player } from '../data/club'

/** Escapa os caracteres especiais de regex de um nome. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Envolve as ocorrências de nomes de jogadores (do elenco) em links para a
 * página dedicada (`/elenco/:id`), dentro de um HTML **já sanitizado**.
 *
 * - Casa o nome como palavra inteira (case-insensitive), preservando o texto.
 * - Ignora texto que já está dentro de um `<a>` (evita link dentro de link).
 * - Marca os links com `data-player-link` para navegação SPA (quem renderiza
 *   intercepta o clique e usa o router em vez de recarregar a página).
 *
 * Roda no browser (usa `DOMParser`). Sem jogadores ou sem HTML, devolve o
 * original inalterado.
 */
export function linkifyPlayers(html: string, players: Pick<Player, 'id' | 'name'>[]): string {
  if (!html) return html
  const list = players.filter((p) => p.name && p.name.trim())
  if (list.length === 0) return html

  // Nome mais longo primeiro: evita casar um prefixo curto antes do nome inteiro.
  const ordered = [...list].sort((a, b) => b.name.length - a.name.length)
  const idByName = new Map(ordered.map((p) => [p.name.toLowerCase(), p.id]))
  const pattern = new RegExp(`\\b(${ordered.map((p) => escapeRegExp(p.name)).join('|')})\\b`, 'gi')

  const doc = new DOMParser().parseFromString(html, 'text/html')
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)
  const targets: Text[] = []
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const t = node as Text
    if (t.parentElement?.closest('a')) continue // já é um link
    pattern.lastIndex = 0
    if (pattern.test(t.nodeValue ?? '')) targets.push(t)
  }

  for (const node of targets) {
    const text = node.nodeValue ?? ''
    const frag = doc.createDocumentFragment()
    let last = 0
    pattern.lastIndex = 0
    for (let m = pattern.exec(text); m; m = pattern.exec(text)) {
      const id = idByName.get(m[0].toLowerCase())
      if (!id) continue
      if (m.index > last) frag.appendChild(doc.createTextNode(text.slice(last, m.index)))
      const a = doc.createElement('a')
      a.setAttribute('href', `/elenco/${id}`)
      a.setAttribute('data-player-link', '')
      a.className = 'player-link'
      a.textContent = m[0]
      frag.appendChild(a)
      last = m.index + m[0].length
    }
    if (last > 0) {
      if (last < text.length) frag.appendChild(doc.createTextNode(text.slice(last)))
      node.parentNode?.replaceChild(frag, node)
    }
  }

  return doc.body.innerHTML
}
