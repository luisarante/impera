import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/index.css'
import App from './App.tsx'
import { ClubDataProvider } from './lib/data/ClubDataContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ClubDataProvider>
        <App />
      </ClubDataProvider>
    </BrowserRouter>
  </StrictMode>,
)
