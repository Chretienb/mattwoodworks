import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiBase } from '../api/base'

export function AdminDashboard() {
  const { user } = useAuth()
  const [health, setHealth] = useState<'idle' | 'ok' | 'error'>('idle')

  useEffect(() => {
    let cancelled = false
    fetch(`${apiBase()}/health`)
      .then((r) => {
        if (!cancelled) setHealth(r.ok ? 'ok' : 'error')
      })
      .catch(() => {
        if (!cancelled) setHealth('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="stack gap-lg">
      <div className="stack tight">
        <h1 className="title-lg">Dashboard</h1>
        <p className="muted">
          Signed in as <strong className="text-strong">{user?.email}</strong>{' '}
          ({user?.role})
        </p>
      </div>

      <div className="grid-cards">
        <section className="card pad">
          <h2 className="title-md">API health</h2>
          <p className="muted small stack tight">
            {health === 'idle' ? (
              'Checking…'
            ) : health === 'ok' ? (
              <span className="text-strong">Backend reachable at /health.</span>
            ) : (
              <>
                <span>Cannot reach the API. In dev, run </span>
                <code className="inline-code">npm run dev:api</code>
                <span> alongside </span>
                <code className="inline-code">npm run dev</code>
                <span>.</span>
              </>
            )}
          </p>
        </section>
        <section className="card pad">
          <h2 className="title-md">Website editor</h2>
          <p className="muted small">
            With the dev API running, edits save to{' '}
            <code className="inline-code">site-content.json</code> and the public
            homepage loads them automatically. Upload images to{' '}
            <code className="inline-code">/images/uploads/</code> from Site &amp;
            Portfolio.
          </p>
        </section>
        <section className="card pad">
          <h2 className="title-md">Shortcuts</h2>
          <ul className="muted small list">
            <li>
              <Link to="/admin/site">Site &amp; copy (text + photos)</Link>
            </li>
            <li>
              <Link to="/admin/portfolio">Portfolio</Link>
            </li>
            <li>
              <a href="/" target="_blank" rel="noreferrer">
                Open public site
              </a>
            </li>
          </ul>
        </section>
      </div>
    </div>
  )
}
