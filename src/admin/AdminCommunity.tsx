import { useCallback, useEffect, useState } from 'react'
import { Button, Card, PageHeader } from './ui'
import { useConfirm, useToast } from './feedback'
import {
  deleteReply,
  deleteTopic,
  fetchTopic,
  fetchTopics,
  setTopicPinned,
  type CommunityTopic,
  type ReplyThread,
} from '../lib/community'

/** Moderação da Comunidade: fixar/desafixar tópicos, remover tópicos e respostas. */
export default function AdminCommunity() {
  const confirm = useConfirm()
  const toast = useToast()

  const [topics, setTopics] = useState<CommunityTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [threads, setThreads] = useState<ReplyThread[]>([])
  const [threadsLoading, setThreadsLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setTopics(await fetchTopics())
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao carregar tópicos.', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  async function togglePinned(t: CommunityTopic) {
    try {
      await setTopicPinned(t.id, !t.pinned)
      await load()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao atualizar destaque.', 'error')
    }
  }

  async function removeTopic(t: CommunityTopic) {
    const ok = await confirm({
      title: 'Remover tópico',
      message: `Remover "${t.title}" e todas as suas respostas?`,
      danger: true,
      confirmLabel: 'Remover',
    })
    if (!ok) return
    try {
      await deleteTopic(t.id)
      if (expandedId === t.id) setExpandedId(null)
      await load()
      toast('Tópico removido.', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao remover.', 'error')
    }
  }

  async function toggleExpanded(t: CommunityTopic) {
    if (expandedId === t.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(t.id)
    setThreadsLoading(true)
    try {
      const detail = await fetchTopic(t.id)
      setThreads(detail?.threads ?? [])
    } catch {
      setThreads([])
    } finally {
      setThreadsLoading(false)
    }
  }

  async function removeReply(replyId: string, topicId: string) {
    const ok = await confirm({
      title: 'Remover resposta',
      message: 'Remover esta resposta (e eventuais réplicas)?',
      danger: true,
      confirmLabel: 'Remover',
    })
    if (!ok) return
    try {
      await deleteReply(replyId)
      const detail = await fetchTopic(topicId)
      setThreads(detail?.threads ?? [])
      await load()
      toast('Resposta removida.', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao remover.', 'error')
    }
  }

  return (
    <div>
      <PageHeader title="Comunidade" />
      {loading && <p className="text-[var(--text-50)]">Carregando…</p>}
      <div className="space-y-3">
        {topics.map((t) => (
          <Card key={t.id} className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{t.title}</p>
                <p className="truncate text-xs text-[var(--text-50)]">
                  {t.author} · {t.replyCount} {t.replyCount === 1 ? 'resposta' : 'respostas'} ·{' '}
                  {t.likeCount} {t.likeCount === 1 ? 'curtida' : 'curtidas'}
                  {t.hasPoll ? ' · enquete' : ''}
                  {t.pinned ? ' · fixado' : ''}
                </p>
              </div>
              <Button onClick={() => toggleExpanded(t)}>
                {expandedId === t.id ? 'Fechar' : 'Ver respostas'}
              </Button>
              <Button onClick={() => togglePinned(t)}>{t.pinned ? 'Desafixar' : 'Fixar'}</Button>
              <Button variant="danger" onClick={() => removeTopic(t)}>
                ✕
              </Button>
            </div>

            {expandedId === t.id && (
              <div className="space-y-2 border-t border-[var(--hairline)] pt-3">
                {threadsLoading ? (
                  <p className="text-xs text-[var(--text-50)]">Carregando respostas…</p>
                ) : threads.length === 0 ? (
                  <p className="text-xs text-[var(--text-50)]">Sem respostas.</p>
                ) : (
                  threads.map(({ reply, children }) => (
                    <div key={reply.id} className="space-y-2">
                      <div className="flex items-center gap-3 rounded-md bg-black/20 px-3 py-2">
                        <p className="min-w-0 flex-1 truncate text-sm">
                          <span className="text-[var(--text-50)]">{reply.author}: </span>
                          {reply.body}
                        </p>
                        <Button variant="danger" onClick={() => removeReply(reply.id, t.id)}>
                          ✕
                        </Button>
                      </div>
                      {children.map((c) => (
                        <div
                          key={c.id}
                          className="ml-6 flex items-center gap-3 rounded-md bg-black/10 px-3 py-2"
                        >
                          <p className="min-w-0 flex-1 truncate text-sm">
                            <span className="text-[var(--text-50)]">{c.author}: </span>
                            {c.body}
                          </p>
                          <Button variant="danger" onClick={() => removeReply(c.id, t.id)}>
                            ✕
                          </Button>
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
