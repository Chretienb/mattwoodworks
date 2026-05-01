import { apiBase } from './base'

export type EstimatePayload = {
  first_name?: string
  last_name?: string
  email: string
  phone?: string
  project_type?: string
  message?: string
  source?: string
}

/** POST public lead to backend / Rust API (or Node dev-api). */
export async function submitEstimateRequest(payload: EstimatePayload): Promise<void> {
  const res = await fetch(`${apiBase()}/api/estimate-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      source: payload.source ?? 'website',
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Request failed (${res.status})`)
  }
}
