import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/index.css'
import App from './App.tsx'
import { ClubDataProvider } from './lib/data/ClubDataContext'

// A restauração de scroll é feita pela app (ver useHomeScroll); desligamos a do
// navegador para não brigar com ela em back/forward.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ClubDataProvider>
        <App />
      </ClubDataProvider>
    </BrowserRouter>
  </StrictMode>,
)
