// Helper compartilhado: gera a ARTE (PNG) da capa do resumo de uma noite —
// cores do clube, título da noite, faixa de resultados (V·E·D + gols) e o bloco
// do craque (foto com anel dourado, ou escudo + número quando sem foto).
//
// Isolado de propósito: o @vercel/og é importado DINAMICAMENTE e as fontes são
// lidas de forma lazy, para que qualquer falha aqui seja capturada por quem
// chama (ai-game-summary.js) SEM derrubar a geração do texto do resumo.
//
// Fontes bundladas em api/assets/ (incluídas no deploy via vercel.json includeFiles).

import { createElement } from 'react'
import { readFileSync } from 'node:fs'

const GREEN_DARK = '#06301b'
const INK = '#04140b'
const GOLD = '#ffd000'
const PAPER = '#f4f1e8'
const MUTED = 'rgba(244,241,232,0.62)'

let cachedFonts = null
function loadFonts() {
  if (cachedFonts) return cachedFonts
  cachedFonts = [
    { name: 'Anton', data: readFileSync(new URL('./assets/Anton-Regular.ttf', import.meta.url)), weight: 400, style: 'normal' },
    { name: 'Barlow', data: readFileSync(new URL('./assets/Barlow-SemiBold.ttf', import.meta.url)), weight: 600, style: 'normal' },
    { name: 'Barlow', data: readFileSync(new URL('./assets/Barlow-Bold.ttf', import.meta.url)), weight: 700, style: 'normal' },
  ]
  return cachedFonts
}

/** createElement com estilo já embutido (satori usa `style`). */
const el = (type, style, ...children) => createElement(type, style ? { style } : null, ...children)

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('pt-BR')
}

function statTile(value, label) {
  return el(
    'div',
    {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '12px 24px',
      borderRadius: 16,
      border: '1px solid rgba(255,208,0,0.35)',
      background: 'rgba(0,0,0,0.28)',
    },
    el('div', { fontFamily: 'Anton', fontSize: 46, color: PAPER, lineHeight: 1 }, value),
    el(
      'div',
      { fontFamily: 'Barlow', fontWeight: 600, fontSize: 15, letterSpacing: 2, textTransform: 'uppercase', color: GOLD, marginTop: 6 },
      label,
    ),
  )
}

function craqueAvatar(photoDataUri, number, badge) {
  const ring = {
    display: 'flex',
    width: 210,
    height: 210,
    borderRadius: 210,
    border: `6px solid ${GOLD}`,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    background: GREEN_DARK,
  }
  if (photoDataUri) {
    return el(
      'div',
      ring,
      createElement('img', {
        src: photoDataUri,
        style: { width: 210, height: 210, borderRadius: 210, objectFit: 'cover' },
      }),
    )
  }
  const num = String(number || '').replace('#', '')
  return el(
    'div',
    ring,
    el(
      'div',
      { display: 'flex', flexDirection: 'column', alignItems: 'center' },
      el('div', { fontFamily: 'Anton', fontSize: 82, color: GOLD, lineHeight: 1 }, num || badge),
      num
        ? el('div', { fontFamily: 'Barlow', fontWeight: 700, fontSize: 18, letterSpacing: 3, color: PAPER, marginTop: 4 }, badge)
        : null,
    ),
  )
}

