import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Button, Card, Field, PageHeader, Select, TextArea, TextInput } from './ui'
import { useConfirm, useToast } from './feedback'

interface NightRow {
  id: string
  title: string
  date: string
  subtitle: string | null
  mvp_open: boolean
}
interface MatchRow {
  id: string
  night_id: string
  opponent: string
  our_score: number | null
  opp_score: number | null
  competition: string | null
  status: 'agendada' | 'ao_vivo' | 'encerrada'
  sort_order: number
}
interface EventRow {
  id: string
  night_id: string
  time_label: string | null
  title: string
  description: string | null
  sort_order: number
}
interface PlayerRow {
  id: string
  name: string
  number: string
  position: string
}

const todayIso = () => new Date().toISOString().slice(0, 10)

export default function AdminGames() {
  const confirm = useConfirm()
  const toast = useToast()
  const [nights, setNights] = useState<NightRow[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState<Partial<NightRow> | null>(null)
  const [selected, setSelected] = useState<NightRow | null>(null)

  const loadNights = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('game_nights')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    setNights((data as NightRow[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadNights()
  }, [loadNights])

  async function saveNight() {
    if (!draft || !draft.title) return
    const payload = {
      title: draft.title,
      date: draft.date || todayIso(),
      subtitle: draft.subtitle || null,
      mvp_open: draft.mvp_open ?? true,
    }
    const { error } = draft.id
      ? await supabase.from('game_nights').update(payload).eq('id', draft.id)
      : await supabase.from('game_nights').insert(payload)
    if (error) {
      toast(error.message, 'error')
      return
    }
    setDraft(null)
    await loadNights()
    toast('Noite salva.', 'success')
  }

  async function delNight(n: NightRow) {
    const ok = await confirm({
      title: 'Remover noite',
      message: `Remover "${n.title}"? Isso apaga também as partidas, eventos e votos dessa noite.`,
      danger: true,
      confirmLabel: 'Remover',
    })
    if (!ok) return
    const { error } = await supabase.from('game_nights').delete().eq('id', n.id)
    if (error) {
      toast(error.message, 'error')
      return
    }
    await loadNights()
    toast('Noite removida.', 'success')
  }

  if (selected) {
    return <NightEditor night={selected} onBack={() => setSelected(null)} />
  }

  if (draft) {
    return (
      <div className="max-w-xl">
        <PageHeader title={draft.id ? 'Editar noite' : 'Nova noite de jogo'} />
        <div className="space-y-5">
          <Field label="Título (ex.: Rodada 12 — Terça)">
            <TextInput value={draft.title ?? ''} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Data">
              <TextInput
                type="date"
                value={(draft.date ?? todayIso()).slice(0, 10)}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              />
            </Field>
            <Field label="Subtítulo (opcional)">
              <TextInput
                value={draft.subtitle ?? ''}
                onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.mvp_open ?? true}
              onChange={(e) => setDraft({ ...draft, mvp_open: e.target.checked })}
            />
            Votação de craque aberta
          </label>
          <div className="flex gap-3 pt-2">
            <Button variant="primary" onClick={saveNight} disabled={!draft.title}>
              Salvar
            </Button>
            <Button onClick={() => setDraft(null)}>Cancelar</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Noites de jogo"
        action={
          <Button variant="primary" onClick={() => setDraft({ title: '', date: todayIso(), mvp_open: true })}>
            + Nova noite
          </Button>
        }
      />
      {loading && <p className="text-[var(--text-50)]">Carregando…</p>}
      <div className="space-y-3">
        {nights.map((n) => (
          <Card key={n.id} className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{n.title}</p>
              <p className="truncate text-xs text-[var(--text-50)]">
                {new Date(`${n.date}T00:00:00`).toLocaleDateString('pt-BR')}
                {n.mvp_open ? ' · votação aberta' : ' · votação encerrada'}
              </p>
            </div>
            <Button variant="primary" onClick={() => setSelected(n)}>
              Gerenciar
            </Button>
            <Button onClick={() => setDraft(n)}>Editar</Button>
            <Button variant="danger" onClick={() => delNight(n)}>
              ✕
            </Button>
          </Card>
        ))}
        {!loading && nights.length === 0 && (
          <p className="text-[var(--text-50)]">Nenhuma noite criada ainda.</p>
        )}
      </div>
    </div>
  )
}

// ── Editor de uma noite: partidas, eventos e candidatos ao craque ───────────

function NightEditor({ night, onBack }: { night: NightRow; onBack: () => void }) {
  const confirm = useConfirm()
  const toast = useToast()
  const [matches, setMatches] = useState<MatchRow[]>([])
  const [events, setEvents] = useState<EventRow[]>([])
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [candidates, setCandidates] = useState<Set<string>>(new Set())
  const [goals, setGoals] = useState<
    Record<string, { id: string; player_id: string; minute: number | null }[]>
  >({})
  const [goalSel, setGoalSel] = useState<Record<string, string>>({})
  const [goalMin, setGoalMin] = useState<Record<string, string>>({})
  const [matchDraft, setMatchDraft] = useState<Partial<MatchRow> | null>(null)
  const [eventDraft, setEventDraft] = useState<Partial<EventRow> | null>(null)

  const load = useCallback(async () => {
    const [m, e, p, c] = await Promise.all([
      supabase.from('matches').select('*').eq('night_id', night.id).order('sort_order'),
      supabase.from('night_events').select('*').eq('night_id', night.id).order('sort_order'),
      supabase.from('players').select('id,name,number,position').order('sort_order'),
      supabase.from('mvp_candidates').select('player_id').eq('night_id', night.id),
    ])
    const matchList = (m.data as MatchRow[]) ?? []
    setMatches(matchList)
    setEvents((e.data as EventRow[]) ?? [])
    setPlayers((p.data as PlayerRow[]) ?? [])
    setCandidates(new Set((c.data ?? []).map((r) => r.player_id as string)))

    // Gols do Imperatrice, agrupados por partida.
    const ids = matchList.map((x) => x.id)
    const map: Record<string, { id: string; player_id: string; minute: number | null }[]> = {}
    if (ids.length) {
      const { data: g } = await supabase
        .from('match_goals')
        .select('id, match_id, player_id, minute')
        .in('match_id', ids)
        .order('minute', { ascending: true, nullsFirst: false })
        .order('sort_order')
      for (const row of g ?? []) {
        const mid = row.match_id as string
        ;(map[mid] ??= []).push({
          id: row.id as string,
          player_id: row.player_id as string,
          minute: (row.minute as number) ?? null,
        })
      }
    }
    setGoals(map)
  }, [night.id])

  useEffect(() => {
    load()
  }, [load])

  async function saveMatch() {
    if (!matchDraft || !matchDraft.opponent) return
    const payload = {
      night_id: night.id,
      opponent: matchDraft.opponent,
      our_score: matchDraft.our_score ?? null,
      opp_score: matchDraft.opp_score ?? null,
      competition: matchDraft.competition || null,
      status: matchDraft.status || 'encerrada',
      sort_order: matchDraft.sort_order ?? matches.length + 1,
    }
    const { error } = matchDraft.id
      ? await supabase.from('matches').update(payload).eq('id', matchDraft.id)
      : await supabase.from('matches').insert(payload)
    if (error) {
      toast(error.message, 'error')
      return
    }
    setMatchDraft(null)
    await load()
    toast('Partida salva.', 'success')
  }

  async function addGoal(matchId: string, playerId: string, minuteStr: string) {
    if (!playerId) return
    const list = goals[matchId] ?? []
    const minute = minuteStr.trim() === '' ? null : Number(minuteStr)
    const { error } = await supabase
      .from('match_goals')
      .insert({ match_id: matchId, player_id: playerId, minute, sort_order: list.length + 1 })
    if (error) {
      toast(error.message, 'error')
      return
    }
    setGoalSel((s) => ({ ...s, [matchId]: '' }))
    setGoalMin((s) => ({ ...s, [matchId]: '' }))
    await load()
  }

  async function removeGoal(goalId: string) {
    await supabase.from('match_goals').delete().eq('id', goalId)
    await load()
  }

  async function saveEvent() {
    if (!eventDraft || !eventDraft.title) return
    const payload = {
      night_id: night.id,
      time_label: eventDraft.time_label || null,
      title: eventDraft.title,
      description: eventDraft.description || null,
      sort_order: eventDraft.sort_order ?? events.length + 1,
    }
    const { error } = eventDraft.id
      ? await supabase.from('night_events').update(payload).eq('id', eventDraft.id)
      : await supabase.from('night_events').insert(payload)
    if (error) {
      toast(error.message, 'error')
      return
    }
    setEventDraft(null)
    await load()
    toast('Evento salvo.', 'success')
  }

  async function toggleCandidate(playerId: string, on: boolean) {
    if (on) {
      await supabase.from('mvp_candidates').insert({ night_id: night.id, player_id: playerId })
    } else {
      await supabase.from('mvp_candidates').delete().eq('night_id', night.id).eq('player_id', playerId)
    }
    await load()
  }

  const num = (v: string) => (v === '' ? null : Number(v))

  return (
    <div className="max-w-3xl">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-sm text-[var(--text-50)] transition-colors hover:text-white"
      >
        ← Todas as noites
      </button>
      <PageHeader title={night.title} />

      {/* Partidas */}
      <section className="mb-10">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm uppercase tracking-[0.14em] text-[var(--color-accent)]">Partidas</h3>
          <Button onClick={() => setMatchDraft({ status: 'encerrada' })}>+ Partida</Button>
        </div>

        {matchDraft && (
          <Card className="mb-3 space-y-3">
            <Field label="Adversário">
              <TextInput
                value={matchDraft.opponent ?? ''}
                onChange={(e) => setMatchDraft({ ...matchDraft, opponent: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-4 gap-3">
              <Field label="Nossos gols">
                <TextInput
                  type="number"
                  value={matchDraft.our_score ?? ''}
                  onChange={(e) => setMatchDraft({ ...matchDraft, our_score: num(e.target.value) })}
                />
              </Field>
              <Field label="Gols adv.">
                <TextInput
                  type="number"
                  value={matchDraft.opp_score ?? ''}
                  onChange={(e) => setMatchDraft({ ...matchDraft, opp_score: num(e.target.value) })}
                />
              </Field>
              <Field label="Competição">
                <TextInput
                  value={matchDraft.competition ?? ''}
                  onChange={(e) => setMatchDraft({ ...matchDraft, competition: e.target.value })}
                />
              </Field>
              <Field label="Status">
                <Select
                  value={matchDraft.status ?? 'encerrada'}
                  onChange={(e) => setMatchDraft({ ...matchDraft, status: e.target.value as MatchRow['status'] })}
                >
                  <option value="agendada">Agendada</option>
                  <option value="ao_vivo">Ao vivo</option>
                  <option value="encerrada">Encerrada</option>
                </Select>
              </Field>
            </div>
            <div className="flex gap-3">
              <Button variant="primary" onClick={saveMatch} disabled={!matchDraft.opponent}>
                Salvar
              </Button>
              <Button onClick={() => setMatchDraft(null)}>Cancelar</Button>
            </div>
          </Card>
        )}

        <div className="space-y-3">
          {matches.map((m) => {
            const mGoals = goals[m.id] ?? []
            const attributed = mGoals.length
            const full = m.our_score != null && attributed >= m.our_score
            const over = m.our_score != null && attributed > m.our_score
            return (
              <Card key={m.id} className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="flex-1 truncate text-sm">
                    Nós {m.our_score ?? '–'} × {m.opp_score ?? '–'} {m.opponent}
                    {m.competition ? ` · ${m.competition}` : ''}
                  </span>
                  <Button onClick={() => setMatchDraft(m)}>Editar</Button>
                  <Button
                    variant="danger"
                    onClick={async () => {
                      if (
                        await confirm({
                          title: 'Remover partida',
                          message: `Remover a partida contra ${m.opponent}?`,
                          danger: true,
                          confirmLabel: 'Remover',
                        })
                      ) {
                        await supabase.from('matches').delete().eq('id', m.id)
                        await load()
                        toast('Partida removida.', 'success')
                      }
                    }}
                  >
                    ✕
                  </Button>
                </div>

                {/* Gols do Imperatrice (só jogadores do elenco; bots não contam) */}
                <div className="rounded-md border border-[var(--hairline)] p-3">
                  <p className="mb-2 text-xs uppercase tracking-[0.12em] text-[var(--text-50)]">
                    Gols do Imperatrice
                    {m.our_score != null ? ` — ${attributed}/${m.our_score} atribuídos` : ` — ${attributed}`}
                  </p>

                  {mGoals.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {mGoals.map((g) => {
                        const name = players.find((p) => p.id === g.player_id)?.name ?? '—'
                        return (
                          <span
                            key={g.id}
                            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--hairline)] px-3 py-1 text-xs"
                          >
                            {name}
                            {g.minute != null && (
                              <span className="text-[var(--color-accent)]">{g.minute}'</span>
                            )}
                            <button
                              type="button"
                              onClick={() => removeGoal(g.id)}
                              className="text-[var(--text-50)] transition-colors hover:text-[var(--color-alert)]"
                              aria-label={`Remover gol de ${name}`}
                            >
                              ✕
                            </button>
                          </span>
                        )
                      })}
                    </div>
                  )}

                  <div className="flex flex-wrap items-end gap-2">
                    <label className="flex-1">
                      <span className="mb-1 block text-[0.65rem] uppercase tracking-[0.14em] text-[var(--text-50)]">
                        Quem marcou
                      </span>
                      <Select
                        value={goalSel[m.id] ?? ''}
                        onChange={(e) => setGoalSel((s) => ({ ...s, [m.id]: e.target.value }))}
                        className="min-w-[180px]"
                      >
                        <option value="">Escolher jogador…</option>
                        {players.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.number}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <label>
                      <span className="mb-1 block text-[0.65rem] uppercase tracking-[0.14em] text-[var(--text-50)]">
                        Minuto
                      </span>
                      <TextInput
                        type="number"
                        min={0}
                        max={130}
                        placeholder="min'"
                        className="w-24"
                        value={goalMin[m.id] ?? ''}
                        onChange={(e) => setGoalMin((s) => ({ ...s, [m.id]: e.target.value }))}
                      />
                    </label>
                    <Button
                      onClick={() => addGoal(m.id, goalSel[m.id] ?? '', goalMin[m.id] ?? '')}
                      disabled={!goalSel[m.id] || full}
                    >
                      + Gol
                    </Button>
                  </div>

                  {over ? (
                    <p className="mt-2 text-xs text-[var(--color-alert)]">
                      Mais gols atribuídos do que o placar do Imperatrice.
                    </p>
                  ) : full ? (
                    <p className="mt-2 text-xs text-[var(--text-50)]">
                      Todos os gols do placar já foram atribuídos.
                    </p>
                  ) : null}
                </div>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Craque — candidatos */}
      <section className="mb-10">
        <h3 className="mb-3 text-sm uppercase tracking-[0.14em] text-[var(--color-gold)]">
          Craque da noite — quem jogou
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {players.map((p) => (
            <label
              key={p.id}
              className="flex items-center gap-2 rounded-md border border-[var(--hairline)] px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={candidates.has(p.id)}
                onChange={(e) => toggleCandidate(p.id, e.target.checked)}
              />
              <span className="truncate">
                {p.name} <span className="text-[var(--text-50)]">{p.number}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      {/* Eventos */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm uppercase tracking-[0.14em] text-[var(--color-accent)]">Eventos</h3>
          <Button onClick={() => setEventDraft({})}>+ Evento</Button>
        </div>

        {eventDraft && (
          <Card className="mb-3 space-y-3">
            <div className="grid grid-cols-[auto_1fr] gap-3">
              <Field label="Horário">
                <TextInput
                  className="w-28"
                  placeholder="21:30"
                  value={eventDraft.time_label ?? ''}
                  onChange={(e) => setEventDraft({ ...eventDraft, time_label: e.target.value })}
                />
              </Field>
              <Field label="Título">
                <TextInput
                  value={eventDraft.title ?? ''}
                  onChange={(e) => setEventDraft({ ...eventDraft, title: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Descrição">
              <TextArea
                rows={2}
                value={eventDraft.description ?? ''}
                onChange={(e) => setEventDraft({ ...eventDraft, description: e.target.value })}
              />
            </Field>
            <div className="flex gap-3">
              <Button variant="primary" onClick={saveEvent} disabled={!eventDraft.title}>
                Salvar
              </Button>
              <Button onClick={() => setEventDraft(null)}>Cancelar</Button>
            </div>
          </Card>
        )}

        <div className="space-y-2">
          {events.map((ev) => (
            <Card key={ev.id} className="flex items-center gap-3">
              <span className="flex-1 truncate text-sm">
                {ev.time_label ? `${ev.time_label} · ` : ''}
                {ev.title}
              </span>
              <Button onClick={() => setEventDraft(ev)}>Editar</Button>
              <Button
                variant="danger"
                onClick={async () => {
                  if (
                    await confirm({
                      title: 'Remover evento',
                      message: `Remover "${ev.title}"?`,
                      danger: true,
                      confirmLabel: 'Remover',
                    })
                  ) {
                    await supabase.from('night_events').delete().eq('id', ev.id)
                    await load()
                    toast('Evento removido.', 'success')
                  }
                }}
              >
                ✕
              </Button>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
