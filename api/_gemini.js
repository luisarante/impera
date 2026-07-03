// Helper compartilhado: chama o Google Gemini (free tier) pedindo SAÍDA
// ESTRUTURADA (JSON garantido via responseSchema) e devolve o objeto parseado.
//
// Env vars de runtime: GEMINI_API_KEY (Google AI Studio, free tier). Opcional:
// GEMINI_MODEL (default 'gemini-2.5-flash').
//
// O provedor está isolado aqui de propósito: para trocar por outro (Groq etc.),
// reescreva apenas generateStructured() — os endpoints não precisam mudar.

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

// Formato de saída comum às duas features (rascunho de notícia).
export const NEWS_SCHEMA = {
  type: 'OBJECT',
  properties: {
    kicker: { type: 'STRING' },
    headline: { type: 'STRING' },
    lead: { type: 'STRING' },
    body_html: { type: 'STRING' },
  },
  required: ['kicker', 'headline', 'lead', 'body_html'],
  propertyOrdering: ['kicker', 'headline', 'lead', 'body_html'],
}

/**
 * Gera conteúdo estruturado com o Gemini.
 * @param {object}  opts
 * @param {string}  opts.system        instrução de sistema (tom, regras)
 * @param {string}  opts.prompt        conteúdo do usuário (fatos/briefing)
 * @param {object}  opts.schema        responseSchema (subconjunto OpenAPI do Gemini)
 * @param {number} [opts.temperature]  criatividade (default 0.7)
 * @returns {Promise<object>} objeto conforme o schema
 */
export async function generateStructured({ system, prompt, schema, temperature = 0.7 }) {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY não configurada nas variáveis de ambiente.')

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: schema,
      temperature,
    },
  }
  if (system) body.systemInstruction = { parts: [{ text: system }] }

  const r = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify(body),
  })

  const data = await r.json().catch(() => null)
  if (!r.ok) {
    throw new Error(data?.error?.message || `Gemini respondeu ${r.status}.`)
  }

  const cand = data?.candidates?.[0]
  const text = (cand?.content?.parts ?? []).map((p) => p.text ?? '').join('')
  if (!text) {
    const reason = cand?.finishReason || data?.promptFeedback?.blockReason || 'sem conteúdo'
    throw new Error(`Gemini não retornou texto (${reason}).`)
  }

  try {
    return JSON.parse(text)
  } catch {
    throw new Error('Gemini retornou um JSON inválido.')
  }
}
