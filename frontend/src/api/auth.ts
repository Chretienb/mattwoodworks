import { apiBase } from './base'

export type LoginResponse = {
  token: string
  role: string
}

export type AdminMeResponse = {
  email: string
  role: string
}

export async function loginRequest(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const res = await fetch(`${apiBase()}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!res.ok) {
    let detail = 'Could not sign in. Check email and password.'
    try {
      const text = await res.text()
      if (text) detail = text
    } catch {
      /* ignore */
    }
    throw new Error(detail)
  }

  return res.json() as Promise<LoginResponse>
}

export async function adminMeRequest(token: string): Promise<AdminMeResponse> {
  const res = await fetch(`${apiBase()}/api/admin/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    throw new Error('Session is no longer valid.')
  }

  const data = (await res.json()) as { email?: string; role?: string }
  return {
    email: data.email ?? '',
    role: data.role ?? '',
  }
}
