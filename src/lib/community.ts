/**
 * Camada de acesso à COMUNIDADE (fórum de tópicos, respostas e enquetes).
 *
 * Tabelas Supabase (ver migração 017):
 *  - `community_topics`        (título + corpo; `has_poll` marca se tem enquete)
 *  - `community_replies`       (com `parent_id` para respostas — thread de 1 nível)
 *  - `community_topic_likes` / `community_reply_likes` (uma linha por usuário/alvo)
 *  - `community_poll_options`  (2–6 opções por tópico; editáveis pelo autor/admin)
 *  - `community_poll_votes`    (1 voto por usuário/tópico, trocável via upsert)
 *
 * Só quem tem conta e está logado cria tópico, responde, curte e vota. O autor
 * vem do perfil (`profiles`, `user_id = auth.uid()`) e o avatar da foto do
 * jogador vinculado. Leitura é pública; apagar/editar é do autor ou do admin
 * (ver migração 016/017).
 */
import { supabase, publicImageUrl } from './supabase'

const SELECT_TOPIC_WITH_AUTHOR = '*, profiles(display_name, players(photo_path))'
const SELECT_REPLY_WITH_AUTHOR = '*, profiles(display_name, players(photo_path))'

export interface CommunityTopic {
  id: string
  authorId: string
  author: string
  authorAvatarUrl: string | null
  title: string
  body: string
  createdAt: string
  replyCount: number
  likeCount: number
  likedByMe: boolean
  hasPoll: boolean
  pinned: boolean
}

export interface CommunityReply {
  id: string
  topicId: string
  parentId: string | null
  authorId: string
  author: string
  authorAvatarUrl: string | null
  body: string
  createdAt: string
  likeCount: number
  likedByMe: boolean
}

/** Uma resposta de topo com suas respostas filhas (ordenadas da mais antiga). */
export interface ReplyThread {
  reply: CommunityReply
  children: CommunityReply[]
}

export interface PollOption {
  id: string
  label: string
  votes: number
}

export interface TopicDetail {
  topic: CommunityTopic
  threads: ReplyThread[]
  pollOptions: PollOption[] // [] se !hasPoll
  totalVotes: number
  myVoteOptionId: string | null
  canManagePoll: boolean // autor do tópico ou admin — pode gerir opções
}

export interface NewTopic {
  title: string
  body: string
  pollOptions?: string[] // 2+ rótulos; presença implica hasPoll = true
}

type AuthorEmbed = {
  display_name: string
  players: { photo_path: string | null } | null
} | null

/** Id do usuário logado (ou null). Lê da sessão local, sem ida ao servidor. */
async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

/** Se o usuário logado é admin (perfil `is_admin`). */
async function currentUserIsAdmin(): Promise<boolean> {
  const me = await currentUserId()
  if (!me) return false
  const { data } = await supabase.from('profiles').select('is_admin').eq('id', me).maybeSingle()
  return (data?.is_admin as boolean) ?? false
}

function authorFrom(row: Record<string, unknown>): { author: string; authorAvatarUrl: string | null } {
  const prof = row.profiles as AuthorEmbed
  return {
    author: prof?.display_name ?? 'Torcedor',
    authorAvatarUrl: publicImageUrl('players', prof?.players?.photo_path ?? null),
  }
}

function toTopic(
  row: Record<string, unknown>,
  replyCount: number,
  likeCount: number,
  likedByMe: boolean,
): CommunityTopic {
  return {
    id: row.id as string,
    authorId: row.user_id as string,
    ...authorFrom(row),
    title: row.title as string,
    body: row.body as string,
    createdAt: row.created_at as string,
    replyCount,
    likeCount,
    likedByMe,
    hasPoll: (row.has_poll as boolean) ?? false,
    pinned: (row.pinned as boolean) ?? false,
  }
}

