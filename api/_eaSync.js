// Núcleo da sincronização EA → Supabase. Compartilhado pelo endpoint de cron
// (`ea-sync.js`) e pelo botão "Sincronizar agora" do admin (`ea-sync-manual.js`).
//
// Idempotente: roda quantas vezes quiser, sem duplicar partidas nem stats —
// dedup por `matches.ea_match_id` (unique) e `match_player_stats (match_id,
// ea_player_id)` (unique). Erros numa partida não abortam o lote.
//
// Env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (bypassa RLS), EA_CLUB_ID,
// EA_PLATFORM.

import { createClient } from '@supabase/supabase-js'
import { fetchEaClubMatches, envClubId } from './_eaClient.js'

function dbClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Supabase (service role) não configurado no servidor.')
  }
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
}

// Sessões de Pro Clubs passam da meia-noite: uma partida iniciada antes das
// 06:00 (horário de Brasília) conta para a "noite" do dia anterior.
const TZ_OFFSET_HOURS = -3
const ROLLOVER_HOUR = 6

function eaNightKey(timestampSeconds) {
  const localMs = timestampSeconds * 1000 + TZ_OFFSET_HOURS * 3600_000
  const local = new Date(localMs)
  if (local.getUTCHours() < ROLLOVER_HOUR) local.setUTCDate(local.getUTCDate() - 1)
  const y = local.getUTCFullYear()
  const mo = String(local.getUTCMonth() + 1).padStart(2, '0')
  const d = String(local.getUTCDate()).padStart(2, '0')
  return { key: `ea-${y}-${mo}-${d}`, date: `${y}-${mo}-${d}` }
}

function competitionLabel(matchType) {
  return matchType === 'playoffMatch' ? 'Playoff' : 'Liga'
}

/**
 * Extrai os dados relevantes de um match cru da EA (formato pode variar —
 * ver README na PR original antes de confiar cegamente nos nomes de campo).
 */
function normalizeMatch(raw, clubId) {
  const clubs = raw.clubs || {}
  const players = raw.players || {}
  const ourKey = Object.keys(clubs).find((k) => k === String(clubId))
  if (!ourKey) return null
  const oppKey = Object.keys(clubs).find((k) => k !== ourKey)
  if (!oppKey) return null

  const ourClub = clubs[ourKey]
  const oppClub = clubs[oppKey]
  const ourScore = Number(ourClub?.goals ?? ourClub?.score ?? 0)
  const oppScore = Number(oppClub?.goals ?? oppClub?.score ?? 0)
  const opponent = oppClub?.details?.name || oppClub?.name || 'Adversário'

  const ourPlayers = players[ourKey] || {}
  const stats = Object.entries(ourPlayers).map(([eaPlayerId, p]) => ({
    eaPlayerId: String(eaPlayerId),
    personaName: p.playername || p.persona || 'Jogador',
    goals: Number(p.goals ?? 0),
    assists: Number(p.assists ?? 0),
    rating: p.rating != null && p.rating !== '' ? Number(p.rating) : null,
    saves: p.saves != null && p.saves !== '' ? Number(p.saves) : null,
    position: p.pos || p.position || null,
    isMotm: String(p.mom ?? p.MOM ?? '0') === '1',
  }))

  const eaMatchId = String(raw.matchId ?? raw.matchID ?? '')
  if (!eaMatchId) return null

  return {
    eaMatchId,
    eaMatchType: raw.matchType,
    competition: competitionLabel(raw.matchType),
    opponent,
    ourScore,
    oppScore,
    timestamp: Number(raw.timestamp ?? 0),
    stats,
  }
}

async function logRun(db, startedAt, ok, matchesSeen, matchesNew, error) {
  try {
    await db.from('ea_sync_runs').insert({
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      ok,
      matches_seen: matchesSeen,
      matches_new: matchesNew,
      error,
    })
  } catch (e) {
    console.error('Falha ao gravar ea_sync_runs:', e)
  }
}

/** Garante (find-or-create) a noite EA correspondente a uma partida. */
async function findOrCreateEaNight(db, timestamp) {
  const { key: nightKey, date } = eaNightKey(timestamp)
  const { data: existing } = await db
    .from('game_nights')
    .select('id')
    .eq('ea_night_key', nightKey)
    .maybeSingle()
  if (existing) return { id: existing.id, created: false }

  const { data: created, error } = await db
    .from('game_nights')
    .insert({
      title: `Sessão EA — ${date.split('-').reverse().join('/')}`,
      date,
      ea_night_key: nightKey,
    })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  return { id: created.id, created: true }
}

