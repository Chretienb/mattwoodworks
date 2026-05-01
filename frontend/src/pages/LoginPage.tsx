import { type FormEvent, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { SiteFooter } from '../components/site/SiteFooter'
import { SiteHeader } from '../components/site/SiteHeader'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const { signIn, token, hydrated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from =
    (location.state as { from?: string } | null)?.from?.startsWith('/admin') === true
      ? (location.state as { from: string }).from
      : '/admin'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (hydrated && token) {
    return <Navigate to={from} replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signIn(email.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rh-public">
      <SiteHeader />
      <div className="rh-staff-body rh-staff-body--textured">
        <div className="rh-page-main">
          <div className="rh-panel rh-panel-stack">
            <div className="rh-panel-stack tight">
              <p className="eyebrow">Staff</p>
              <h1 className="title-lg">Sign in</h1>
              <p className="muted small">
                API credentials only. Run{' '}
                <code className="inline-code">npm run dev:api</code> in this
                project so <code className="inline-code">/api</code> proxies to{' '}
                <code className="inline-code">127.0.0.1:8080</code>. Dev sign-in:{' '}
                <code className="inline-code">admin@mattwoodworks.local</code> /{' '}
                <code className="inline-code">devpassword</code>. After sign-in,
                use <strong>Site &amp; copy</strong> and <strong>Portfolio</strong>{' '}
                to change homepage text and images (saved to{' '}
                <code className="inline-code">site-content.json</code>).
              </p>
            </div>

            <form className="rh-panel-stack" onSubmit={onSubmit}>
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span>Password</span>
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </label>

              {error ? (
                <p className="error" role="alert">
                  {error}
                </p>
              ) : null}

              <button className="btn" type="submit" disabled={submitting}>
                {submitting ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <p className="small muted">
              <Link to="/">← Back to site</Link>
            </p>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  )
}
