import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './mhw-lux-v2.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import { SiteContentProvider } from './context/SiteContentContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SiteContentProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </SiteContentProvider>
    </BrowserRouter>
  </StrictMode>,
)
