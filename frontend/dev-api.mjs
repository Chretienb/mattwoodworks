/**
 * Dev API: auth + site content (JSON file) + image uploads into public/images/uploads.
 * Run: npm run dev:api
 */
import http from 'node:http'
import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT) || 8080
const SITE_FILE = join(__dirname, 'site-content.json')
const UPLOAD_DIR = join(__dirname, 'public', 'images', 'uploads')
const ESTIMATES_FILE = join(__dirname, 'estimate_requests.jsonl')

const ADMIN_EMAIL = String(process.env.MHW_ADMIN_EMAIL ?? 'admin@mattwoodworks.local')
  .trim()
  .toLowerCase()

const ADMIN_PASSWORD = String(process.env.MHW_ADMIN_PASSWORD ?? 'devpassword')

/** @type {Map<string, { password: string, email: string, role: string }>} */
const USERS = new Map([
  [
    ADMIN_EMAIL,
    {
      password: ADMIN_PASSWORD,
      email: ADMIN_EMAIL,
      role: 'admin',
    },
  ],
])

/** @type {Map<string, { email: string, role: string }>} */
const sessions = new Map()

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  })
  res.end(body)
}

function sendText(res, status, text) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end(text)
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8')
        resolve(raw ? JSON.parse(raw) : {})
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

