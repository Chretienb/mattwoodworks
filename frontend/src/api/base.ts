/** Base URL for API calls. Empty string = same origin (Vite dev proxy → backend). */
export function apiBase(): string {
  return (import.meta.env.VITE_API_URL as string | undefined) ?? ''
}
