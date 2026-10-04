import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCountdown, OVERWATCH_LAUNCH } from '../lib/countdown'

export default function OverwatchPage() {
  const [remaining, setRemaining] = useState(() => getCountdown(Date.now()))

  useEffect(() => {
    window.scrollTo(0, 0)
    const update = () => setRemaining(getCountdown(Date.now()))
    const interval = window.setInterval(update, 1000)
    document.addEventListener('visibilitychange', update)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', update)
    }
  }, [])

  return (
    <main className="overwatch-page">
      <Link to="/" className="overwatch-back">← Voltar ao início</Link>
      <div className="overwatch-orbit" aria-hidden="true" />
      <div className="overwatch-content">
        <span className="portal-eyebrow">IMPERA / @imperaow</span>
        <h1>OVERWATCH</h1>
        <p className="overwatch-subtitle">A próxima missão começa em</p>
        <div className="countdown" role="timer" aria-label="Contagem regressiva para Overwatch">
          {([
            ['days', 'Dias'], ['hours', 'Horas'], ['minutes', 'Minutos'], ['seconds', 'Segundos'],
          ] as const).map(([key, label]) => (
            <div className="countdown__unit" key={key}><strong>{String(remaining[key]).padStart(2, '0')}</strong><span>{label}</span></div>
          ))}
        </div>
        <p className="overwatch-date"><time dateTime={OVERWATCH_LAUNCH}>11 de outubro de 2026 · 00:00</time><span>Horário de Brasília (UTC−3)</span></p>
        <p className="overwatch-status" role="status">{remaining.complete ? 'A contagem chegou ao fim. Fique de olho nas novidades do Impera.' : 'Um novo capítulo. O mesma Impera.'}</p>
      </div>
    </main>
  )
}
