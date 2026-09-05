/**
 * Camada de acesso aos vínculos EA→jogador (a sincronização em si roda
 * localmente, ver scripts/ea-sync-local.mjs — a EA bloqueia chamadas de
 * servidores de nuvem). Leitura pública; escrita exige sessão de admin.
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
