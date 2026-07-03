/**
 * Chamadas aos endpoints serverless de IA (Vercel Functions em /api).
 *
 * Ambos exigem sessão de admin — enviam o access token do Supabase como Bearer
 * para o endpoint validar (protege a cota gratuita do Gemini).
 *
 * ATENÇÃO: as funções /api NÃO são servidas pelo `vite dev`. Para testar
 * localmente use `vercel dev` (sobe o Vite + as funções juntos) ou um Preview
 * Deploy da Vercel.
 */
import { supabase } from './supabase'

export interface NewsDraft {
  kicker: string
  headline: string
  lead: string
  body_html: string
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Sessão expirada — entre novamente para usar a IA.')

  const r = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })

  const text = await r.text()
  let parsed: unknown = null
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    // Resposta não-JSON (ex.: HTML do 404 quando rodando só com `vite dev`).
  }

  if (!r.ok) {
    const msg =
      (parsed as { error?: string } | null)?.error ??
      'Falha na IA. Lembre: os endpoints /api só rodam em `vercel dev` ou na Vercel.'
    throw new Error(msg)
  }
  return parsed as T
}

/** Feature A: gera E publica o resumo da noite como notícia na SilviaNews. */
export async function requestNightSummary(nightId: string): Promise<void> {
  await postJson('/api/ai-game-summary', { nightId })
}

/** Feature B: gera um rascunho de notícia a partir de um briefing (não salva). */
export async function requestNewsDraft(brief: string): Promise<NewsDraft> {
  return postJson<NewsDraft>('/api/ai-news-draft', { brief })
}
