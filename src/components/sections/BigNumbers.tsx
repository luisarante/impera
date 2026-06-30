import { useClubData } from '../../lib/data/ClubDataContext'
import Counter from '../ui/Counter'

/**
 * SEÇÃO 2 — O CARTÃO DE VISITAS.
 * Fundo preto sólido, muito respiro, três colunas com números gigantes.
 * Os numéricos sobem de 0 ao valor (~1s) ao entrar na view.
 */
export default function BigNumbers() {
  const { bigNumbers } = useClubData()
  return (
    <section className="relative flex min-h-screen items-center bg-[var(--color-ink)] px-[8vw] py-40">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-3 gap-x-[6vw]">
        {bigNumbers.map((n, i) => (
          <div
            key={i}
            className={`flex flex-col items-center text-center ${
              i === 1 ? 'border-x border-[var(--hairline)] px-6' : ''
            }`}
          >
            <span
              className="text-[clamp(3.5rem,8vw,8rem)] font-bold leading-none tracking-[-0.04em]"
              style={{ color: n.highlight === 'gold' ? 'var(--color-gold)' : 'var(--color-paper)' }}
            >
              {n.numeric ? <Counter to={n.numeric} prefix={n.prefix} /> : n.value}
            </span>
            <span className="mt-6 max-w-[18ch] text-xs uppercase tracking-[0.26em] text-[var(--text-50)]">
              {n.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
