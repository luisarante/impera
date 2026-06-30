import { useEffect, useRef, useState } from 'react'
import { useClubData } from '../../lib/data/ClubDataContext'
import Badge from '../ui/Badge'

const BUY_MESSAGE = 'Entre no time para garantir a sua.'

/**
 * SEÇÃO 6 — LOJA OFICIAL (The Kit Room).
 * Vitrine estática: mostramos a foto frontal real do manto, sem animações
 * ambientes. O botão "Ver costas" vira o card para um painel de personalização
 * (nome + número escolhidos) — preview, não foto. Kits sem imagem caem num
 * placeholder estilizado com a cor do uniforme.
 */
export default function KitRoom() {
  const { kits } = useClubData()
  const [kitIndex, setKitIndex] = useState(0)
  const [playerName, setPlayerName] = useState('IMPERA')
  const [playerNumber, setPlayerNumber] = useState('10')
  const [showMsg, setShowMsg] = useState(false)
  const [flipped, setFlipped] = useState(false)
  const [imgFailed, setImgFailed] = useState<Record<string, boolean>>({})
  const msgTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const handleBuy = () => {
    setShowMsg(true)
    clearTimeout(msgTimer.current)
    msgTimer.current = setTimeout(() => setShowMsg(false), 3500)
  }

  useEffect(() => () => clearTimeout(msgTimer.current), [])

  const kit = kits[kitIndex]
  const hasPhoto = Boolean(kit.image) && !imgFailed[kit.id]
  const hasBackPhoto = Boolean(kit.imageBack) && !imgFailed[`${kit.id}-back`]

  return (
    <section className="relative min-h-screen bg-[var(--color-ink)] px-[8vw] py-32">
      <header className="mx-auto mb-12 max-w-6xl text-center">
        <span className="eyebrow">The Kit Room</span>
        <h2 className="mt-4 text-4xl uppercase">Vista o manto</h2>
      </header>

      <div className="mx-auto grid max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-10">
        {/* Esquerda — troca de kits */}
        <div className="flex flex-col gap-4">
          {kits.map((k, i) => (
            <button
              key={k.id}
              onClick={() => {
                setKitIndex(i)
                setFlipped(false)
              }}
              data-cursor={k.name}
              className={`border px-6 py-4 text-left text-sm uppercase tracking-[0.16em] transition-all duration-300 ${i === kitIndex
                ? 'border-[var(--color-accent)] text-white'
                : 'border-[var(--hairline)] text-[var(--text-50)] hover:text-white'
                }`}
              style={{ borderRadius: 'var(--radius-card)' }}
            >
              {k.label}
            </button>
          ))}
        </div>

        {/* Centro — camisa estática + flip */}
        <div className="flex flex-col items-center">
          <div className="kit-stage flex h-[600px] w-full select-none items-center justify-center">
            <div
              className="kit-shirt"
              style={{ transform: flipped ? 'rotateY(180deg)' : 'none' }}
            >
              {/* FRENTE — foto real ou placeholder estilizado */}
              {hasPhoto ? (
                <div className="kit-face">
                  <img
                    src={kit.image}
                    alt={kit.name}
                    draggable={false}
                    onError={() => setImgFailed((m) => ({ ...m, [kit.id]: true }))}
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : (
                <div
                  className="kit-face kit-face--panel flex items-start justify-center"
                  style={{
                    background: `linear-gradient(160deg, ${kit.primary} 0%, ${kit.secondary} 100%)`,
                  }}
                >
                  <div className="mt-10 opacity-90">
                    <Badge size={64} />
                  </div>
                </div>
              )}

              {/* COSTAS — foto real (se houver) + nome/número sobrepostos */}
              <div
                className={`kit-face flex flex-col items-center justify-center gap-3 ${hasBackPhoto ? '' : 'kit-face--panel'
                  }`}
                style={{
                  transform: 'rotateY(180deg)',
                  background: hasBackPhoto
                    ? undefined
                    : `linear-gradient(160deg, ${kit.secondary} 0%, ${kit.primary} 100%)`,
                }}
              >
                {hasBackPhoto && (
                  <img
                    src={kit.imageBack}
                    alt={`${kit.name} — costas`}
                    draggable={false}
                    onError={() => setImgFailed((m) => ({ ...m, [`${kit.id}-back`]: true }))}
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                )}
                <span className="relative -top-13 text-2xl font-semibold uppercase tracking-[0.05em] text-red-600">
                  {playerName || 'JOGADOR'}
                </span>
                <span className="relative -top-7 text-9xl font-bold leading-none text-red-600">
                  {playerNumber || '0'}
                </span>
              </div>
            </div>
          </div>

          {/* Alterna frente / costas */}
          <button
            onClick={() => setFlipped((f) => !f)}
            data-cursor={flipped ? 'Frente' : 'Costas'}
            className="border border-[var(--hairline)] px-6 py-2 text-xs uppercase tracking-[0.18em] text-[var(--text-70)] transition-colors duration-300 hover:border-[var(--color-accent)] hover:text-white"
            style={{ borderRadius: 'var(--radius-card)' }}
          >
            {flipped ? '← Ver frente' : 'Ver costas →'}
          </button>
        </div>

        {/* Direita — compra */}
        <div className="w-[300px]">
          <h3 className="text-2xl">{kit.name}</h3>
          <p className="mt-3 text-sm leading-relaxed text-[var(--text-50)]">{kit.description}</p>

          <p className="mt-7 text-4xl font-bold" style={{ color: 'var(--color-gold)' }}>
            {kit.price}
          </p>

          <div className="mt-7 space-y-4">
            <label className="block">
              <span className="eyebrow mb-2 block">Nome nas costas</span>
              <input
                value={playerName}
                maxLength={12}
                onChange={(e) => setPlayerName(e.target.value.toUpperCase())}
                onFocus={() => setFlipped(true)}
                className="w-full border border-[var(--hairline)] bg-transparent px-4 py-3 text-sm uppercase tracking-[0.1em] text-white outline-none focus:border-[var(--color-accent)]"
                style={{ borderRadius: 'var(--radius-card)' }}
              />
            </label>
            <label className="block">
              <span className="eyebrow mb-2 block">Número</span>
              <input
                value={playerNumber}
                maxLength={2}
                inputMode="numeric"
                onChange={(e) => setPlayerNumber(e.target.value.replace(/\D/g, ''))}
                onFocus={() => setFlipped(true)}
                className="w-24 border border-[var(--hairline)] bg-transparent px-4 py-3 text-sm text-white outline-none focus:border-[var(--color-accent)]"
                style={{ borderRadius: 'var(--radius-card)' }}
              />
            </label>
          </div>

          {/* Wrapper relativo: a mensagem é absoluta e não empurra o layout. */}
          <div className="relative mt-8">
            <span
              aria-live="polite"
              className={`pointer-events-none absolute bottom-full left-0 right-0 mb-1 text-center text-sm font-medium text-[var(--color-gold)] transition-all duration-300 ${showMsg ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
                }`}
            >
              {BUY_MESSAGE}
            </span>
            <button
              onClick={handleBuy}
              data-cursor="Bora?"
              className="w-full bg-[var(--color-accent)] py-4 text-sm font-semibold uppercase tracking-[0.18em] text-black transition-opacity hover:opacity-90"
              style={{ borderRadius: 'var(--radius-card)' }}
            >
              Comprar Agora
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
