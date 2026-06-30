/**
 * Camada de acesso aos COMENTÁRIOS dos jogadores.
 *
 * Hoje é um stub: `COMMENTS_ENABLED = false` e a UI mostra o estado "em breve".
 * Quando o banco de dados estiver no ar, basta:
 *   1. virar `COMMENTS_ENABLED` para `true`;
 *   2. implementar `fetchComments` / `postComment` apontando para a sua API.
 * Nenhum componente precisa mudar — eles já consomem estas funções.
 */

export interface PlayerComment {
  id: string
  playerId: string
  author: string
  body: string
  createdAt: string // ISO 8601
}

export interface NewComment {
  playerId: string
  author: string
  body: string
}

/** Vire para `true` quando o backend de comentários estiver disponível. */
export const COMMENTS_ENABLED: boolean = false

/** Busca os comentários de um jogador. */
export async function fetchComments(playerId: string): Promise<PlayerComment[]> {
  if (!COMMENTS_ENABLED) return []
  // TODO(backend): trocar pela chamada real ao banco de dados.
  const res = await fetch(`/api/players/${encodeURIComponent(playerId)}/comments`)
  if (!res.ok) throw new Error('Falha ao carregar comentários.')
  return res.json()
}

/** Publica um novo comentário (pessoa real) sobre um jogador. */
export async function postComment(input: NewComment): Promise<PlayerComment> {
  if (!COMMENTS_ENABLED) {
    throw new Error('Comentários ainda não disponíveis — aguardando o banco de dados.')
  }
  // TODO(backend): trocar pelo POST real ao banco de dados.
  const res = await fetch(`/api/players/${encodeURIComponent(input.playerId)}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error('Falha ao publicar o comentário.')
  return res.json()
}
