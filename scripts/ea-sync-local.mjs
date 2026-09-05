// Sincronização EA rodando LOCALMENTE (PC/rede de casa), não na Vercel.
//
// Por quê: a API pública da EA (proclubs.ea.com) bloqueia por IP as chamadas
// vindas de datacenter/nuvem (Vercel, AWS, etc. — qualquer uma), então o
// endpoint que rodava como Vercel Function nunca vai conseguir buscar os
// dados. Um IP residencial de verdade (seu PC/roteador de casa) não é
// bloqueado. O site continua 100% na Vercel; só essa busca roda aqui.
//
// Como rodar manualmente (na raiz do projeto):
//   node --env-file=.env.local scripts/ea-sync-local.mjs
// ou (atalho já configurado no package.json):
//   npm run sync:ea
//
// Como automatizar (Windows, Agendador de Tarefas): ver README ou peça o
// passo a passo — a ação é rodar o mesmo comando acima diariamente.
//
// Reaproveita 100% a lógica de api/_eaSync.js (mesmo dedup/idempotência).
// Precisa das mesmas env vars que a Vercel usaria: SUPABASE_URL (ou
// VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY, EA_CLUB_ID, EA_PLATFORM —
// já devem estar no seu .env.local.

import { runEaSync } from '../api/_eaSync.js'

try {
  const result = await runEaSync()
  console.log(JSON.stringify(result, null, 2))
  if (result.warning) {
    console.error(`\nAVISO: ${result.warning}`)
    process.exitCode = 1
  }
} catch (err) {
  console.error('Falha na sincronização EA:', err.message || err)
  process.exitCode = 1
}