function buildCard({ club, facts, craquePhotoDataUri }) {
  const badge = String(club?.badge_name || 'IMP').toUpperCase()
  const clubName = String(club?.name || 'Imperatrice').toUpperCase()
  const t = facts.totais || {}
  const ved = `${t.vitorias ?? 0}·${t.empates ?? 0}·${t.derrotas ?? 0}`
  const gols = `${t.gols_pro ?? 0}–${t.gols_contra ?? 0}`
  const saldoN = (t.gols_pro ?? 0) - (t.gols_contra ?? 0)
  const saldo = `${saldoN >= 0 ? '+' : ''}${saldoN}`
  const title = String(facts.titulo || 'Noite de Jogo')
  const titleSize = title.length > 30 ? 56 : title.length > 20 ? 70 : 86
  const craque = facts.craque

  return el(
    'div',
    {
      width: 1200,
      height: 675,
      display: 'flex',
      flexDirection: 'column',
      padding: 56,
      color: PAPER,
      fontFamily: 'Barlow',
      backgroundImage: `linear-gradient(135deg, ${GREEN_DARK} 0%, #0a5e34 52%, ${INK} 100%)`,
      position: 'relative',
    },
    el('div', { position: 'absolute', top: 0, left: 0, right: 0, height: 10, background: GOLD }),

    // Cabeçalho
    el(
      'div',
      { display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
      el(
        'div',
        { display: 'flex', flexDirection: 'row', alignItems: 'center' },
        el(
          'div',
          {
            display: 'flex',
            width: 64,
            height: 64,
            borderRadius: 64,
            border: `3px solid ${GOLD}`,
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Anton',
            fontSize: 26,
            color: GOLD,
            background: 'rgba(0,0,0,0.25)',
          },
          badge,
        ),
        el('div', { fontFamily: 'Barlow', fontWeight: 700, fontSize: 30, letterSpacing: 4, marginLeft: 18 }, clubName),
      ),
      el(
        'div',
        { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' },
        el('div', { fontFamily: 'Barlow', fontWeight: 700, fontSize: 22, color: GOLD, letterSpacing: 2 }, 'SILVIANEWS'),
        el('div', { fontFamily: 'Barlow', fontWeight: 600, fontSize: 18, color: MUTED, marginTop: 2 }, formatDate(facts.data)),
      ),
    ),

    // Miolo
    el(
      'div',
      { display: 'flex', flexDirection: 'row', flex: 1, alignItems: 'center', marginTop: 24 },
      el(
        'div',
        { display: 'flex', flexDirection: 'column', flex: 1, paddingRight: craque ? 40 : 0 },
        el(
          'div',
          { fontFamily: 'Barlow', fontWeight: 700, fontSize: 20, letterSpacing: 6, color: GOLD, textTransform: 'uppercase' },
          'Resumo da Noite',
        ),
        el('div', { fontFamily: 'Anton', fontSize: titleSize, lineHeight: 1.02, textTransform: 'uppercase', marginTop: 10 }, title),
        el(
          'div',
          { display: 'flex', flexDirection: 'row', marginTop: 34, gap: 16 },
          statTile(String(t.jogos ?? 0), 'Jogos'),
          statTile(ved, 'V·E·D'),
          statTile(gols, 'Gols'),
          statTile(saldo, 'Saldo'),
        ),
      ),
      craque
        ? el(
            'div',
            { display: 'flex', flexDirection: 'column', alignItems: 'center', width: 300 },
            craqueAvatar(craquePhotoDataUri, craque.number, badge),
            el(
              'div',
              { fontFamily: 'Barlow', fontWeight: 700, fontSize: 18, letterSpacing: 4, color: GOLD, marginTop: 18, textTransform: 'uppercase' },
              'Craque da Noite',
            ),
            el(
              'div',
              { fontFamily: 'Anton', fontSize: 38, color: PAPER, marginTop: 6, textAlign: 'center', lineHeight: 1.05 },
              String(craque.jogador || '').toUpperCase(),
            ),
            el(
              'div',
              { fontFamily: 'Barlow', fontWeight: 600, fontSize: 20, color: MUTED, marginTop: 2 },
              `${craque.votos} ${craque.votos === 1 ? 'voto' : 'votos'}`,
            ),
          )
        : null,
    ),
  )
}

/**
 * Renderiza a capa da noite e devolve os bytes PNG (Uint8Array).
 * Lança em caso de falha — quem chama deve envolver em try/catch.
 */
export async function renderNightCoverPng({ club, facts, craquePhotoDataUri }) {
  const { ImageResponse } = await import('@vercel/og')
  const img = new ImageResponse(buildCard({ club, facts, craquePhotoDataUri }), {
    width: 1200,
    height: 675,
    fonts: loadFonts(),
  })
  return new Uint8Array(await img.arrayBuffer())
}
