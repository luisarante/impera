// Vercel Function — botão "Sincronizar agora" do admin (Noites de jogo).
//
// Rota: POST /api/ea-sync-manual   (protegido por sessão de admin, ver _auth.js)
// Reaproveita o mesmo núcleo de sincronização do cron (`_eaSync.js`).

import { requireAdmin } from './_auth.js'
import { runEaSync } from './_eaSync.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Método não permitido.' })
  }

  try {
    await requireAdmin(req)
    const result = await runEaSync()
    return res.status(200).json(result)
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || 'Falha na sincronização EA.' })
  }
}
