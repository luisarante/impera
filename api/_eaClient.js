// Helper compartilhado: fala com a API pública (sem login) da EA Pro Clubs.
// Chamado só server-side (Vercel Functions) — direto do navegador a EA bloqueia
// por CORS/anti-bot. Não requer token; só um User-Agent de navegador comum.
//
// Env vars: EA_CLUB_ID, EA_PLATFORM (ex.: 'common-gen5').

const BASE = 'https://proclubs.ea.com/api/fc/clubs'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

function envClubId() {
  const id = process.env.EA_CLUB_ID
  if (!id) throw new Error('EA_CLUB_ID não configurado no servidor.')
  return id
}

function envPlatform() {
  return process.env.EA_PLATFORM || 'common-gen5'
}

async function eaFetch(path, params) {
  const url = new URL(`${BASE}${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const r = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
  })
  if (!r.ok) throw new Error(`EA respondeu ${r.status} em ${path}`)
  return r.json()
}

/**
 * Busca as partidas recentes do clube (liga + playoff). A EA só devolve as
 * ~10 mais recentes de cada tipo. Devolve `{ matches, errors }`: erros de UM
 * tipo não derrubam o outro, mas ficam visíveis (nunca somem silenciosos).
 */
export async function fetchEaClubMatches() {
  const clubId = envClubId()
  const platform = envPlatform()
  const types = ['leagueMatch', 'playoffMatch']
  const errors = []
  const results = await Promise.all(
    types.map((matchType) =>
      eaFetch('/matches', { matchType, platform, clubIds: clubId })
        .then((data) => (Array.isArray(data) ? data.map((m) => ({ ...m, matchType })) : []))
        .catch((e) => {
          errors.push(`${matchType}: ${e.message}`)
          return []
        }),
    ),
  )
  return { matches: results.flat(), errors }
}

export { envClubId, envPlatform }
