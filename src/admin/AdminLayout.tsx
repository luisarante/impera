import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from './auth'
import { AdminFeedbackProvider } from './feedback'
import Badge from '../components/ui/Badge'

const NAV = [
  { to: '/admin', label: 'Visão geral', end: true },
  { to: '/admin/elenco', label: 'Elenco' },
  { to: '/admin/jogos', label: 'Noites de jogo' },
  { to: '/admin/galeria', label: 'Galeria' },
  { to: '/admin/noticias', label: 'Notícias' },
  { to: '/admin/kits', label: 'Kits' },
  { to: '/admin/marcos', label: 'Marcos' },
  { to: '/admin/numeros', label: 'Números' },
  { to: '/admin/clube', label: 'Clube' },
]

/**
 * Casca do painel admin: navegação lateral + área de conteúdo (Outlet).
 * No desktop (≥lg) a barra lateral é fixa ao lado do conteúdo. No mobile/tablet
 * ela vira um menu deslizante (drawer) acionado pela barra de topo.
 */
export default function AdminLayout() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    await signOut()
    navigate('/admin/login', { replace: true })
  }

  return (
    <AdminFeedbackProvider>
      <div className="admin-shell flex min-h-screen bg-[var(--color-ink)] text-white">
        {/* Barra de topo — só no mobile/tablet */}
        <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-[var(--hairline)] bg-[var(--color-ink)]/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center gap-2">
            <Badge size={28} />
            <span className="text-sm font-semibold uppercase tracking-[0.12em]">Admin</span>
          </div>
          <button
            type="button"
            aria-label="Abrir menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="flex h-10 w-10 flex-col items-center justify-center gap-[5px] rounded-md border border-[var(--hairline)]"
          >
            <span className="h-[1.5px] w-5 bg-white" />
            <span className="h-[1.5px] w-5 bg-white" />
            <span className="h-[1.5px] w-5 bg-white" />
          </button>
        </header>

        {/* Fundo escuro do drawer (mobile) */}
        {open && (
          <div
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            aria-hidden
            onClick={() => setOpen(false)}
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col overflow-y-auto border-r border-[var(--hairline)] bg-[var(--color-ink)] p-6 transition-transform duration-300 lg:static lg:z-auto lg:w-60 lg:translate-x-0 ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="mb-8 flex items-center gap-3">
            <Badge size={40} />
            <div className="leading-tight">
              <p className="text-sm font-semibold uppercase tracking-[0.12em]">Admin</p>
              <p className="text-[0.65rem] text-[var(--text-50)]">Imperatrice FC</p>
            </div>
            {/* Fechar — só no mobile */}
            <button
              type="button"
              aria-label="Fechar menu"
              onClick={() => setOpen(false)}
              className="ml-auto flex h-8 w-8 items-center justify-center rounded-md border border-[var(--hairline)] text-[var(--text-50)] transition-colors hover:text-white lg:hidden"
            >
              ✕
            </button>
          </div>

          <nav className="flex flex-1 flex-col gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-[var(--color-accent)]/15 text-white'
                      : 'text-[var(--text-50)] hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-6 flex flex-col gap-2 border-t border-[var(--hairline)] pt-4">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="rounded-md px-3 py-2 text-sm text-[var(--text-50)] transition-colors hover:text-white"
            >
              Ver site ↗
            </a>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md px-3 py-2 text-left text-sm text-[var(--text-50)] transition-colors hover:text-[var(--color-alert)]"
            >
              Sair
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-4 pt-[4.75rem] sm:p-6 sm:pt-[4.75rem] lg:p-10">
          <Outlet />
        </main>
      </div>
    </AdminFeedbackProvider>
  )
}
