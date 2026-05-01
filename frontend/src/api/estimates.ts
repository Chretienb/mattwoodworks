import { apiBase } from './base'

export type LeadStatus = 'new' | 'contacted' | 'quoted' | 'won' | 'lost'

export type EstimateRow = {
  id?: string
  created_at?: string
  first_name?: string
  last_name?: string
  email: string
  phone?: string
  project_type?: string
  message?: string
  source?: string
  // CRM fields
  status?: LeadStatus
  notes?: string
  quote_amount?: number | null
  quote_sent_at?: string | null
  quote_accepted?: boolean | null
  follow_up_at?: string | null
  responded_at?: string | null
}

export type EstimatePatch = Partial<Pick<EstimateRow,
  'status' | 'notes' | 'quote_amount' | 'quote_sent_at' | 'quote_accepted' | 'follow_up_at' | 'responded_at'
>>

export async function fetchEstimates(token: string): Promise<EstimateRow[]> {
  const res = await fetch(`${apiBase()}/api/admin/estimates`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Could not load estimates.')
  return res.json() as Promise<EstimateRow[]>
}

export async function patchEstimate(token: string, id: string, patch: EstimatePatch): Promise<void> {
  const res = await fetch(`${apiBase()}/api/admin/estimates/${id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(patch),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Patch failed (${res.status})`)
  }
}

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
