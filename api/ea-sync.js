// Vercel Function — sincronização periódica com a EA Pro Clubs (cron).
//
// Rota: GET /api/ea-sync?key=<CRON_SECRET>  (ou Authorization: Bearer <CRON_SECRET>)
// Chamado pelo `crons` do vercel.json. Quando a env var CRON_SECRET está
// definida, a própria Vercel injeta automaticamente o header
// `Authorization: Bearer <CRON_SECRET>` nas chamadas de cron — não é preciso
// (nem seguro) hardcodar o segredo no vercel.json. O `?key=` fica como forma
// alternativa para testar manualmente via curl (`vercel dev`).
//
// Env vars: CRON_SECRET, + as exigidas por _eaSync.js (SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY, EA_CLUB_ID, EA_PLATFORM).

import { runEaSync } from './_eaSync.js'

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

function isAuthorized(req) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = req.headers.authorization || req.headers.Authorization || ''
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (bearer && timingSafeEqual(bearer, secret)) return true
  const key = req.query?.key
  if (typeof key === 'string' && timingSafeEqual(key, secret)) return true
  return false
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Método não permitido.' })
  }
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Não autorizado.' })
  }

  try {
    const result = await runEaSync()
    return res.status(200).json(result)
  } catch (e) {
    console.error('Falha na sincronização EA:', e)
    return res.status(500).json({ ok: false, error: e.message || 'Falha na sincronização EA.' })
  }
}
