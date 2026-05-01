import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAdmin } from './routes/RequireAdmin'
import { AdminDashboard } from './pages/AdminDashboard'
import { AdminLayout } from './pages/AdminLayout'
import { AdminPortfolioPage } from './pages/AdminPortfolioPage'
import { AdminSitePage } from './pages/AdminSitePage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/screen" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAdmin />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="site" element={<AdminSitePage />} />
          <Route path="portfolio" element={<AdminPortfolioPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
