/**
 * Camada de acesso aos COMENTÁRIOS dos jogadores (página do elenco).
 *
 * Tabelas Supabase:
 *  - `player_comments` (com `parent_id` para respostas — thread de 1 nível)
 *  - `comment_likes`   (uma linha por visitante/comentário)
 *
 * A torcida é anônima: cada navegador recebe um `visitor_id` (localStorage) que
 * serve para deduplicar curtidas e permitir descurtir. Leitura e escrita são
 * abertas ao público; só o admin apaga comentários (ver migrações 004/005).
 */
import { supabase } from './supabase'
import { getVisitorId } from './visitor'

export interface PlayerComment {
  id: string
  playerId: string
  parentId: string | null
  author: string
  body: string
  createdAt: string // ISO 8601
  likeCount: number
  likedByMe: boolean
}

/** Um comentário de topo com suas respostas (ordenadas da mais antiga). */
export interface CommentThread {
  comment: PlayerComment
  replies: PlayerComment[]
}

export interface NewComment {
  playerId: string
  author: string
  body: string
  parentId?: string | null
}

/** Comentários habilitados (banco no ar). */
export const COMMENTS_ENABLED = true

function toComment(
  row: Record<string, unknown>,
  likeCount: number,
  likedByMe: boolean,
): PlayerComment {
  return {
    id: row.id as string,
    playerId: row.player_id as string,
    parentId: (row.parent_id as string | null) ?? null,
    author: row.author as string,
    body: row.body as string,
    createdAt: row.created_at as string,
    likeCount,
    likedByMe,
  }
}

/**
 * Busca todos os comentários de um jogador já organizados em threads
 * (topo + respostas), com contagem de curtidas e se este visitante curtiu.
 */
export async function fetchThreads(playerId: string): Promise<CommentThread[]> {
  const { data: rows, error } = await supabase
    .from('player_comments')
    .select('*')
    .eq('player_id', playerId)
  if (error) throw new Error('Falha ao carregar comentários.')

  const list = rows ?? []
  const ids = list.map((r) => r.id as string)

  // Curtidas dos comentários deste jogador.
  const likeCount = new Map<string, number>()
  const liked = new Set<string>()
  if (ids.length) {
    const { data: likes } = await supabase
      .from('comment_likes')
      .select('comment_id, visitor_id')
      .in('comment_id', ids)
    const visitor = getVisitorId()
    for (const l of likes ?? []) {
      const cid = l.comment_id as string
      likeCount.set(cid, (likeCount.get(cid) ?? 0) + 1)
      if (l.visitor_id === visitor) liked.add(cid)
    }
  }

  const comments = list.map((r) =>
    toComment(r, likeCount.get(r.id as string) ?? 0, liked.has(r.id as string)),
  )

  const byNewest = (a: PlayerComment, b: PlayerComment) => b.createdAt.localeCompare(a.createdAt)
  const byOldest = (a: PlayerComment, b: PlayerComment) => a.createdAt.localeCompare(b.createdAt)

  const repliesByParent = new Map<string, PlayerComment[]>()
  for (const c of comments) {
    if (c.parentId) {
      const arr = repliesByParent.get(c.parentId) ?? []
      arr.push(c)
      repliesByParent.set(c.parentId, arr)
    }
  }

  return comments
    .filter((c) => !c.parentId)
    .sort(byNewest)
    .map((comment) => ({
      comment,
      replies: (repliesByParent.get(comment.id) ?? []).sort(byOldest),
    }))
}

/** Publica um comentário de topo ou uma resposta (quando `parentId` é dado). */
export async function postComment(input: NewComment): Promise<PlayerComment> {
  const author = input.author.trim().slice(0, 40)
  const body = input.body.trim().slice(0, 500)
  if (!author || !body) throw new Error('Preencha nome e comentário.')

  const { data, error } = await supabase
    .from('player_comments')
    .insert({
      player_id: input.playerId,
      parent_id: input.parentId ?? null,
      author,
      body,
    })
    .select()
    .single()
  if (error) throw new Error('Falha ao publicar o comentário.')
  return toComment(data as Record<string, unknown>, 0, false)
}

/** Curte (`like=true`) ou descurte (`like=false`) um comentário. */
export async function toggleLike(commentId: string, like: boolean): Promise<void> {
  const visitor = getVisitorId()
  if (like) {
    const { error } = await supabase
      .from('comment_likes')
      .insert({ comment_id: commentId, visitor_id: visitor })
    // 23505 = unique_violation (já curtiu): ignora.
    if (error && error.code !== '23505') throw new Error('Falha ao curtir.')
  } else {
    const { error } = await supabase
      .from('comment_likes')
      .delete()
      .eq('comment_id', commentId)
      .eq('visitor_id', visitor)
    if (error) throw new Error('Falha ao descurtir.')
  }
}
