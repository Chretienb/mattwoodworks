import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { fetchSiteContentPartial } from '../api/siteContentApi'
import { defaultSiteContent } from '../data/siteContent.defaults'
import { deepMerge } from '../lib/deepMerge'
import type { SiteContent } from '../types/siteContent'

type SiteContentContextValue = {
  content: SiteContent
  loading: boolean
  reload: () => Promise<void>
}

const SiteContentContext = createContext<SiteContentContextValue | null>(null)

export function SiteContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<SiteContent>(() => structuredClone(defaultSiteContent))
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const partial = await fetchSiteContentPartial()
      const base = structuredClone(defaultSiteContent) as unknown as Record<string, unknown>
      setContent(
        deepMerge(base, (partial ?? {}) as Record<string, unknown>) as SiteContent,
      )
    } catch {
      setContent(structuredClone(defaultSiteContent))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const value = useMemo(
    () => ({
      content,
      loading,
      reload,
    }),
    [content, loading, reload],
  )

  return (
    <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>
  )
}

export function useSiteContent() {
  const ctx = useContext(SiteContentContext)
  if (!ctx) {
    throw new Error('useSiteContent must be used within SiteContentProvider')
  }
  return ctx
}
