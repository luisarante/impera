// Função serverless da Vercel: preview rico (Open Graph) por matéria.
//
// Rota: /noticias/:id  →  (vercel.json)  →  /api/news-og?id=:id
// Busca a matéria no Supabase, pega o index.html buildado e injeta as meta tags
// OG específicas da matéria. Humano continua vendo a SPA (o React abre o painel
// da matéria); o robô do WhatsApp/Facebook lê o card (capa + manchete + lead).
//
// Env vars de runtime necessárias na Vercel: SUPABASE_URL, SUPABASE_ANON_KEY.

const SITE_NAME = 'Imperatrice FC'

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function fetchArticle(id) {
  const base = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY
  if (!base || !key) return null
  const url =
    `${base}/rest/v1/news?id=eq.${encodeURIComponent(id)}` +
    `&select=headline,lead,cover_path,author,published_at&limit=1`
  try {
    const r = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
    if (!r.ok) return null
    const rows = await r.json()
    return Array.isArray(rows) && rows[0] ? rows[0] : null
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  const host = req.headers['x-forwarded-host'] || req.headers.host
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const origin = `${proto}://${host}`
  const id = (req.query && req.query.id) || ''

  const article = id ? await fetchArticle(id) : null

  const title = article ? article.headline : SITE_NAME
  const description = article ? article.lead || '' : 'A experiência imersiva do clube.'
  const image = article && article.cover_path
    ? `${process.env.SUPABASE_URL}/storage/v1/object/public/news/${article.cover_path}`
    : `${origin}/assets/hero.jpeg`
  const pageUrl = id ? `${origin}/noticias/${id}` : origin

  const meta =
    `<title>${esc(title)}${article ? ` — ${SITE_NAME}` : ''}</title>` +
    `<meta name="description" content="${esc(description)}" />` +
    `<meta property="og:type" content="${article ? 'article' : 'website'}" />` +
    `<meta property="og:site_name" content="${esc(SITE_NAME)}" />` +
    `<meta property="og:title" content="${esc(title)}" />` +
    `<meta property="og:description" content="${esc(description)}" />` +
    `<meta property="og:image" content="${esc(image)}" />` +
    `<meta property="og:url" content="${esc(pageUrl)}" />` +
    `<meta name="twitter:card" content="summary_large_image" />` +
    `<meta name="twitter:title" content="${esc(title)}" />` +
    `<meta name="twitter:description" content="${esc(description)}" />` +
    `<meta name="twitter:image" content="${esc(image)}" />`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400')

  // Pega o index.html real (com os hashes corretos dos assets).
  let html
  try {
    const r = await fetch(`${origin}/index.html`, { headers: { 'user-agent': 'news-og' } })
    html = await r.text()
  } catch {
    html = null
  }

  if (!html || !html.includes('</head>')) {
    // Fallback: HTML mínimo com as tags + redirect para a SPA.
    res.status(200).send(
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" />${meta}` +
        `<meta http-equiv="refresh" content="0;url=${esc(pageUrl)}" /></head><body></body></html>`,
    )
    return
  }

  // Remove tags OG/Twitter/title/description já existentes e injeta as da matéria.
  html = html
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+name="description"[^>]*>/gi, '')
    .replace(/<meta\s+(?:property|name)="(?:og:[^"]*|twitter:[^"]*)"[^>]*>/gi, '')
    .replace('</head>', `${meta}</head>`)

  res.status(200).send(html)
}
