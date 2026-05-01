import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function RequireAdmin() {
  const { token, hydrated } = useAuth()
  const location = useLocation()

  if (!hydrated) {
    return (
      <div className="page-fill center muted" aria-busy="true">
        Loading…
      </div>
    )
  }

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
