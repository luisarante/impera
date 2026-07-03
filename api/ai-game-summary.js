// Vercel Function — FEATURE A (automática): ao encerrar a votação de craque de
// uma noite, gera E PUBLICA uma notícia-resumo da noite (estatísticas, melhores
// partidas, goleadores e o craque eleito). Idempotente: uma matéria por noite —
// regenerar atualiza a mesma linha (ver coluna news.source_night_id, migração 010).
//
// Rota: POST /api/ai-game-summary   body: { nightId: string }
// Protegido por sessão de admin (ver _auth.js). Lê/escreve com a service role
// (bypassa RLS no servidor).
// Env vars: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY.

import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from './_auth.js'
import { generateStructured, NEWS_SCHEMA } from './_gemini.js'

const SYSTEM = `Você é repórter da SilviaNews, a redação do Imperatrice FC (clube também chamado "Impera").
Escreva o RESUMO DA NOITE DE JOGO em português do Brasil, em tom de crônica esportiva com a resenha do clube.

Regras:
- Use SOMENTE os fatos do JSON fornecido (placares, gols e autores, craque, votos, aproveitamento). NÃO invente nada além disso.
- kicker: exatamente "Noite de Jogo".
- headline: manchete que capture o saldo da noite (destaque a maior vitória ou o craque).
- lead: 1 a 2 frases com o panorama (nº de jogos, aproveitamento e craque).
- body_html: corpo em HTML SIMPLES, usando SOMENTE as tags <p>, <h2>, <ul>, <li> e <strong>. Estruture com: um parágrafo de visão geral; uma lista com o placar de cada partida; um trecho destacando os goleadores; e o craque da noite com o número de votos. De 3 a 6 blocos. Nunca use <script>, <style>, <img> ou <iframe>.`

function readBody(req) {
  const b = req.body
  if (!b) return {}
  if (typeof b === 'string') {
    try {
      return JSON.parse(b)
    } catch {
      return {}
    }
  }
  return b
}

/** Lê a noite no Supabase e monta o objeto de FATOS (estatísticas já calculadas). */
async function buildNightFacts(db, nightId) {
  const { data: night } = await db.from('game_nights').select('*').eq('id', nightId).maybeSingle()
  if (!night) return null

  const [matchesRes, candsRes, votesRes, playersRes] = await Promise.all([
    db.from('matches').select('*').eq('night_id', nightId).order('sort_order'),
    db.from('mvp_candidates').select('player_id').eq('night_id', nightId),
    db.from('mvp_votes').select('player_id').eq('night_id', nightId),
    db.from('players').select('id,name,number,position'),
  ])
  const matches = matchesRes.data ?? []
  const nameOf = new Map((playersRes.data ?? []).map((p) => [p.id, p.name]))

  const matchIds = matches.map((m) => m.id)
  let goals = []
  if (matchIds.length) {
    const g = await db
      .from('match_goals')
      .select('match_id,player_id,minute')
      .in('match_id', matchIds)
      .order('minute', { ascending: true, nullsFirst: false })
      .order('sort_order')
    goals = g.data ?? []
  }

  const goalsByMatch = new Map()
  const scorerCount = new Map()
  for (const g of goals) {
    const arr = goalsByMatch.get(g.match_id) ?? []
    arr.push(g)
    goalsByMatch.set(g.match_id, arr)
    scorerCount.set(g.player_id, (scorerCount.get(g.player_id) ?? 0) + 1)
  }

  let vitorias = 0, empates = 0, derrotas = 0, golsPro = 0, golsContra = 0
  let maiorGoleada = null, bestDiff = 0
  const partidas = []
  for (const m of matches) {
    const our = m.our_score
    const opp = m.opp_score
    let resultado = null
    if (our != null && opp != null) {
      golsPro += our
      golsContra += opp
      if (our > opp) { vitorias++; resultado = 'vitória' }
      else if (our < opp) { derrotas++; resultado = 'derrota' }
      else { empates++; resultado = 'empate' }
      const diff = our - opp
      if (diff > bestDiff) { bestDiff = diff; maiorGoleada = { adversario: m.opponent, placar: `${our}x${opp}` } }
    }
    partidas.push({
      adversario: m.opponent,
      placar: our != null && opp != null ? `${our}x${opp}` : null,
      competicao: m.competition || null,
      resultado,
      gols: (goalsByMatch.get(m.id) ?? []).map((g) => ({
        jogador: nameOf.get(g.player_id) ?? 'Jogador',
        minuto: g.minute ?? null,
      })),
    })
  }

  const goleadores = [...scorerCount.entries()]
    .map(([pid, n]) => ({ jogador: nameOf.get(pid) ?? 'Jogador', gols: n }))
    .sort((a, b) => b.gols - a.gols)

  const votos = votesRes.data ?? []
  const votosCraque = night.mvp_winner_id
    ? votos.filter((v) => v.player_id === night.mvp_winner_id).length
    : 0
  const craque = night.mvp_winner_id
    ? { jogador: nameOf.get(night.mvp_winner_id) ?? 'craque', votos: votosCraque }
    : null

  return {
    titulo: night.title,
    data: night.date,
    subtitulo: night.subtitle || null,
    totais: {
      jogos: partidas.length,
      vitorias,
      empates,
      derrotas,
      gols_pro: golsPro,
      gols_contra: golsContra,
      saldo: golsPro - golsContra,
    },
    partidas,
    goleadores,
    maior_goleada: maiorGoleada,
    craque,
    total_votos_craque: votos.length,
    jogadores_que_atuaram: (candsRes.data ?? [])
      .map((c) => nameOf.get(c.player_id))
      .filter(Boolean),
  }
}

