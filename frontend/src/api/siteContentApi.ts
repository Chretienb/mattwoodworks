import type { SiteContent } from '../types/siteContent'
import { apiBase } from './base'

export async function fetchSiteContentPartial(): Promise<Partial<SiteContent> | null> {
  const res = await fetch(`${apiBase()}/api/site/content`)
  if (!res.ok) return null
  try {
    const data = (await res.json()) as Partial<SiteContent>
    return data && typeof data === 'object' ? data : null
  } catch {
    return null
  }
}

export async function saveSiteContent(token: string, content: SiteContent): Promise<void> {
  const res = await fetch(`${apiBase()}/api/admin/site-content`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(content),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(t || 'Could not save site content.')
  }
}

/** Returns public URL path e.g. /images/uploads/123-file.png */
export async function uploadSiteImage(
  token: string,
  filename: string,
  base64: string,
): Promise<string> {
  const res = await fetch(`${apiBase()}/api/admin/upload-image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ filename, base64 }),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(t || 'Upload failed.')
  }
  const data = (await res.json()) as { url?: string }
  if (!data.url) throw new Error('Invalid upload response.')
  return data.url
}
