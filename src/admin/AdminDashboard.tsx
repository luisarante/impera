import { Link } from 'react-router-dom'
import { PageHeader } from './ui'

const SHORTCUTS = [
  { to: '/admin/elenco', title: 'Elenco', desc: 'Adicionar, editar e remover jogadores e suas fotos.' },
  { to: '/admin/galeria', title: 'Galeria', desc: 'Subir e organizar as fotos da galeria do clube.' },
  { to: '/admin/noticias', title: 'Notícias', desc: 'Publicar e editar matérias da SilviaNews.' },
  { to: '/admin/kits', title: 'Kits', desc: 'Uniformes, preços e imagens (frente/costas).' },
  { to: '/admin/marcos', title: 'Marcos', desc: 'A linha do tempo da história do clube.' },
  { to: '/admin/numeros', title: 'Números', desc: 'Os grandes números exibidos na home.' },
  { to: '/admin/clube', title: 'Clube', desc: 'Nome, tagline e lema do clube.' },
]

/** Visão geral do painel: atalhos para cada área de conteúdo. */
export default function AdminDashboard() {
  return (
    <div>
      <PageHeader title="Visão geral" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SHORTCUTS.map((s) => (
          <Link
            key={s.to}
            to={s.to}
            className="rounded-lg border border-[var(--hairline)] bg-white/[0.02] p-5 transition-colors hover:border-[var(--color-accent)]"
          >
            <h3 className="text-lg font-semibold uppercase tracking-[0.04em]">{s.title}</h3>
            <p className="mt-2 text-sm text-[var(--text-50)]">{s.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
