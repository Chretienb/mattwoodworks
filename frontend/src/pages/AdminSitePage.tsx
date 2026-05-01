import { useEffect, useState } from 'react'
import { saveSiteContent, uploadSiteImage } from '../api/siteContentApi'
import { useAuth } from '../context/AuthContext'
import { useSiteContent } from '../context/SiteContentContext'
import { readFileAsBase64 } from '../lib/fileBase64'
import type { SiteContent } from '../types/siteContent'

export function AdminSitePage() {
  const { token } = useAuth()
  const { content, reload, loading } = useSiteContent()
  const [draft, setDraft] = useState<SiteContent | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading) setDraft(structuredClone(content))
  }, [content, loading])

  async function onUpload(file: File, applyUrl: (url: string) => void) {
    if (!token) {
      setError('Sign in again to upload.')
      return
    }
    setError(null)
    try {
      const b64 = await readFileAsBase64(file)
      const url = await uploadSiteImage(token, file.name, b64)
      applyUrl(url)
      setMessage(`Uploaded: ${url}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.')
    }
  }

  async function onSave() {
    if (!token || !draft) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      await saveSiteContent(token, draft)
      setMessage('Saved. Public site will use this after refresh.')
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  if (loading && !draft) {
    return (
      <p className="muted" aria-busy="true">
        Loading site content…
      </p>
    )
  }
  if (!draft) return null

  const d = draft

  return (
    <div className="stack gap-lg admin-cms">
      <div className="stack tight">
        <h1 className="title-lg">Site &amp; copy</h1>
        <p className="muted small">
          Edit text and image URLs. Use <strong>Upload</strong> to add files (saved under{' '}
          <code className="inline-code">/images/uploads/</code>). Run{' '}
          <code className="inline-code">npm run dev:api</code> so changes persist to{' '}
          <code className="inline-code">site-content.json</code>.
        </p>
      </div>

      {message ? (
        <p className="small" style={{ color: 'var(--mhw-pine)' }}>
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="error small" role="alert">
          {error}
        </p>
      ) : null}

      <section className="card pad stack gap-md">
        <h2 className="title-md">Hero</h2>
        <label className="field">
          <span>Kicker line</span>
          <input
            value={d.hero.kicker}
            onChange={(e) =>
              setDraft({ ...d, hero: { ...d.hero, kicker: e.target.value } })
            }
          />
        </label>
        <div className="admin-3col">
          <label className="field">
            <span>Title (before emphasis)</span>
            <input
              value={d.hero.titleLineBefore}
              onChange={(e) =>
                setDraft({
                  ...d,
                  hero: { ...d.hero, titleLineBefore: e.target.value },
                })
              }
            />
          </label>
          <label className="field">
            <span>Emphasized word</span>
            <input
              value={d.hero.titleEm}
              onChange={(e) =>
                setDraft({ ...d, hero: { ...d.hero, titleEm: e.target.value } })
              }
            />
          </label>
          <label className="field">
            <span>Title (after)</span>
            <input
              value={d.hero.titleLineAfter}
              onChange={(e) =>
                setDraft({
                  ...d,
                  hero: { ...d.hero, titleLineAfter: e.target.value },
                })
              }
            />
          </label>
        </div>
        <label className="field">
          <span>Intro paragraph</span>
          <textarea
            rows={3}
            value={d.hero.body}
            onChange={(e) =>
              setDraft({ ...d, hero: { ...d.hero, body: e.target.value } })
            }
          />
        </label>
        <label className="field">
          <span>Hero image URL</span>
          <input
            value={d.hero.image.src}
            onChange={(e) =>
              setDraft({
                ...d,
                hero: { ...d.hero, image: { ...d.hero.image, src: e.target.value } },
              })
            }
          />
        </label>
        <label className="field">
          <span>Hero srcSet (optional)</span>
          <input
            value={d.hero.image.srcSet ?? ''}
            onChange={(e) =>
              setDraft({
                ...d,
                hero: {
                  ...d.hero,
                  image: { ...d.hero.image, srcSet: e.target.value || undefined },
                },
              })
            }
          />
        </label>
        <label className="field">
          <span>Hero image alt</span>
          <input
            value={d.hero.image.alt}
            onChange={(e) =>
              setDraft({
                ...d,
                hero: { ...d.hero, image: { ...d.hero.image, alt: e.target.value } },
              })
            }
          />
        </label>
        <label className="field">
          <span>Replace hero image</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f)
                void onUpload(f, (url) =>
                  setDraft({
                    ...d,
                    hero: { ...d.hero, image: { ...d.hero.image, src: url } },
                  }),
                )
            }}
          />
        </label>
        <label className="field">
          <span>Tag on photo (name)</span>
          <input
            value={d.hero.tagPrint}
            onChange={(e) =>
              setDraft({ ...d, hero: { ...d.hero, tagPrint: e.target.value } })
            }
          />
        </label>
        {d.hero.stats.map((row, i) => (
          <div key={i} className="admin-2col">
            <label className="field">
              <span>{`Stat ${i + 1} value`}</span>
              <input
                value={row.value}
                onChange={(e) => {
                  const stats = [...d.hero.stats]
                  stats[i] = { ...stats[i], value: e.target.value }
                  setDraft({ ...d, hero: { ...d.hero, stats } })
                }}
              />
            </label>
            <label className="field">
              <span>{`Stat ${i + 1} label`}</span>
              <input
                value={row.label}
                onChange={(e) => {
                  const stats = [...d.hero.stats]
                  stats[i] = { ...stats[i], label: e.target.value }
                  setDraft({ ...d, hero: { ...d.hero, stats } })
                }}
              />
            </label>
          </div>
        ))}
      </section>

      <section className="card pad stack gap-md">
        <h2 className="title-md">Ticker (one phrase per line)</h2>
        <label className="field">
          <span>Lines</span>
          <textarea
            rows={6}
            value={d.ticker.join('\n')}
            onChange={(e) =>
              setDraft({
                ...d,
                ticker: e.target.value
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>
      </section>

      <section className="card pad stack gap-md">
        <h2 className="title-md">About</h2>
        <label className="field">
          <span>Eyebrow</span>
          <input
            value={d.about.eyebrow}
            onChange={(e) =>
              setDraft({ ...d, about: { ...d.about, eyebrow: e.target.value } })
            }
          />
        </label>
        <div className="admin-2col">
          <label className="field">
            <span>Name line 1</span>
            <input
              value={d.about.nameLine1}
              onChange={(e) =>
                setDraft({ ...d, about: { ...d.about, nameLine1: e.target.value } })
              }
            />
          </label>
          <label className="field">
            <span>Name line 2</span>
            <input
              value={d.about.nameLine2}
              onChange={(e) =>
                setDraft({ ...d, about: { ...d.about, nameLine2: e.target.value } })
              }
            />
          </label>
        </div>
        {d.about.paragraphs.map((p, i) => (
          <label key={i} className="field">
            <span>{`Paragraph ${i + 1}`}</span>
            <textarea
              rows={3}
              value={p}
              onChange={(e) => {
                const paragraphs = [...d.about.paragraphs] as [string, string, string]
                paragraphs[i] = e.target.value
                setDraft({ ...d, about: { ...d.about, paragraphs } })
              }}
            />
          </label>
        ))}
        <label className="field">
          <span>Media caption</span>
          <input
            value={d.about.mediaCaption}
            onChange={(e) =>
              setDraft({ ...d, about: { ...d.about, mediaCaption: e.target.value } })
            }
          />
        </label>
        {(
          [
            ['craftsman', 'Craftsman photo'],
            ['guitarHead', 'Guitar headstock'],
            ['guitarBody', 'Guitar body'],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="stack tight pad" style={{ border: '1px solid var(--rh-line)', borderRadius: 8 }}>
            <h3 className="eyebrow">{label}</h3>
            <label className="field">
              <span>URL</span>
              <input
                value={d.about.images[key].src}
                onChange={(e) =>
                  setDraft({
                    ...d,
                    about: {
                      ...d.about,
                      images: {
                        ...d.about.images,
                        [key]: { ...d.about.images[key], src: e.target.value },
                      },
                    },
                  })
                }
              />
            </label>
            <label className="field">
              <span>Alt</span>
              <input
                value={d.about.images[key].alt}
                onChange={(e) =>
                  setDraft({
                    ...d,
                    about: {
                      ...d.about,
                      images: {
                        ...d.about.images,
                        [key]: { ...d.about.images[key], alt: e.target.value },
                      },
                    },
                  })
                }
              />
            </label>
            <label className="field">
              <span>Upload</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f)
                    void onUpload(f, (url) =>
                      setDraft({
                        ...d,
                        about: {
                          ...d.about,
                          images: {
                            ...d.about.images,
                            [key]: { ...d.about.images[key], src: url },
                          },
                        },
                      }),
                    )
                }}
              />
            </label>
          </div>
        ))}
        {d.about.stats.map((row, i) => (
          <div key={i} className="admin-2col">
            <label className="field">
              <span>{`About stat ${i + 1} value`}</span>
              <input
                value={row.value}
                onChange={(e) => {
                  const stats = [...d.about.stats]
                  stats[i] = { ...stats[i], value: e.target.value }
                  setDraft({ ...d, about: { ...d.about, stats } })
                }}
              />
            </label>
            <label className="field">
              <span>{`About stat ${i + 1} label`}</span>
              <input
                value={row.label}
                onChange={(e) => {
                  const stats = [...d.about.stats]
                  stats[i] = { ...stats[i], label: e.target.value }
                  setDraft({ ...d, about: { ...d.about, stats } })
                }}
              />
            </label>
          </div>
        ))}
      </section>

      <section className="card pad stack gap-md">
        <h2 className="title-md">Services block</h2>
        <div className="admin-3col">
          <label className="field">
            <span>Eyebrow</span>
            <input
              value={d.servicesHead.eyebrow}
              onChange={(e) =>
                setDraft({
                  ...d,
                  servicesHead: { ...d.servicesHead, eyebrow: e.target.value },
                })
              }
            />
          </label>
          <label className="field">
            <span>Title</span>
            <input
              value={d.servicesHead.title}
              onChange={(e) =>
                setDraft({
                  ...d,
                  servicesHead: { ...d.servicesHead, title: e.target.value },
                })
              }
            />
          </label>
          <label className="field">
            <span>CTA label</span>
            <input
              value={d.servicesHead.ctaLabel}
              onChange={(e) =>
                setDraft({
                  ...d,
                  servicesHead: { ...d.servicesHead, ctaLabel: e.target.value },
                })
              }
            />
          </label>
        </div>
        {d.services.map((s, i) => (
          <div
            key={s.n}
            className="stack tight pad"
            style={{ border: '1px solid var(--rh-line)', borderRadius: 8 }}
          >
            <span className="eyebrow">Service {s.n}</span>
            <label className="field">
              <span>Title</span>
              <input
                value={s.title}
                onChange={(e) => {
                  const services = [...d.services]
                  services[i] = { ...services[i], title: e.target.value }
                  setDraft({ ...d, services })
                }}
              />
            </label>
            <label className="field">
              <span>Description</span>
              <textarea
                rows={2}
                value={s.desc}
                onChange={(e) => {
                  const services = [...d.services]
                  services[i] = { ...services[i], desc: e.target.value }
                  setDraft({ ...d, services })
                }}
              />
            </label>
          </div>
        ))}
      </section>

      <section className="card pad stack gap-md">
        <h2 className="title-md">Mood board (under services)</h2>
        <label className="field">
          <span>
            <input
              type="checkbox"
              checked={d.inspiration.enabled}
              onChange={(e) =>
                setDraft({
                  ...d,
                  inspiration: { ...d.inspiration, enabled: e.target.checked },
                })
              }
            />{' '}
            Show section
          </span>
        </label>
        <label className="field">
          <span>Image URL</span>
          <input
            value={d.inspiration.src}
            onChange={(e) =>
              setDraft({
                ...d,
                inspiration: { ...d.inspiration, src: e.target.value },
              })
            }
          />
        </label>
        <label className="field">
          <span>Alt text</span>
          <input
            value={d.inspiration.alt}
            onChange={(e) =>
              setDraft({
                ...d,
                inspiration: { ...d.inspiration, alt: e.target.value },
              })
            }
          />
        </label>
        <label className="field">
          <span>Upload</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f)
                void onUpload(f, (url) =>
                  setDraft({
                    ...d,
                    inspiration: { ...d.inspiration, src: url },
                  }),
                )
            }}
          />
        </label>
      </section>

      <section className="card pad stack gap-md">
        <h2 className="title-md">Portfolio heading</h2>
        <label className="field">
          <span>Eyebrow</span>
          <input
            value={d.portfolioHead.eyebrow}
            onChange={(e) =>
              setDraft({
                ...d,
                portfolioHead: { ...d.portfolioHead, eyebrow: e.target.value },
              })
            }
          />
        </label>
        <label className="field">
          <span>Title</span>
          <input
            value={d.portfolioHead.title}
            onChange={(e) =>
              setDraft({
                ...d,
                portfolioHead: { ...d.portfolioHead, title: e.target.value },
              })
            }
          />
        </label>
      </section>

      <section className="card pad stack gap-md">
        <h2 className="title-md">Quote</h2>
        <label className="field">
          <span>Quote text</span>
          <textarea
            rows={4}
            value={d.quote.text}
            onChange={(e) =>
              setDraft({ ...d, quote: { ...d.quote, text: e.target.value } })
            }
          />
        </label>
        <label className="field">
          <span>Attribution</span>
          <input
            value={d.quote.attribution}
            onChange={(e) =>
              setDraft({
                ...d,
                quote: { ...d.quote, attribution: e.target.value },
              })
            }
          />
        </label>
      </section>

      <section className="card pad stack gap-md">
        <h2 className="title-md">Process</h2>
        <div className="admin-2col">
          <label className="field">
            <span>Eyebrow</span>
            <input
              value={d.processHead.eyebrow}
              onChange={(e) =>
                setDraft({
                  ...d,
                  processHead: { ...d.processHead, eyebrow: e.target.value },
                })
              }
            />
          </label>
          <label className="field">
            <span>Title</span>
            <input
              value={d.processHead.title}
              onChange={(e) =>
                setDraft({
                  ...d,
                  processHead: { ...d.processHead, title: e.target.value },
                })
              }
            />
          </label>
        </div>
        {d.process.map((step, i) => (
          <div
            key={i}
            className="stack tight pad"
            style={{ border: '1px solid var(--rh-line)', borderRadius: 8 }}
          >
            <span className="eyebrow">Step {i + 1}</span>
            <label className="field">
              <span>Title</span>
              <input
                value={step.title}
                onChange={(e) => {
                  const process = [...d.process]
                  process[i] = { ...process[i], title: e.target.value }
                  setDraft({ ...d, process })
                }}
              />
            </label>
            <label className="field">
              <span>Description</span>
              <textarea
                rows={2}
                value={step.desc}
                onChange={(e) => {
                  const process = [...d.process]
                  process[i] = { ...process[i], desc: e.target.value }
                  setDraft({ ...d, process })
                }}
              />
            </label>
          </div>
        ))}
      </section>

      <section className="card pad stack gap-md">
        <h2 className="title-md">Contact &amp; footer</h2>
        <div className="admin-2col">
          <label className="field">
            <span>Contact section — title line 1</span>
            <input
              value={d.contact.titleLine1}
              onChange={(e) =>
                setDraft({
                  ...d,
                  contact: { ...d.contact, titleLine1: e.target.value },
                })
              }
            />
          </label>
          <label className="field">
            <span>Contact section — title line 2</span>
            <input
              value={d.contact.titleLine2}
              onChange={(e) =>
                setDraft({
                  ...d,
                  contact: { ...d.contact, titleLine2: e.target.value },
                })
              }
            />
          </label>
        </div>
        <label className="field">
          <span>Contact eyebrow</span>
          <input
            value={d.contact.eyebrow}
            onChange={(e) =>
              setDraft({ ...d, contact: { ...d.contact, eyebrow: e.target.value } })
            }
          />
        </label>
        <label className="field">
          <span>Form eyebrow</span>
          <input
            value={d.contact.formEyebrow}
            onChange={(e) =>
              setDraft({
                ...d,
                contact: { ...d.contact, formEyebrow: e.target.value },
              })
            }
          />
        </label>
        <label className="field">
          <span>Studio location (display)</span>
          <input
            value={d.contact.studio}
            onChange={(e) =>
              setDraft({ ...d, contact: { ...d.contact, studio: e.target.value } })
            }
          />
        </label>
        <label className="field">
          <span>Mailto subject</span>
          <input
            value={d.contact.mailtoSubject}
            onChange={(e) =>
              setDraft({
                ...d,
                contact: { ...d.contact, mailtoSubject: e.target.value },
              })
            }
          />
        </label>
        <div className="admin-2col">
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={d.contact.email}
              onChange={(e) =>
                setDraft({ ...d, contact: { ...d.contact, email: e.target.value } })
              }
            />
          </label>
          <label className="field">
            <span>Website display</span>
            <input
              value={d.contact.website}
              onChange={(e) =>
                setDraft({ ...d, contact: { ...d.contact, website: e.target.value } })
              }
            />
          </label>
        </div>
        <label className="field">
          <span>Instagram URL</span>
          <input
            value={d.contact.instagramUrl}
            onChange={(e) =>
              setDraft({
                ...d,
                contact: { ...d.contact, instagramUrl: e.target.value },
              })
            }
          />
        </label>
        <label className="field">
          <span>Instagram handle (display)</span>
          <input
            value={d.contact.instagramHandle}
            onChange={(e) =>
              setDraft({
                ...d,
                contact: { ...d.contact, instagramHandle: e.target.value },
              })
            }
          />
        </label>
        <label className="field">
          <span>Footer — external site URL</span>
          <input
            value={d.footer.externalSiteUrl}
            onChange={(e) =>
              setDraft({
                ...d,
                footer: { ...d.footer, externalSiteUrl: e.target.value },
              })
            }
          />
        </label>
        <label className="field">
          <span>Footer — name</span>
          <input
            value={d.footer.name}
            onChange={(e) =>
              setDraft({ ...d, footer: { ...d.footer, name: e.target.value } })
            }
          />
        </label>
        <label className="field">
          <span>Footer — tagline under name</span>
          <input
            value={d.footer.tag}
            onChange={(e) =>
              setDraft({ ...d, footer: { ...d.footer, tag: e.target.value } })
            }
          />
        </label>
        <label className="field">
          <span>Footer — copyright line (use {'{year}'} for current year)</span>
          <input
            value={d.footer.copyLine}
            onChange={(e) =>
              setDraft({ ...d, footer: { ...d.footer, copyLine: e.target.value } })
            }
          />
        </label>
      </section>

      <button type="button" className="btn" disabled={saving || !token} onClick={() => void onSave()}>
        {saving ? 'Saving…' : 'Save all site content'}
      </button>
    </div>
  )
}