function toReply(
  row: Record<string, unknown>,
  likeCount: number,
  likedByMe: boolean,
): CommunityReply {
  return {
    id: row.id as string,
    topicId: row.topic_id as string,
    parentId: (row.parent_id as string | null) ?? null,
    authorId: row.user_id as string,
    ...authorFrom(row),
    body: row.body as string,
    createdAt: row.created_at as string,
    likeCount,
    likedByMe,
  }
}

/** Lista de tópicos para o hub (fixados primeiro, depois mais recentes). */
export async function fetchTopics(limit?: number): Promise<CommunityTopic[]> {
  let query = supabase
    .from('community_topics')
    .select(SELECT_TOPIC_WITH_AUTHOR)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })
  if (limit) query = query.limit(limit)
  const { data: rows, error } = await query
  if (error) throw new Error('Falha ao carregar os tópicos.')

  const list = rows ?? []
  const ids = list.map((r) => r.id as string)
  if (ids.length === 0) return []

  const [replies, likes, me] = await Promise.all([
    supabase.from('community_replies').select('topic_id').in('topic_id', ids),
    supabase.from('community_topic_likes').select('topic_id, user_id').in('topic_id', ids),
    currentUserId(),
  ])

  const replyCount = new Map<string, number>()
  for (const r of replies.data ?? []) {
    const tid = r.topic_id as string
    replyCount.set(tid, (replyCount.get(tid) ?? 0) + 1)
  }

  const likeCount = new Map<string, number>()
  const liked = new Set<string>()
  for (const l of likes.data ?? []) {
    const tid = l.topic_id as string
    likeCount.set(tid, (likeCount.get(tid) ?? 0) + 1)
    if (me && l.user_id === me) liked.add(tid)
  }

  return list.map((r) =>
    toTopic(
      r as Record<string, unknown>,
      replyCount.get(r.id as string) ?? 0,
      likeCount.get(r.id as string) ?? 0,
      liked.has(r.id as string),
    ),
  )
}

/** Tópico completo: dados + respostas em threads + enquete (se houver). */
export async function fetchTopic(id: string): Promise<TopicDetail | null> {
  const { data: topicRow, error } = await supabase
    .from('community_topics')
    .select(SELECT_TOPIC_WITH_AUTHOR)
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error('Falha ao carregar o tópico.')
  if (!topicRow) return null

  const me = await currentUserId()
  const isAdmin = me ? await currentUserIsAdmin() : false

  const [repliesRes, topicLikesRes, pollOptionsRes, pollVotesRes] = await Promise.all([
    supabase.from('community_replies').select(SELECT_REPLY_WITH_AUTHOR).eq('topic_id', id),
    supabase.from('community_topic_likes').select('user_id').eq('topic_id', id),
    supabase
      .from('community_poll_options')
      .select('id, label')
      .eq('topic_id', id)
      .order('sort_order'),
    supabase.from('community_poll_votes').select('option_id, user_id').eq('topic_id', id),
  ])

  const replyRows = repliesRes.data ?? []
  const replyIds = replyRows.map((r) => r.id as string)
  const replyLikes = replyIds.length
    ? await supabase.from('community_reply_likes').select('reply_id, user_id').in('reply_id', replyIds)
    : { data: [] as { reply_id: string; user_id: string }[] }

  const replyLikeCount = new Map<string, number>()
  const replyLiked = new Set<string>()
  for (const l of replyLikes.data ?? []) {
    const rid = l.reply_id as string
    replyLikeCount.set(rid, (replyLikeCount.get(rid) ?? 0) + 1)
    if (me && l.user_id === me) replyLiked.add(rid)
  }

  const replies = replyRows.map((r) =>
    toReply(
      r as Record<string, unknown>,
      replyLikeCount.get(r.id as string) ?? 0,
      replyLiked.has(r.id as string),
    ),
  )

  const byOldest = (a: CommunityReply, b: CommunityReply) => a.createdAt.localeCompare(b.createdAt)
  const childrenByParent = new Map<string, CommunityReply[]>()
  for (const r of replies) {
    if (r.parentId) {
      const arr = childrenByParent.get(r.parentId) ?? []
      arr.push(r)
      childrenByParent.set(r.parentId, arr)
    }
  }
  const threads: ReplyThread[] = replies
    .filter((r) => !r.parentId)
    .sort(byOldest)
    .map((reply) => ({ reply, children: (childrenByParent.get(reply.id) ?? []).sort(byOldest) }))

  const topicLikeCount = topicLikesRes.data?.length ?? 0
  const topicLikedByMe = !!me && (topicLikesRes.data ?? []).some((l) => l.user_id === me)

  const tally = new Map<string, number>()
  let myVoteOptionId: string | null = null
  for (const v of pollVotesRes.data ?? []) {
    const oid = v.option_id as string
    tally.set(oid, (tally.get(oid) ?? 0) + 1)
    if (me && v.user_id === me) myVoteOptionId = oid
  }
  const pollOptions: PollOption[] = (pollOptionsRes.data ?? []).map((o) => ({
    id: o.id as string,
    label: o.label as string,
    votes: tally.get(o.id as string) ?? 0,
  }))

  const topic = toTopic(topicRow as Record<string, unknown>, replies.length, topicLikeCount, topicLikedByMe)

  return {
    topic,
    threads,
    pollOptions,
    totalVotes: pollVotesRes.data?.length ?? 0,
    myVoteOptionId,
    canManagePoll: !!me && (me === topic.authorId || isAdmin),
  }
}

