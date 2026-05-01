import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/site', label: 'Site & copy', end: false },
  { to: '/admin/portfolio', label: 'Portfolio', end: false },
] as const

export function AdminLayout() {
  const { signOut, user } = useAuth()

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <NavLink to="/admin" className="brand" end>
          Admin
        </NavLink>
        <div className="admin-header-actions">
          {user?.email ? <span className="muted small">{user.email}</span> : null}
          <button type="button" className="btn ghost small" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>
      <div className="admin-body">
        <aside className="admin-sidebar" aria-label="Admin sections">
          <nav className="admin-side-nav">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `admin-side-link${isActive ? ' is-active' : ''}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
