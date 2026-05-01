import { useSiteContent } from '../../context/SiteContentContext'

export function SiteFooter() {
  const year = new Date().getFullYear()
  const { content } = useSiteContent()
  const f = content.footer
  const copy = f.copyLine.replace('{year}', String(year))

  return (
    <footer className="mhw-lx2-footer">
      <div className="mhw-lx2-f-brand">
        <div className="mhw-lx2-f-name">{f.name}</div>
        <div className="mhw-lx2-f-tag">{f.tag}</div>
      </div>
      <div className="mhw-lx2-f-copy">{copy}</div>
      <div className="mhw-lx2-f-links">
        <a href={content.contact.instagramUrl} target="_blank" rel="noreferrer">
          Instagram
        </a>
        <a href={f.externalSiteUrl}>Website</a>
        <a href={`mailto:${content.contact.email}`}>Email</a>
      </div>
    </footer>
  )
}