/** Cria um tópico (e, se `pollOptions` vier, a enquete junto). */
export async function createTopic(input: NewTopic): Promise<CommunityTopic> {
  const title = input.title.trim().slice(0, 140)
  const body = input.body.trim().slice(0, 4000)
  if (title.length < 3) throw new Error('O título precisa ter pelo menos 3 caracteres.')
  if (!body) throw new Error('Escreva o conteúdo do tópico.')

  const options = (input.pollOptions ?? []).map((o) => o.trim()).filter(Boolean)
  if (input.pollOptions && (options.length < 2 || options.length > 6)) {
    throw new Error('A enquete precisa ter entre 2 e 6 opções.')
  }

  const { data, error } = await supabase
    .from('community_topics')
    .insert({ title, body, has_poll: options.length > 0 })
    .select(SELECT_TOPIC_WITH_AUTHOR)
    .single()
  if (error) throw new Error('Falha ao publicar o tópico. Você está logado?')

  if (options.length > 0) {
    const { error: optError } = await supabase.from('community_poll_options').insert(
      options.map((label, i) => ({ topic_id: data.id as string, label, sort_order: i })),
    )
    if (optError) throw new Error('Tópico criado, mas falhou ao salvar as opções da enquete.')
  }

  return toTopic(data as Record<string, unknown>, 0, 0, false)
}

/** Publica uma resposta de topo ou uma réplica (quando `parentId` é dado). */
export async function postReply(
  topicId: string,
  body: string,
  parentId?: string | null,
): Promise<CommunityReply> {
  const trimmed = body.trim().slice(0, 1000)
  if (!trimmed) throw new Error('Escreva uma resposta.')

  const { data, error } = await supabase
    .from('community_replies')
    .insert({ topic_id: topicId, parent_id: parentId ?? null, body: trimmed })
    .select(SELECT_REPLY_WITH_AUTHOR)
    .single()
  if (error) throw new Error('Falha ao publicar a resposta. Você está logado?')
  return toReply(data as Record<string, unknown>, 0, false)
}

/** Curte (`like=true`) ou descurte (`like=false`) um tópico (usuário logado). */
export async function toggleTopicLike(topicId: string, like: boolean): Promise<void> {
  if (like) {
    const { error } = await supabase.from('community_topic_likes').insert({ topic_id: topicId })
    if (error && error.code !== '23505') throw new Error('Falha ao curtir.')
  } else {
    const { error } = await supabase.from('community_topic_likes').delete().eq('topic_id', topicId)
    if (error) throw new Error('Falha ao descurtir.')
  }
}