/** Publica (ou atualiza, se já existe) a notícia-resumo daquela noite. */
async function upsertNightNews(db, nightId, draft) {
  const payload = {
    kicker: draft.kicker || 'Noite de Jogo',
    headline: draft.headline,
    lead: draft.lead,
    content_html: draft.body_html,
    author: 'Redação SilviaNews',
    verified: true,
    ai_generated: true,
    source_night_id: nightId,
    published_at: new Date().toISOString(),
  }

  const { data: existing } = await db
    .from('news')
    .select('id')
    .eq('source_night_id', nightId)
    .maybeSingle()

  if (existing) {
    const { error } = await db.from('news').update(payload).eq('id', existing.id)
    if (error) throw new Error(error.message)
    return existing.id
  }

  // Novo: joga para o fim da lista (maior sort_order + 1).
  const { data: top } = await db
    .from('news')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  payload.sort_order = (top?.sort_order ?? 0) + 1

  const { data: inserted, error } = await db.from('news').insert(payload).select('id').maybeSingle()
  if (error) throw new Error(error.message)
  return inserted?.id ?? null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Método não permitido.' })
  }

  try {
    await requireAdmin(req)

    const nightId = String(readBody(req).nightId ?? '').trim()
    if (!nightId) return res.status(400).json({ error: 'nightId é obrigatório.' })

    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      return res.status(500).json({ error: 'Supabase (service role) não configurado no servidor.' })
    }
    const db = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const facts = await buildNightFacts(db, nightId)
    if (!facts) return res.status(404).json({ error: 'Noite não encontrada.' })

    const draft = await generateStructured({
      system: SYSTEM,
      prompt: `Dados da noite (JSON, use somente estes fatos):\n\n${JSON.stringify(facts, null, 2)}\n\nEscreva o resumo da noite.`,
      schema: NEWS_SCHEMA,
      temperature: 0.6,
    })

    const id = await upsertNightNews(db, nightId, draft)
    return res.status(200).json({ id, ...draft })
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || 'Falha ao gerar o resumo da noite.' })
  }
}
