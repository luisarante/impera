/**
 * Camada de acesso aos COMENTÁRIOS dos jogadores (página do elenco).
 *
 * Lê/grava na tabela `player_comments` do Supabase. A torcida (visitante anônimo)
 * pode ler e publicar; só o admin logado pode apagar (ver migração 004 / RLS).
 * Os componentes (PlayerModal) já consomem estas funções — nada muda neles.
 */
import { supabase } from './supabase'

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

/** Comentários habilitados (banco no ar). */
export const COMMENTS_ENABLED = true

function mapComment(row: Record<string, unknown>): PlayerComment {
  return {
    id: row.id as string,
    playerId: row.player_id as string,
    author: row.author as string,
    body: row.body as string,
    createdAt: row.created_at as string,
  }
}

/** Busca os comentários de um jogador, do mais novo para o mais antigo. */
export async function fetchComments(playerId: string): Promise<PlayerComment[]> {
  const { data, error } = await supabase
    .from('player_comments')
    .select('*')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false })
  if (error) throw new Error('Falha ao carregar comentários.')
  return (data ?? []).map(mapComment)
}

/** Publica um novo comentário (pessoa real) sobre um jogador. */
export async function postComment(input: NewComment): Promise<PlayerComment> {
  const author = input.author.trim().slice(0, 40)
  const body = input.body.trim().slice(0, 500)
  if (!author || !body) throw new Error('Preencha nome e comentário.')

  const { data, error } = await supabase
    .from('player_comments')
    .insert({ player_id: input.playerId, author, body })
    .select()
    .single()
  if (error) throw new Error('Falha ao publicar o comentário.')
  return mapComment(data as Record<string, unknown>)
}
