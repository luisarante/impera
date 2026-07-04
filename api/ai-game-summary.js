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
import { VOICE } from './_persona.js'
import { renderNightCoverPng } from './_nightCover.js'

// Voz/personalidade em _persona.js; aqui ficam só as regras de FORMATO do resumo.
const SYSTEM = `${VOICE}

Formato da saída (RESUMO DA NOITE DE JOGO, a partir do JSON de fatos):
- Use SOMENTE os fatos do JSON fornecido (placares, gols e autores, craque, votos, aproveitamento).
- Se o campo "acontecimentos" estiver presente, incorpore esses fatos de bastidores à narrativa — pode citar nomes e desentendimentos abertamente, no tom da resenha. Se estiver nulo, ignore.
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

  const [matchesRes, candsRes, votesRes, playersRes, notesRes, clubRes] = await Promise.all([
    db.from('matches').select('*').eq('night_id', nightId).order('sort_order'),
    db.from('mvp_candidates').select('player_id').eq('night_id', nightId),
    db.from('mvp_votes').select('player_id').eq('night_id', nightId),
    db.from('players').select('id,name,number,position,photo_path'),
    db.from('night_notes').select('body').eq('night_id', nightId).maybeSingle(),
    db.from('club').select('name,badge_name').maybeSingle(),
  ])
  const matches = matchesRes.data ?? []
  const players = playersRes.data ?? []
  const nameOf = new Map(players.map((p) => [p.id, p.name]))
  const numberOf = new Map(players.map((p) => [p.id, p.number]))
  const photoOf = new Map(players.map((p) => [p.id, p.photo_path]))

  const matchIds = matches.map((m) => m.id)
  let goals = []
  if (matchIds.length) {
    const g = await db
      .from('match_goals')
      .select('match_id,player_id,minute,team')
      .in('match_id', matchIds)
      .order('sort_order')
    // Só os gols NOSSOS com autor entram nos goleadores/atribuições do resumo.
    goals = (g.data ?? []).filter((x) => x.team === 'nos' && x.player_id)
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

  const facts = {
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
    // Bastidores privados escritos pelo admin (ver night_notes / migração 011).
    acontecimentos: (notesRes.data?.body || '').trim() || null,
  }

  // Dados extras usados só pela ARTE da capa (não vão no prompt do texto).
  const cover = {
    club: clubRes.data ?? null,
    craquePhotoPath: night.mvp_winner_id ? photoOf.get(night.mvp_winner_id) ?? null : null,
    craqueNumber: night.mvp_winner_id ? numberOf.get(night.mvp_winner_id) ?? null : null,
  }

  return { facts, cover }
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

/** Baixa a foto pública de um jogador e devolve como data URI base64 (ou null). */
async function fetchPhotoDataUri(baseUrl, path) {
  try {
    const r = await fetch(`${baseUrl}/storage/v1/object/public/players/${path}`)
    if (!r.ok) return null
    const ct = r.headers.get('content-type') || 'image/jpeg'
    const buf = Buffer.from(await r.arrayBuffer())
    return `data:${ct};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}

/** Gera a arte PNG da noite, sobe no bucket `news` e seta cover_path na matéria. */
async function generateAndAttachCover(db, baseUrl, newsId, nightId, facts, cover) {
  const craquePhotoDataUri = cover.craquePhotoPath
    ? await fetchPhotoDataUri(baseUrl, cover.craquePhotoPath)
    : null

  const png = await renderNightCoverPng({
    club: cover.club,
    facts: {
      ...facts,
      craque: facts.craque ? { ...facts.craque, number: cover.craqueNumber } : null,
    },
    craquePhotoDataUri,
  })

  const objectName = `night-${nightId}-${Date.now()}.png`
  const { error: upErr } = await db.storage
    .from('news')
    .upload(objectName, Buffer.from(png), { contentType: 'image/png', upsert: true })
  if (upErr) throw new Error(upErr.message)

  // Troca o cover_path da matéria e limpa a capa auto-gerada anterior (cache de CDN).
  const { data: cur } = await db.from('news').select('cover_path').eq('id', newsId).maybeSingle()
  const { error: updErr } = await db.from('news').update({ cover_path: objectName }).eq('id', newsId)
  if (updErr) throw new Error(updErr.message)

  const prev = cur?.cover_path
  if (prev && prev !== objectName && /^night-.*\.png$/.test(prev)) {
    await db.storage.from('news').remove([prev]).catch(() => {})
  }
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

    const built = await buildNightFacts(db, nightId)
    if (!built) return res.status(404).json({ error: 'Noite não encontrada.' })
    const { facts, cover } = built

    const draft = await generateStructured({
      system: SYSTEM,
      prompt: `Dados da noite (JSON, use somente estes fatos):\n\n${JSON.stringify(facts, null, 2)}\n\nEscreva o resumo da noite.`,
      schema: NEWS_SCHEMA,
      temperature: 0.6,
    })

    const id = await upsertNightNews(db, nightId, draft)

    // Capa (arte da noite) — best-effort: uma falha aqui NÃO quebra o resumo.
    await generateAndAttachCover(db, url, id, nightId, facts, cover).catch((e) => {
      console.error('Falha ao gerar/anexar a capa da noite:', e)
    })

    return res.status(200).json({ id, ...draft })
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || 'Falha ao gerar o resumo da noite.' })
  }
}
