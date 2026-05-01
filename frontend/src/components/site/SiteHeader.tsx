import { Link } from 'react-router-dom'

const links = [
  { label: 'About', href: '#about' },
  { label: 'Work', href: '#portfolio' },
  { label: 'Services', href: '#services' },
  { label: 'Process', href: '#process' },
] as const

export function SiteHeader() {
  return (
    <header className="mhw-lx2-header">
      <nav className="mhw-lx2-nav" aria-label="Primary">
        <Link to="/" className="mhw-lx2-n-logo">
          <span className="mhw-lx2-n-logo-mark">
            <img
              className="mhw-lx2-n-logo-img"
              src="/images/mhw-logo-mark.png"
              alt=""
              width={1024}
              height={585}
              decoding="async"
              aria-hidden="true"
            />
          </span>
          <span className="mhw-lx2-n-wordmark">
            <span className="mhw-lx2-n-wordmark-name">Matthew Harder</span>
            <span className="mhw-lx2-n-wordmark-sub">Custom Woodworks</span>
          </span>
        </Link>
        <ul className="mhw-lx2-n-links">
          {links.map((item) => (
            <li key={item.href}>
              <a href={item.href}>{item.label}</a>
            </li>
          ))}
        </ul>
        <div className="mhw-lx2-nav-actions">
          <Link to="/login" className="mhw-lx2-n-account">
            Account
          </Link>
          <a href="#contact" className="mhw-lx2-n-cta">
            Free estimate
          </a>
        </div>
      </nav>
    </header>
  )
}
