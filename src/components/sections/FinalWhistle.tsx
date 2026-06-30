import { useClubData } from '../../lib/data/ClubDataContext'
import Badge from '../ui/Badge'

/**
 * SEÇÃO 7 — O APITO FINAL (encerramento épico + rodapé).
 * Foto do time com overlay pesado, escudo brilhando, lema eterno; esmaece
 * para o preto e revela o CTA vermelho. Rodapé com créditos + sociais.
 */
export default function FinalWhistle() {
  const { club } = useClubData()
  return (
    <section className="relative bg-[var(--color-ink)]">
      {/* Bloco épico */}
      <div className="relative flex h-screen flex-col items-center justify-center overflow-hidden text-center">
        <div className="team-photo absolute inset-0" aria-hidden />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(120% 90% at 50% 50%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.85) 60%, #000 100%)',
          }}
        />
        <div className="relative z-10 flex flex-col items-center">
          <Badge size={120} glow />
          <h2 className="mt-8 text-[clamp(2.5rem,7vw,6rem)] font-bold uppercase leading-[0.92]">
            {club.name}
          </h2>
          <p className="mt-6 max-w-lg text-lg italic text-[var(--text-70)]">
            “{club.eternalMotto}”
          </p>
        </div>
      </div>

      {/* Conversão — esmaece para preto e revela o desafio */}
      <div className="flex flex-col items-center justify-center bg-[var(--color-ink)] py-40 text-center">
        <span className="eyebrow mb-8">Acha que aguenta o jogo?</span>
        <button
          data-cursor="Sem medo"
          className="group relative overflow-hidden border border-[var(--color-alert)] px-14 py-6 text-lg font-bold uppercase tracking-[0.2em] text-white transition-colors duration-300"
          style={{ borderRadius: 'var(--radius-card)' }}
        >
          <span
            className="absolute inset-0 bg-[var(--color-alert)] transition-opacity duration-300 group-hover:opacity-90"
            aria-hidden
          />
          <span className="relative">Desafiar o Clube</span>
        </button>
      </div>

      {/* Rodapé */}
      <footer className="flex items-center justify-between border-t border-[var(--hairline)] px-[8vw] py-10">
        <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-50)]">
          Cobertura por SilviaNews · {club.name} © 2026
        </span>
      </footer>
    </section>
  )
}
