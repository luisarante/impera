import type { EaClubStatsSnapshot } from '../../lib/ea'

const WIDTH = 600
const HEIGHT = 160
const PAD_X = 8
const PAD_Y = 16

/**
 * Linha de evolução do Skill Rating ao longo das sincronizações. SVG simples
 * (sem lib de gráfico — poucos pontos, não vale a pena a dependência extra).
 */
export default function SkillRatingChart({ history }: { history: EaClubStatsSnapshot[] }) {
  const points = history.filter((h) => h.skillRating != null) as (EaClubStatsSnapshot & { skillRating: number })[]
  if (points.length < 2) return null

  const values = points.map((p) => p.skillRating)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const coords = points.map((p, i) => {
    const x = PAD_X + (i / (points.length - 1)) * (WIDTH - PAD_X * 2)
    const y = PAD_Y + (1 - (p.skillRating - min) / range) * (HEIGHT - PAD_Y * 2)
    return { x, y, p }
  })
  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')
  const last = coords[coords.length - 1]

  return (
    <div className="mt-4">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Evolução do skill rating">
        <path d={path} fill="none" stroke="var(--color-gold)" strokeWidth={2} />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={i === coords.length - 1 ? 4 : 2.5} fill="var(--color-gold)" />
        ))}
        <text x={last.x} y={last.y - 10} textAnchor="end" fontSize={13} fontWeight={700} fill="var(--color-gold)">
          {last.p.skillRating}
        </text>
      </svg>
      <div className="mt-1 flex justify-between text-[0.65rem] uppercase tracking-[0.1em] text-[var(--text-50)]">
        <span>{new Date(points[0].recordedAt).toLocaleDateString('pt-BR')}</span>
        <span>{new Date(last.p.recordedAt).toLocaleDateString('pt-BR')}</span>
      </div>
    </div>
  )
}
