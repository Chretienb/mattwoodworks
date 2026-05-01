import { type FormEvent, useEffect, useRef, useState } from 'react'
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

  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Some browsers wipe the DOM value when input type changes.
  // Restore it from React state after every toggle.
  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== password) {
      inputRef.current.value = password
    }
  }, [showPassword, password])

  if (hydrated && token) {
    return <Navigate to={from} replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signIn(password)
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
                Staff access only.
              </p>
            </div>

            <form className="rh-panel-stack" onSubmit={onSubmit}>
              <label className="field">
                <span>Password</span>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    ref={inputRef}
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="off"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ paddingRight: '2.5rem', width: '100%' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: '0.6rem',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      color: 'inherit',
                      opacity: 0.6,
                      lineHeight: 1,
                    }}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
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
