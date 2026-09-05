/**
 * Camada de acesso aos dados sincronizados da EA Pro Clubs (vínculos de
 * jogador e disparo manual da sincronização). Leitura pública dos vínculos;
 * escrita e o disparo manual exigem sessão de admin.
 */
import { supabase } from './supabase'

export interface EaPlayerMapRow {
  eaPlayerId: string
  personaName: string
  playerId: string | null
}

/** Todos os vínculos EA→jogador conhecidos (mapeados ou não). */
export async function fetchEaPlayerMap(): Promise<EaPlayerMapRow[]> {
  const { data, error } = await supabase
    .from('ea_player_map')
    .select('ea_player_id, ea_persona_name, player_id')
    .order('ea_persona_name')
  if (error) throw new Error('Falha ao carregar os vínculos EA.')
  return (data ?? []).map((r) => ({
    eaPlayerId: r.ea_player_id as string,
    personaName: r.ea_persona_name as string,
    playerId: (r.player_id as string) ?? null,
  }))
}

/** Vincula (ou desvincula, com `playerId: null`) uma persona da EA a um jogador do elenco. */
export async function setEaPlayerMapping(eaPlayerId: string, playerId: string | null): Promise<void> {
  const { error } = await supabase
    .from('ea_player_map')
    .update({ player_id: playerId, updated_at: new Date().toISOString() })
    .eq('ea_player_id', eaPlayerId)
  if (error) throw new Error('Falha ao salvar o vínculo.')
}

export interface EaSyncResult {
  ok: boolean
  matchesSeen: number
  matchesNew: number
  nightsCreated: number
  skipped?: number
  warning?: string // ex.: falha ao consultar a EA (não impede o restante do sync)
}

/**
 * Dispara a sincronização manual com a EA ("Sincronizar agora" no admin).
 * ATENÇÃO: /api não roda em `vite dev` — use `vercel dev` ou um deploy.
 */
export async function syncEaNow(): Promise<EaSyncResult> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Sessão expirada — entre novamente.')

  const r = await fetch('/api/ea-sync-manual', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
  })
  const text = await r.text()
  let parsed: unknown = null
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    // resposta não-JSON (ex.: rodando só com `vite dev`)
  }
  if (!r.ok) {
    const msg = (parsed as { error?: string } | null)?.error ?? 'Falha ao sincronizar com a EA.'
    throw new Error(msg)
  }
  return parsed as EaSyncResult
}