function readSiteFile() {
  try {
    const raw = readFileSync(SITE_FILE, 'utf8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function writeSiteFile(obj) {
  writeFileSync(SITE_FILE, JSON.stringify(obj, null, 2), 'utf8')
}

function getSession(req) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice(7).trim()
  return sessions.get(token) ?? null
}

function safeUploadBasename(name) {
  const base = basename(String(name)).replace(/[^a-zA-Z0-9._-]/g, '')
  if (!base || base.length > 180) return null
  if (!/\.(png|jpe?g|webp|gif)$/i.test(base)) return null
  return base
}

mkdirSync(UPLOAD_DIR, { recursive: true })

const server = http.createServer(async (req, res) => {
  const host = req.headers.host ?? '127.0.0.1'
  const url = new URL(req.url ?? '/', `http://${host}`)
  let path = url.pathname
  if (path !== '/' && path.endsWith('/')) {
    path = path.slice(0, -1)
  }

  if (req.method === 'GET' && path === '/health') {
    return sendJson(res, 200, { ok: true })
  }

  if (req.method === 'GET' && path === '/api/site/content') {
    const data = readSiteFile()
    return sendJson(res, 200, data)
  }

  if (req.method === 'POST' && path === '/api/auth/login') {
    try {
      const body = await parseBody(req)
      const password = String(body.password ?? '')
      const user = USERS.get(ADMIN_EMAIL)
      if (!user || user.password !== password) {
        return sendText(res, 401, 'Invalid password.')
      }
      const token = randomUUID()
      sessions.set(token, { email: user.email, role: user.role })
      return sendJson(res, 200, { token, role: user.role })
    } catch {
      return sendText(res, 400, 'Invalid request body.')
    }
  }

  if (req.method === 'GET' && path === '/api/admin/me') {
    const sess = getSession(req)
    if (!sess) return sendText(res, 401, 'Unauthorized')
    return sendJson(res, 200, { email: sess.email, role: sess.role })
  }

  if (req.method === 'PUT' && path === '/api/admin/site-content') {
    const sess = getSession(req)
    if (!sess) return sendText(res, 401, 'Unauthorized')
    try {
      const body = await parseBody(req)
      if (!body || typeof body !== 'object') {
        return sendText(res, 400, 'Invalid JSON.')
      }
      writeSiteFile(body)
      return sendJson(res, 200, { ok: true })
    } catch {
      return sendText(res, 400, 'Invalid request body.')
    }
  }

  if (req.method === 'POST' && path === '/api/admin/upload-image') {
    const sess = getSession(req)
    if (!sess) return sendText(res, 401, 'Unauthorized')
    try {
      const body = await parseBody(req)
      const fn = safeUploadBasename(body.filename ?? '')
      const b64 = String(body.base64 ?? '').replace(/^data:[^;]+;base64,/, '')
      if (!fn || !b64) return sendText(res, 400, 'filename and base64 required.')
      const buf = Buffer.from(b64, 'base64')
      if (!buf.length || buf.length > 12 * 1024 * 1024) {
        return sendText(res, 400, 'Invalid or too large image.')
      }
      const destName = `${Date.now()}-${fn}`
      const destPath = join(UPLOAD_DIR, destName)
      writeFileSync(destPath, buf)
      const publicUrl = `/images/uploads/${destName}`
      return sendJson(res, 200, { url: publicUrl })
    } catch {
      return sendText(res, 400, 'Upload failed.')
    }
  }

  if (req.method === 'GET' && path === '/api/admin/estimates') {
    const sess = getSession(req)
    if (!sess) return sendText(res, 401, 'Unauthorized')
    const raw = existsSync(ESTIMATES_FILE) ? readFileSync(ESTIMATES_FILE, 'utf8') : ''
    const rows = raw
      .split('\n')
      .filter(Boolean)
      .map((l) => { try { return JSON.parse(l) } catch { return null } })
      .filter(Boolean)
      .reverse()
    return sendJson(res, 200, rows)
  }

  // PATCH /api/admin/estimates/:id  — update CRM fields in the local JSONL file
  if (req.method === 'PATCH' && path.startsWith('/api/admin/estimates/')) {
    const sess = getSession(req)
    if (!sess) return sendText(res, 401, 'Unauthorized')
    const id = path.slice('/api/admin/estimates/'.length)
    if (!id) return sendText(res, 400, 'Missing id')
    try {
      const patch = await parseBody(req)
      const allowed = ['status','notes','quote_amount','quote_sent_at','quote_accepted','follow_up_at','responded_at']
      const raw = existsSync(ESTIMATES_FILE) ? readFileSync(ESTIMATES_FILE, 'utf8') : ''
      const rows = raw
        .split('\n')
        .filter(Boolean)
        .map((l) => { try { return JSON.parse(l) } catch { return null } })
        .filter(Boolean)
      const updated = rows.map((r) => {
        if (r.id !== id) return r
        const next = { ...r }
        for (const k of allowed) {
          if (Object.prototype.hasOwnProperty.call(patch, k)) next[k] = patch[k]
        }
        return next
      })
      writeFileSync(ESTIMATES_FILE, updated.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8')
      return sendJson(res, 200, { ok: true })
    } catch {
      return sendText(res, 400, 'Invalid request body.')
    }
  }

  if (req.method === 'POST' && path === '/api/estimate-requests') {
    try {
      const body = await parseBody(req)
      const email = String(body.email ?? '').trim()
      if (email.length < 3) return sendText(res, 400, 'Email required.')
      const msg = body.message != null ? String(body.message) : ''
      if (msg.length > 20000) return sendText(res, 400, 'Message too long.')
      const line = JSON.stringify({
        first_name: body.first_name,
        last_name: body.last_name,
        email,
        phone: body.phone,
        project_type: body.project_type,
        message: body.message,
        source: body.source ?? 'website',
      })
      appendFileSync(ESTIMATES_FILE, `${line}\n`, 'utf8')
      res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ ok: true }))
      return
    } catch {
      return sendText(res, 400, 'Invalid request body.')
    }
  }

  sendText(res, 404, 'Not found')
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Dev API listening at http://127.0.0.1:${PORT}`)
  console.log(`Site content file: ${SITE_FILE}`)
  console.log(`Leads log: ${ESTIMATES_FILE}`)
  if (!existsSync(SITE_FILE)) {
    console.log('(No site-content.json yet — site uses app defaults until you save from Admin.)')
  }
})
