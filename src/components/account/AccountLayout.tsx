import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Badge from '../ui/Badge'

/**
 * Moldura das telas de conta (entrar / cadastro / perfil): fundo ink, brasão e
 * um cartão central — no visual do site, separado do painel admin.
 */
export default function AccountLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-ink)] px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Link to="/" aria-label="Início">
            <Badge size={64} glow />
          </Link>
          <h1 className="text-lg font-semibold uppercase tracking-[0.18em]">{title}</h1>
          {subtitle && <p className="text-xs text-[var(--text-50)]">{subtitle}</p>}
        </div>

        <div className="rounded-xl border border-[var(--hairline)] bg-white/[0.02] p-8">
          {children}
        </div>

        {footer && (
          <p className="mt-6 text-center text-sm text-[var(--text-50)]">{footer}</p>
        )}
      </div>
    </div>
  )
}
