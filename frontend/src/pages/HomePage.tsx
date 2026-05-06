import { useEffect, useState, type FormEvent } from 'react'
import { submitEstimateRequest } from '../api/estimates'
import { SiteFooter } from '../components/site/SiteFooter'
import { SiteHeader } from '../components/site/SiteHeader'
import { useSiteContent } from '../context/SiteContentContext'

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

export function HomePage() {
  const { content } = useSiteContent()
  const reduceMotion = usePrefersReducedMotion()
  const [enquiryStatus, setEnquiryStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [enquiryDetail, setEnquiryDetail] = useState<string | null>(null)

  const portfolio = content.portfolio
  const featured = portfolio.slice(0, 6)
  const restPieces = portfolio.slice(6)
  const portfolioMorePieces = reduceMotion ? restPieces : [...restPieces, ...restPieces]

  async function submitEnquiry(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    const email = String(fd.get('email') ?? '').trim()
    if (!email) return

    setEnquiryStatus('sending')
    setEnquiryDetail(null)
    try {
      await submitEstimateRequest({
        first_name: String(fd.get('firstName') ?? '').trim() || undefined,
        last_name: String(fd.get('lastName') ?? '').trim() || undefined,
        email,
        phone: String(fd.get('phone') ?? '').trim() || undefined,
        project_type: String(fd.get('project') ?? '').trim() || undefined,
        message: String(fd.get('message') ?? '').trim() || undefined,
      })
      setEnquiryStatus('sent')
      setEnquiryDetail(
        'Thanks — your enquiry was sent. We will get back to you soon.',
      )
      form.reset()
    } catch (err) {
      setEnquiryStatus('error')
      setEnquiryDetail(
        err instanceof Error
          ? err.message
          : 'Could not reach the server. Try email or check that the API is running.',
      )
    }
  }

  function onEnquiryFormChange() {
    if (enquiryStatus === 'sent' || enquiryStatus === 'error') {
      setEnquiryStatus('idle')
      setEnquiryDetail(null)
    }
  }

  const { hero, ticker, about, servicesHead, services, inspiration, portfolioHead, quote, processHead, process, contact } =
    content

  return (
    <div className="rh-public mhw-lx2">
      <SiteHeader />

      <main>
        <section className="mhw-lx2-hero" aria-label="Introduction">
          <div className="mhw-lx2-hero-l">
            <div className="mhw-lx2-h-kicker">
              <span className="mhw-lx2-h-kicker-line" aria-hidden="true" />
              <span className="mhw-lx2-h-kicker-text">{hero.kicker}</span>
            </div>
            <h1 className="mhw-lx2-h-title">
              {hero.titleLineBefore}
              <em>{hero.titleEm}</em>
              {hero.titleLineAfter}
            </h1>
            <p className="mhw-lx2-h-body">{hero.body}</p>
            <div className="mhw-lx2-h-actions">
              <a className="hero-btn-primary" href="#contact">
                Commission a piece
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
              <a className="hero-btn-secondary" href="#portfolio">
                View portfolio
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            </div>
            <div className="mhw-lx2-h-meta">
              {hero.stats.map((s) => (
                <div key={`${s.value}-${s.label}`}>
                  <div className="mhw-lx2-h-stat-n">{s.value}</div>
                  <div className="mhw-lx2-h-stat-l">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="mhw-lx2-hero-r">
            <img
              src={hero.image.src}
              srcSet={hero.image.srcSet || undefined}
              alt={hero.image.alt}
              width={hero.image.width ?? 1536}
              height={hero.image.height ?? 2048}
              decoding="async"
              fetchPriority="high"
              sizes="(min-width: 961px) 50vw, 100vw"
            />
            <div className="mhw-lx2-hero-r-tag">
              <p className="mhw-lx2-hero-r-tag-print">{hero.tagPrint}</p>
            </div>
          </div>
        </section>

        <div className="mhw-lx2-ticker" aria-hidden="true">
          <div className="mhw-lx2-ticker-inner">
            {ticker.map((w) => (
              <span key={`a-${w}`} className="mhw-lx2-ticker-item">
                <span className="mhw-lx2-ticker-word">{w}</span>
                <span className="mhw-lx2-ticker-dot" />
              </span>
            ))}
            {ticker.map((w) => (
              <span key={`b-${w}`} className="mhw-lx2-ticker-item">
                <span className="mhw-lx2-ticker-word">{w}</span>
                <span className="mhw-lx2-ticker-dot" />
              </span>
            ))}
          </div>
        </div>

        <section id="about" className="mhw-lx2-about" aria-label="About">
          <div className="mhw-lx2-about-media">
            <div className="mhw-lx2-about-media-hero">
              <img
                src={about.images.craftsman.src}
                alt={about.images.craftsman.alt}
                width={about.images.craftsman.width ?? 864}
                height={about.images.craftsman.height ?? 808}
                loading="lazy"
                decoding="async"
              />
              <div className="mhw-lx2-about-media-caption">
                <p>{about.mediaCaption}</p>
              </div>
            </div>
            <div className="mhw-lx2-about-media-guitars">
              <img
                src={about.images.guitarHead.src}
                alt={about.images.guitarHead.alt}
                width={about.images.guitarHead.width ?? 768}
                height={about.images.guitarHead.height ?? 1024}
                loading="lazy"
                decoding="async"
              />
              <img
                src={about.images.guitarBody.src}
                alt={about.images.guitarBody.alt}
                width={about.images.guitarBody.width ?? 768}
                height={about.images.guitarBody.height ?? 1024}
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
          <div className="mhw-lx2-about-content">
            <div className="mhw-lx2-s-eyebrow">
              <span className="mhw-lx2-s-eyebrow-line" aria-hidden="true" />
              <span className="mhw-lx2-s-eyebrow-text">{about.eyebrow}</span>
            </div>
            <h2 className="mhw-lx2-s-title" style={{ marginBottom: '2rem' }}>
              {about.nameLine1}
              <br />
              {about.nameLine2}
            </h2>
            {about.paragraphs.map((p, i) => (
              <p key={i} className="mhw-lx2-about-body">
                {p}
              </p>
            ))}
            <div className="mhw-lx2-about-divider" />
            <div className="mhw-lx2-about-stats">
              {about.stats.map((s) => (
                <div key={`${s.value}-${s.label}`}>
                  <div className="mhw-lx2-about-stat-n">{s.value}</div>
                  <div className="mhw-lx2-about-stat-l">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="services" className="mhw-lx2-services mhw-lx2-section" aria-label="Services">
          <div className="mhw-lx2-services-head">
            <div>
              <div className="mhw-lx2-s-eyebrow">
                <span className="mhw-lx2-s-eyebrow-line" aria-hidden="true" />
                <span className="mhw-lx2-s-eyebrow-text">{servicesHead.eyebrow}</span>
              </div>
              <h2 className="mhw-lx2-s-title">{servicesHead.title}</h2>
            </div>
            <a className="mhw-lx2-btn-ghost" href="#contact">
              {servicesHead.ctaLabel}
            </a>
          </div>
          <div className="mhw-lx2-services-grid">
            {services.map((s) => (
              <div key={s.n} className="mhw-lx2-svc">
                <div className="mhw-lx2-svc-n">{s.n}</div>
                <h3 className="mhw-lx2-svc-title">{s.title}</h3>
                <p className="mhw-lx2-svc-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {inspiration.enabled ? (
          <section className="mhw-lx2-inspiration" aria-label="Material and palette inspiration">
            <div className="mhw-lx2-inspiration-inner">
              <img
                src={inspiration.src}
                alt={inspiration.alt}
                width={1600}
                height={900}
                loading="lazy"
                decoding="async"
              />
            </div>
          </section>
        ) : null}

        <section id="portfolio" className="mhw-lx2-portfolio" aria-label="Portfolio">
          <div className="mhw-lx2-portfolio-head">
            <div className="mhw-lx2-s-eyebrow">
              <span className="mhw-lx2-s-eyebrow-line" aria-hidden="true" />
              <span className="mhw-lx2-s-eyebrow-text">{portfolioHead.eyebrow}</span>
            </div>
            <h2 className="mhw-lx2-s-title">{portfolioHead.title}</h2>
          </div>
          <div className="mhw-lx2-port-grid">
            {featured.map((piece, i) => {
              const cap = {
                label: piece.captionLabel ?? 'Commission',
                sub: piece.captionSub ?? 'Matthew Harder',
              }
              const piClass = `mhw-lx2-pi mhw-lx2-pi-border mhw-lx2-pi-${i + 1}`
              return (
                <article key={`${piece.src}-${i}`} className={piClass}>
                  <img
                    src={piece.src}
                    alt={piece.alt}
                    width={800}
                    height={1000}
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="mhw-lx2-pi-info">
                    <div className="mhw-lx2-pi-label">{cap.label}</div>
                    <div className="mhw-lx2-pi-sub">{cap.sub}</div>
                  </div>
                </article>
              )
            })}
          </div>
          {restPieces.length > 0 && (
            <div
              className="mhw-lx2-portfolio-more"
              aria-label="More selected work"
              role="region"
            >
              <div className="mhw-lx2-pm-track">
                {portfolioMorePieces.map((piece, i) => (
                  <div key={`${piece.src}-${i}`} className="mhw-lx2-pm-cell">
                    <img
                      src={piece.src}
                      alt={piece.alt}
                      width={800}
                      height={1000}
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <div className="mhw-lx2-quote-section">
          <svg
            className="mhw-lx2-quote-mark-svg"
            width={48}
            height={36}
            viewBox="0 0 48 36"
            aria-hidden="true"
          >
            <path d="M0 36V22.5C0 9 8.5 2 25.5 0L28 4C19.667 5.667 15 10.167 14 17.5H20V36H0ZM28 36V22.5C28 9 36.5 2 53.5 0L56 4C47.667 5.667 43 10.167 42 17.5H48V36H28Z" />
          </svg>
          <p className="mhw-lx2-quote-text">&ldquo;{quote.text}&rdquo;</p>
          <div className="mhw-lx2-quote-author">{quote.attribution}</div>
        </div>

        <section id="process" className="mhw-lx2-process mhw-lx2-section" aria-label="Process">
          <div className="mhw-lx2-s-eyebrow">
            <span className="mhw-lx2-s-eyebrow-line" aria-hidden="true" />
            <span className="mhw-lx2-s-eyebrow-text">{processHead.eyebrow}</span>
          </div>
          <h2 className="mhw-lx2-s-title" style={{ marginBottom: 0 }}>
            {processHead.title}
          </h2>
          <div className="mhw-lx2-process-grid">
            {process.map((step, i) => (
              <div key={step.title} className="mhw-lx2-proc">
                <div className="mhw-lx2-proc-num">{String(i + 1).padStart(2, '0')}</div>
                <div className="mhw-lx2-proc-title">{step.title}</div>
                <p className="mhw-lx2-proc-desc">{step.desc}</p>
                <div className="mhw-lx2-proc-arrow" aria-hidden="true">
                  ›
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="contact" className="mhw-lx2-contact-section" aria-label="Contact">
          <div className="mhw-lx2-contact-left">
            <div className="mhw-lx2-s-eyebrow">
              <span className="mhw-lx2-s-eyebrow-line" aria-hidden="true" />
              <span className="mhw-lx2-s-eyebrow-text">{contact.eyebrow}</span>
            </div>
            <h2 className="mhw-lx2-s-title" style={{ marginBottom: '3rem' }}>
              {contact.titleLine1}
              <br />
              {contact.titleLine2}
            </h2>
            <div className="mhw-lx2-contact-detail">
              <div className="mhw-lx2-cd-l">{contact.websiteLabel}</div>
              <div className="mhw-lx2-cd-v">{contact.website}</div>
            </div>
            <div className="mhw-lx2-contact-detail">
              <div className="mhw-lx2-cd-l">{contact.emailLabel}</div>
              <div className="mhw-lx2-cd-v">
                <a href={`mailto:${contact.email}`}>{contact.email}</a>
              </div>
            </div>
            <div className="mhw-lx2-contact-detail">
              <div className="mhw-lx2-cd-l">{contact.instagramLabel}</div>
              <div className="mhw-lx2-cd-v">
                <a href={contact.instagramUrl} target="_blank" rel="noreferrer">
                  {contact.instagramHandle}
                </a>
              </div>
            </div>
            <div className="mhw-lx2-contact-detail">
              <div className="mhw-lx2-cd-l">{contact.studioLabel}</div>
              <div className="mhw-lx2-cd-v">{contact.studio}</div>
            </div>
            <div className="mhw-lx2-contact-detail">
              <div className="mhw-lx2-cd-l">{contact.serviceAreaLabel}</div>
              <div className="mhw-lx2-cd-v">{contact.serviceArea}</div>
            </div>
          </div>
          <div className="mhw-lx2-contact-right">
            {enquiryStatus === 'sent' ? (
              <div className="cf2-success">
                <div className="cf2-success-icon" aria-hidden="true">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M10 16.5l4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className="cf2-success-title">Request received</h3>
                <p className="cf2-success-sub">We'll be in touch within 24 hours to discuss your project.</p>
                {enquiryDetail && <p className="cf2-success-note">{enquiryDetail}</p>}
              </div>
            ) : (
              <>
                <h3 className="cf2-form-title">Get your free estimate</h3>
                <p className="cf2-form-sub">Tell us about your project — we'll respond within 24 hours.</p>
                <form
                  className="cf2-form"
                  onSubmit={(ev) => { void submitEnquiry(ev) }}
                  onInput={onEnquiryFormChange}
                >
                  <div className="cf2-row-2col">
                    <div className="cf2-field">
                      <input name="firstName" className="cf2-input" type="text" autoComplete="given-name" placeholder=" " />
                      <label className="cf2-label">First name</label>
                    </div>
                    <div className="cf2-field">
                      <input name="lastName" className="cf2-input" type="text" autoComplete="family-name" placeholder=" " />
                      <label className="cf2-label">Last name</label>
                    </div>
                  </div>
                  <div className="cf2-field">
                    <input name="email" className="cf2-input" type="email" autoComplete="email" placeholder=" " required />
                    <label className="cf2-label">Email address <span className="cf2-required">*</span></label>
                  </div>
                  <div className="cf2-field">
                    <input name="phone" className="cf2-input" type="tel" autoComplete="tel" placeholder=" " />
                    <label className="cf2-label">Phone number</label>
                  </div>
                  <div className="cf2-field">
                    <input name="project" className="cf2-input" type="text" placeholder=" " />
                    <label className="cf2-label">Project type</label>
                    <span className="cf2-hint">e.g. dining table, media wall, built-in shelving</span>
                  </div>
                  <div className="cf2-field">
                    <textarea name="message" className="cf2-input cf2-textarea" placeholder=" " />
                    <label className="cf2-label">Describe your vision</label>
                    <span className="cf2-hint">Dimensions, preferred wood species, timeline…</span>
                  </div>
                  <button type="submit" className="cf2-submit" disabled={enquiryStatus === 'sending'}>
                    {enquiryStatus === 'sending' ? (
                      <>
                        <span className="cf2-spinner" aria-hidden="true" />
                        Sending…
                      </>
                    ) : (
                      <>
                        Request free estimate
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </>
                    )}
                  </button>
                  {enquiryStatus === 'error' && enquiryDetail && (
                    <p role="alert" className="cf2-error-msg">
                      {enquiryDetail}
                      {' — or email '}
                      <a href={`mailto:${content.contact.email}`}>{content.contact.email}</a>
                    </p>
                  )}
                </form>
              </>
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
