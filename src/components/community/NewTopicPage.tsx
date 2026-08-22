import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../admin/auth'
import { createTopic } from '../../lib/community'

/** Página de criação de tópico (/comunidade/novo) — só para torcedores logados. */
export default function NewTopicPage() {
  const { session } = useAuth()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [hasPoll, setHasPoll] = useState(false)
  const [options, setOptions] = useState<string[]>(['', ''])
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const goBack = useCallback(() => navigate('/comunidade'), [navigate])

  useEffect(() => {
    if (!session) navigate('/entrar', { state: { from: '/comunidade/novo' } })
  }, [session, navigate])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') goBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goBack])

  if (!session) return null

  function updateOption(i: number, value: string) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? value : o)))
  }

  function addOption() {
    setOptions((prev) => (prev.length < 6 ? [...prev, ''] : prev))
  }

  function removeOption(i: number) {
    setOptions((prev) => (prev.length > 2 ? prev.filter((_, idx) => idx !== i) : prev))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setPosting(true)
    setError(null)
    try {
      const created = await createTopic({
        title,
        body,
        pollOptions: hasPoll ? options : undefined,
      })
      navigate(`/comunidade/${created.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao publicar o tópico.')
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="news-page" aria-label="Novo tópico da comunidade">
      <header className="squad-head">
        <button type="button" className="squad-back" data-cursor="Voltar" onClick={goBack}>
          ← Voltar
        </button>
        <div className="squad-title">
          <span className="eyebrow">Comunidade</span>
          <h2>Novo tópico</h2>
        </div>
        <span />
      </header>

      <form className="community-new-topic" onSubmit={submit}>
        <label className="community-field">
          <span>Título</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            minLength={3}
            maxLength={140}
            required
            placeholder="Sobre o que é a discussão?"
          />
        </label>

        <label className="community-field">
          <span>Conteúdo</span>
          <textarea
            className="yt-composer__textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={4000}
            rows={6}
            required
            placeholder="Escreva o que você quer discutir com a torcida…"
          />
        </label>

        <label className="community-field community-field--checkbox">
          <input type="checkbox" checked={hasPoll} onChange={(e) => setHasPoll(e.target.checked)} />
          <span>Adicionar enquete?</span>
        </label>

        {hasPoll && (
          <div className="community-poll-editor">
            {options.map((o, i) => (
              <div key={i} className="community-poll-editor__row">
                <input
                  className="community-poll-option-input"
                  value={o}
                  onChange={(e) => updateOption(i, e.target.value)}
                  maxLength={120}
                  placeholder={`Opção ${i + 1}`}
                  required
                />
                {options.length > 2 && (
                  <button type="button" className="yt-btn yt-btn--ghost" onClick={() => removeOption(i)}>
                    Remover
                  </button>
                )}
              </div>
            ))}
            {options.length < 6 && (
              <button type="button" className="yt-btn yt-btn--ghost" onClick={addOption}>
                + Opção
              </button>
            )}
          </div>
        )}

        {error && <p className="yt-composer__error">{error}</p>}

        <div className="community-new-topic__actions">
          <button type="button" className="yt-btn yt-btn--ghost" onClick={goBack} disabled={posting}>
            Cancelar
          </button>
          <button type="submit" className="yt-btn yt-btn--primary" disabled={posting}>
            {posting ? 'Publicando…' : 'Publicar tópico'}
          </button>
        </div>
      </form>
    </div>
  )
}
