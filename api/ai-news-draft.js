// Vercel Function — FEATURE B (assistida): a partir de um briefing curto do
// admin, gera um RASCUNHO de notícia (categoria, manchete, linha-fina e corpo).
// NÃO salva nada: devolve o JSON para o painel pré-preencher o editor. O humano
// revisa e publica pelo fluxo normal.
//
// Rota: POST /api/ai-news-draft   body: { brief: string }
// Protegido por sessão de admin (ver _auth.js).
// Env vars: SUPABASE_URL, SUPABASE_ANON_KEY, GEMINI_API_KEY.

import { requireAdmin } from './_auth.js'
import { generateStructured, NEWS_SCHEMA } from './_gemini.js'
import { VOICE } from './_persona.js'

// Voz/personalidade em _persona.js; aqui ficam só as regras de FORMATO da notícia.
const SYSTEM = `${VOICE}

Formato da saída (rascunho de NOTÍCIA a partir de um briefing):
- kicker: a categoria/chapéu, de 1 a 3 palavras (ex.: "Bastidores", "Mercado", "Tática", "Elenco").
- headline: manchete curta e forte (até ~90 caracteres).
- lead: linha-fina de 1 a 2 frases resumindo a matéria.
- body_html: corpo em HTML SIMPLES, usando SOMENTE as tags <p>, <h2>, <ul>, <li>, <strong> e <em>. De 2 a 5 parágrafos. Nunca use <script>, <style>, <img> ou <iframe>.`

function readBody(req) {
  const b = req.body
  if (!b) return {}
  if (typeof b === 'string') {
    try {
      return JSON.parse(b)
    } catch {
      return {}
    }
  }
  return b
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Método não permitido.' })
  }

  try {
    await requireAdmin(req)

    const brief = String(readBody(req).brief ?? '').trim()
    if (!brief) return res.status(400).json({ error: 'Informe um briefing do que a notícia deve tratar.' })

    const draft = await generateStructured({
      system: SYSTEM,
      prompt: `Briefing do que a notícia deve tratar:\n\n${brief}\n\nGere a notícia estruturada a partir apenas desse briefing.`,
      schema: NEWS_SCHEMA,
    })

    return res.status(200).json(draft)
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || 'Falha ao gerar o rascunho.' })
  }
}
