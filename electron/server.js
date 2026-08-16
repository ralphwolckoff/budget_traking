// ── Serveur Express local pour le mode online/multi-devices ──────────────────
// Tourne sur localhost:47291 — accessible uniquement depuis la machine locale
// Pour accès réseau local (multi-postes), changer host à '0.0.0.0'

const http   = require('http')
const crypto = require('crypto')
const fs     = require('fs')
const path   = require('path')
const auth   = require('./auth')

const PORT = 47291
let documentsPath = ''
let server = null

// ── Sessions en mémoire (token → username) ───────────────────────────────────
const sessions = new Map()

function createToken() {
  return crypto.randomBytes(32).toString('hex')
}

function getSession(token) {
  return token ? sessions.get(token) : null
}

// ── Router simple sans dépendances externes ───────────────────────────────────
function parseBody(req) {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', () => {
      try { resolve(JSON.parse(body)) } catch(e) { resolve({}) }
    })
  })
}

function respond(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  })
  res.end(JSON.stringify(data))
}

async function handleRequest(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') { respond(res, 200, {}); return }

  const url    = req.url.split('?')[0]
  const method = req.method
  const token  = (req.headers.authorization || '').replace('Bearer ', '')

  // ── POST /auth/register ──
  if (method === 'POST' && url === '/auth/register') {
    const { username, password } = await parseBody(req)
    const result = auth.register(documentsPath, username, password)
    if (result.success) {
      const token = createToken()
      sessions.set(token, result.username)
      respond(res, 201, { ...result, token })
    } else {
      respond(res, 400, result)
    }
    return
  }

  // ── POST /auth/login ──
  if (method === 'POST' && url === '/auth/login') {
    const { username, password } = await parseBody(req)
    const result = auth.login(documentsPath, username, password)
    if (result.success) {
      const token = createToken()
      sessions.set(token, result.username)
      respond(res, 200, { ...result, token })
    } else {
      respond(res, 401, result)
    }
    return
  }

  // ── GET /auth/users ── (liste pour l'écran de connexion)
  if (method === 'GET' && url === '/auth/users') {
    respond(res, 200, { users: auth.listUsers(documentsPath) })
    return
  }

  // ── Routes protégées ──
  const username = getSession(token)
  if (!username) { respond(res, 401, { error: 'Non authentifié' }); return }

  // ── GET /data ──
  if (method === 'GET' && url === '/data') {
    const dataPath = auth.getUserDataPath(documentsPath, username)
    if (fs.existsSync(dataPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
        respond(res, 200, { data, username })
      } catch(e) { respond(res, 500, { error: 'Erreur lecture données' }) }
    } else {
      respond(res, 200, { data: null, username })
    }
    return
  }

  // ── PUT /data ──
  if (method === 'PUT' && url === '/data') {
    const { data } = await parseBody(req)
    const dataPath  = auth.getUserDataPath(documentsPath, username)
    try {
      fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8')
      respond(res, 200, { success: true, savedAt: new Date().toISOString() })
    } catch (e) { respond(res, 500, { error: e.message }) }
    return
  }

  // ── POST /logout ──
  if (method === 'POST' && url === '/logout') {
    sessions.delete(token)
    respond(res, 200, { success: true })
    return
  }

  respond(res, 404, { error: 'Route inconnue' })
}

module.exports = {
  start(docsPath) {
    documentsPath = docsPath
    server = http.createServer(handleRequest)

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // Port déjà occupé — une autre instance tourne probablement
        // On continue sans serveur local : le mode IPC Electron suffit
        console.warn(`BudgetTracker: port ${PORT} already in use, running in IPC-only mode`)
        server = null
      } else {
        console.error('BudgetTracker server error:', err)
      }
    })

    server.listen(PORT, '127.0.0.1', () => {
      console.log(`BudgetTracker server running on http://127.0.0.1:${PORT}`)
    })

    return PORT
  },
  stop() {
    if (server) {
      server.close()
      server = null
    }
  },
  PORT,
}