/** Curte (`like=true`) ou descurte (`like=false`) uma resposta (usuário logado). */
export async function toggleReplyLike(replyId: string, like: boolean): Promise<void> {
  if (like) {
    const { error } = await supabase.from('community_reply_likes').insert({ reply_id: replyId })
    if (error && error.code !== '23505') throw new Error('Falha ao curtir.')
  } else {
    const { error } = await supabase.from('community_reply_likes').delete().eq('reply_id', replyId)
    if (error) throw new Error('Falha ao descurtir.')
  }
}

/** Vota (ou troca o voto) numa opção da enquete. Um voto por usuário/tópico. */
export async function castPollVote(topicId: string, optionId: string): Promise<void> {
  const me = await currentUserId()
  if (!me) throw new Error('Faça login para votar.')
  const { error } = await supabase
    .from('community_poll_votes')
    .upsert({ topic_id: topicId, option_id: optionId, user_id: me }, { onConflict: 'topic_id,user_id' })
  if (error) throw new Error('Falha ao registrar o voto.')
}

/** Adiciona uma opção à enquete de um tópico (autor do tópico ou admin). */
export async function addPollOption(topicId: string, label: string, sortOrder: number): Promise<PollOption> {
  const trimmed = label.trim().slice(0, 120)
  if (!trimmed) throw new Error('Escreva o texto da opção.')
  const { data, error } = await supabase
    .from('community_poll_options')
    .insert({ topic_id: topicId, label: trimmed, sort_order: sortOrder })
    .select('id, label')
    .single()
  if (error) throw new Error('Falha ao adicionar a opção.')
  if (!(await topicHasPoll(topicId))) {
    await supabase.from('community_topics').update({ has_poll: true }).eq('id', topicId)
  }
  return { id: data.id as string, label: data.label as string, votes: 0 }
}

async function topicHasPoll(topicId: string): Promise<boolean> {
  const { data } = await supabase.from('community_topics').select('has_poll').eq('id', topicId).maybeSingle()
  return (data?.has_poll as boolean) ?? false
}

/** Edita o rótulo de uma opção de enquete existente (autor do tópico ou admin). */
export async function updatePollOption(optionId: string, label: string): Promise<void> {
  const trimmed = label.trim().slice(0, 120)
  if (!trimmed) throw new Error('Escreva o texto da opção.')
  const { error } = await supabase.from('community_poll_options').update({ label: trimmed }).eq('id', optionId)
  if (error) throw new Error('Falha ao editar a opção.')
}

/** Remove uma opção de enquete (e os votos nela, via cascade). */
export async function removePollOption(optionId: string): Promise<void> {
  const { error } = await supabase.from('community_poll_options').delete().eq('id', optionId)
  if (error) throw new Error('Falha ao remover a opção.')
}

/** Apaga um tópico (autor ou admin — RLS decide). */
export async function deleteTopic(id: string): Promise<void> {
  const { error } = await supabase.from('community_topics').delete().eq('id', id)
  if (error) throw new Error('Falha ao excluir o tópico.')
}

/** Apaga uma resposta (autor ou admin — RLS decide). */
export async function deleteReply(id: string): Promise<void> {
  const { error } = await supabase.from('community_replies').delete().eq('id', id)
  if (error) throw new Error('Falha ao excluir a resposta.')
}

/** Fixa/desafixa um tópico no topo do hub (só efetiva para admin — RLS decide). */
export async function setTopicPinned(id: string, pinned: boolean): Promise<void> {
  const { error } = await supabase.from('community_topics').update({ pinned }).eq('id', id)
  if (error) throw new Error('Falha ao atualizar o destaque do tópico.')
}
