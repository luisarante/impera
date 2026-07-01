import { Routes, Route } from 'react-router-dom'
import { lazy, Suspense, type ReactNode } from 'react'
import ClubDataGate from './components/ClubDataGate'
import Home from './components/Home'
import SquadPage from './components/squad/SquadPage'
import PlayerPage from './components/squad/PlayerPage'
import GalleryPage from './components/gallery/GalleryPage'
import NewsPage from './components/news/NewsPage'
import NewsArticlePage from './components/news/NewsArticlePage'
import GamesPage from './components/games/GamesPage'
import { AuthProvider } from './admin/auth'
import RequireAuth from './admin/RequireAuth'

// Admin carregado sob demanda (code-splitting) — mantém o bundle público leve,
// já que o editor rich text (TipTap) só é necessário no painel.
const AdminLogin = lazy(() => import('./admin/AdminLogin'))
const AdminLayout = lazy(() => import('./admin/AdminLayout'))
const AdminDashboard = lazy(() => import('./admin/AdminDashboard'))
const AdminPlayers = lazy(() => import('./admin/AdminPlayers'))
const AdminGallery = lazy(() => import('./admin/AdminGallery'))
const AdminNews = lazy(() => import('./admin/AdminNews'))
const AdminKits = lazy(() => import('./admin/AdminKits'))
const AdminMilestones = lazy(() => import('./admin/AdminMilestones'))
const AdminBigNumbers = lazy(() => import('./admin/AdminBigNumbers'))
const AdminClub = lazy(() => import('./admin/AdminClub'))
const AdminGames = lazy(() => import('./admin/AdminGames'))

/** Páginas públicas: gate que aguarda o conteúdo do banco. */
function Public({ children }: { children: ReactNode }) {
  return <ClubDataGate>{children}</ClubDataGate>
}

const adminFallback = (
  <div className="flex min-h-screen items-center justify-center bg-[var(--color-ink)] text-sm uppercase tracking-[0.3em] text-[var(--text-50)]">
    Carregando…
  </div>
)

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={adminFallback}>
        <Routes>
          {/* Site público */}
          <Route path="/" element={<Public><Home /></Public>} />
          <Route path="/elenco" element={<Public><SquadPage /></Public>} />
          <Route path="/elenco/:id" element={<Public><PlayerPage /></Public>} />
          <Route path="/galeria" element={<Public><GalleryPage /></Public>} />
          <Route path="/noticias" element={<Public><NewsPage /></Public>} />
          <Route path="/noticias/:id" element={<Public><NewsArticlePage /></Public>} />
          <Route path="/jogos" element={<Public><GamesPage /></Public>} />
          <Route path="/jogos/:id" element={<Public><GamesPage /></Public>} />

          {/* Painel admin */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <AdminLayout />
              </RequireAuth>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="elenco" element={<AdminPlayers />} />
            <Route path="jogos" element={<AdminGames />} />
            <Route path="galeria" element={<AdminGallery />} />
            <Route path="noticias" element={<AdminNews />} />
            <Route path="kits" element={<AdminKits />} />
            <Route path="marcos" element={<AdminMilestones />} />
            <Route path="numeros" element={<AdminBigNumbers />} />
            <Route path="clube" element={<AdminClub />} />
          </Route>
        </Routes>
      </Suspense>
    </AuthProvider>
  )
}