/** Upsert das stats por jogador + mapeamento EA→jogador + candidatos a craque. */
async function syncMatchStats(db, matchId, nightId, stats) {
  if (!stats.length) return

  const statRows = stats.map((s) => ({
    match_id: matchId,
    ea_player_id: s.eaPlayerId,
    ea_persona_name: s.personaName,
    goals: s.goals,
    assists: s.assists,
    rating: s.rating,
    saves: s.saves,
    position: s.position,
    is_motm: s.isMotm,
  }))
  const { error: statsErr } = await db
    .from('match_player_stats')
    .upsert(statRows, { onConflict: 'match_id,ea_player_id' })
  if (statsErr) throw new Error(statsErr.message)

  const eaPlayerIds = stats.map((s) => s.eaPlayerId)
  const { data: knownMaps } = await db
    .from('ea_player_map')
    .select('ea_player_id, ea_persona_name, player_id')
    .in('ea_player_id', eaPlayerIds)
  const known = new Map((knownMaps ?? []).map((r) => [r.ea_player_id, r]))

  for (const s of stats) {
    const cur = known.get(s.eaPlayerId)
    if (!cur) {
      await db.from('ea_player_map').insert({ ea_player_id: s.eaPlayerId, ea_persona_name: s.personaName })
    } else if (cur.ea_persona_name !== s.personaName) {
      await db
        .from('ea_player_map')
        .update({ ea_persona_name: s.personaName, updated_at: new Date().toISOString() })
        .eq('ea_player_id', s.eaPlayerId)
    }
  }

  // Craque da noite: marca como candidato quem jogou e já está vinculado a um
  // jogador do elenco (personas ainda não mapeadas ficam de fora até o admin
  // vincular em "Vínculos EA").
  const mappedIds = eaPlayerIds.filter((id) => known.get(id)?.player_id)
  for (const id of mappedIds) {
    const playerId = known.get(id).player_id
    await db
      .from('mvp_candidates')
      .upsert({ night_id: nightId, player_id: playerId }, { onConflict: 'night_id,player_id' })
  }
}

/** Roda a sincronização completa. Devolve um resumo; lança se o job falhar por inteiro. */
export async function runEaSync() {
  const db = dbClient()
  const startedAt = new Date().toISOString()
  let matchesSeen = 0
  let matchesNew = 0
  let nightsCreated = 0

  try {
    const clubId = envClubId()
    const raw = await fetchEaClubMatches()
    matchesSeen = raw.length

    const normalized = raw.map((m) => normalizeMatch(m, clubId)).filter(Boolean)

    if (normalized.length) {
      const eaIds = normalized.map((m) => m.eaMatchId)
      const { data: existingRows } = await db.from('matches').select('ea_match_id').in('ea_match_id', eaIds)
      const existing = new Set((existingRows ?? []).map((r) => r.ea_match_id))
      const toInsert = normalized.filter((m) => !existing.has(m.eaMatchId))

      for (const m of toInsert) {
        try {
          const { id: nightId, created } = await findOrCreateEaNight(db, m.timestamp)
          if (created) nightsCreated++

          const { data: sortRow } = await db
            .from('matches')
            .select('sort_order')
            .eq('night_id', nightId)
            .order('sort_order', { ascending: false })
            .limit(1)
            .maybeSingle()
          const sortOrder = (sortRow?.sort_order ?? 0) + 1

          const { data: matchRow, error: matchErr } = await db
            .from('matches')
            .upsert(
              {
                night_id: nightId,
                opponent: m.opponent,
                our_score: m.ourScore,
                opp_score: m.oppScore,
                competition: m.competition,
                status: 'encerrada',
                sort_order: sortOrder,
                ea_match_id: m.eaMatchId,
                ea_match_type: m.eaMatchType,
              },
              { onConflict: 'ea_match_id' },
            )
            .select('id')
            .single()
          if (matchErr) throw new Error(matchErr.message)

          await syncMatchStats(db, matchRow.id, nightId, m.stats)
          matchesNew++
        } catch (matchErr) {
          console.error(`Falha ao sincronizar partida EA ${m.eaMatchId}:`, matchErr)
        }
      }
    }

    await logRun(db, startedAt, true, matchesSeen, matchesNew, null)
    return { ok: true, matchesSeen, matchesNew, nightsCreated }
  } catch (err) {
    await logRun(db, startedAt, false, matchesSeen, matchesNew, err.message || String(err))
    throw err
  }
}
