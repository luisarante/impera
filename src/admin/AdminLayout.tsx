import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from './auth'
import Badge from '../components/ui/Badge'

const NAV = [
  { to: '/admin', label: 'Visão geral', end: true },
  { to: '/admin/elenco', label: 'Elenco' },
  { to: '/admin/galeria', label: 'Galeria' },
  { to: '/admin/noticias', label: 'Notícias' },
  { to: '/admin/kits', label: 'Kits' },
  { to: '/admin/marcos', label: 'Marcos' },
  { to: '/admin/numeros', label: 'Números' },
  { to: '/admin/clube', label: 'Clube' },
]

/** Casca do painel admin: navegação lateral + área de conteúdo (Outlet). */
export default function AdminLayout() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="admin-shell flex min-h-screen bg-[var(--color-ink)] text-white">
      <aside className="flex w-60 shrink-0 flex-col border-r border-[var(--hairline)] p-6">
        <div className="mb-8 flex items-center gap-3">
          <Badge size={40} />
          <div className="leading-tight">
            <p className="text-sm font-semibold uppercase tracking-[0.12em]">Admin</p>
            <p className="text-[0.65rem] text-[var(--text-50)]">Imperatrice FC</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
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

      <main className="flex-1 overflow-y-auto p-10">
        <Outlet />
      </main>
    </div>
  )
}
