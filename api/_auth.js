// Helper compartilhado: exige que a requisição venha de um ADMIN autenticado.
// Valida o access token do Supabase (enviado pelo painel como Bearer) contra o
// endpoint /auth/v1/user. Protege os endpoints de IA de consumirem a cota grátis
// (só quem tem sessão no painel — ou seja, o admin — consegue disparar).
//
// Env vars de runtime: SUPABASE_URL, SUPABASE_ANON_KEY.

/**
 * Verifica o Bearer token do Supabase. Devolve o usuário autenticado ou lança um
 * erro com `.status` (401/500) para o handler responder adequadamente.
 * @param {import('http').IncomingMessage & { headers: Record<string,string> }} req
 */
export async function requireAdmin(req) {
  // Reaproveita as VITE_* já existentes se as versões sem prefixo não estiverem definidas.
  const base = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!base || !anon) {
    const e = new Error('Supabase não configurado no servidor.')
    e.status = 500
    throw e
  }

  const header = req.headers.authorization || req.headers.Authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) {
    const e = new Error('Não autenticado.')
    e.status = 401
    throw e
  }

  const r = await fetch(`${base}/auth/v1/user`, {
    headers: { apikey: anon, Authorization: `Bearer ${token}` },
  })
  if (!r.ok) {
    const e = new Error('Sessão inválida ou expirada.')
    e.status = 401
    throw e
  }
  return r.json()
}
