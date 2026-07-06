/**
 * Camada de acesso aos COMENTÁRIOS dos jogadores (página do elenco).
 *
 * Tabelas Supabase:
 *  - `player_comments` (com `parent_id` para respostas — thread de 1 nível)
 *  - `comment_likes`   (uma linha por usuário/comentário)
 *
 * Só quem tem conta e está logado comenta, responde e curte. O autor vem do
 * perfil (`profiles`, `user_id = auth.uid()`) e o avatar da foto do jogador
 * vinculado. Leitura é pública; apagar é do autor ou do admin (ver migração 016).
 */
import { supabase, publicImageUrl } from './supabase'

/** Colunas + perfil do autor (nome e foto do jogador vinculado) embutidos. */
const SELECT_WITH_AUTHOR = '*, profiles(display_name, players(photo_path))'

export interface PlayerComment {
  id: string
  playerId: string
  parentId: string | null
  author: string // nome de exibição do autor
  avatarUrl: string | null // foto do jogador vinculado; null = avatar padrão
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
  body: string
  parentId?: string | null
}

/** Comentários habilitados (banco no ar). */
export const COMMENTS_ENABLED = true

type AuthorEmbed = {
  display_name: string
  players: { photo_path: string | null } | null
} | null

function toComment(
  row: Record<string, unknown>,
  likeCount: number,
  likedByMe: boolean,
): PlayerComment {
  const prof = row.profiles as AuthorEmbed
  return {
    id: row.id as string,
    playerId: row.player_id as string,
    parentId: (row.parent_id as string | null) ?? null,
    author: prof?.display_name ?? 'Torcedor',
    avatarUrl: publicImageUrl('players', prof?.players?.photo_path ?? null),
    body: row.body as string,
    createdAt: row.created_at as string,
    likeCount,
    likedByMe,
  }
}

/** Id do usuário logado (ou null). Lê da sessão local, sem ida ao servidor. */
async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

/**
 * Busca todos os comentários de um jogador já organizados em threads
 * (topo + respostas), com contagem de curtidas e se este usuário curtiu.
 */
export async function fetchThreads(playerId: string): Promise<CommentThread[]> {
  const { data: rows, error } = await supabase
    .from('player_comments')
    .select(SELECT_WITH_AUTHOR)
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
      .select('comment_id, user_id')
      .in('comment_id', ids)
    const me = await currentUserId()
    for (const l of likes ?? []) {
      const cid = l.comment_id as string
      likeCount.set(cid, (likeCount.get(cid) ?? 0) + 1)
      if (me && l.user_id === me) liked.add(cid)
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

/**
 * Publica um comentário de topo ou uma resposta (quando `parentId` é dado).
 * O autor (`user_id`) entra pelo default `auth.uid()`; o RLS exige login.
 */
export async function postComment(input: NewComment): Promise<PlayerComment> {
  const body = input.body.trim().slice(0, 500)
  if (!body) throw new Error('Escreva um comentário.')

  const { data, error } = await supabase
    .from('player_comments')
    .insert({
      player_id: input.playerId,
      parent_id: input.parentId ?? null,
      body,
    })
    .select(SELECT_WITH_AUTHOR)
    .single()
  if (error) throw new Error('Falha ao publicar o comentário. Você está logado?')
  return toComment(data as Record<string, unknown>, 0, false)
}

/** Curte (`like=true`) ou descurte (`like=false`) um comentário (usuário logado). */
export async function toggleLike(commentId: string, like: boolean): Promise<void> {
  if (like) {
    // user_id entra pelo default auth.uid(); o RLS confere o dono.
    const { error } = await supabase.from('comment_likes').insert({ comment_id: commentId })
    // 23505 = unique_violation (já curtiu): ignora.
    if (error && error.code !== '23505') throw new Error('Falha ao curtir.')
  } else {
    // O RLS de delete restringe à própria curtida (user_id = auth.uid()).
    const { error } = await supabase.from('comment_likes').delete().eq('comment_id', commentId)
    if (error) throw new Error('Falha ao descurtir.')
  }
}
