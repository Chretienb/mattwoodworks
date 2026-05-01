/**
 * API origin for fetch().
 * - Set VITE_API_URL when the browser must call a different host (production / custom).
 * - Vite dev: use same origin (empty) so requests go to the dev server and the Vite proxy
 *   forwards `/api` and `/health` to mhw-api. Avoids CORS (localhost:5173 vs 127.0.0.1:8080
 *   are different sites from the browser’s point of view).
 */
export function apiBase(): string {
  const fromEnv = import.meta.env.VITE_API_URL as string | undefined
  if (fromEnv != null && String(fromEnv).trim() !== '') {
    return String(fromEnv).replace(/\/$/, '')
  }
  return ''
}
