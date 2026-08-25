// ── Serveur local pour le mode online/multi-devices ───────────────────────────
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

// Réponse fichier binaire (CSV/PDF) — Content-Disposition exposé explicitement
// car le renderer (autre origine que 127.0.0.1:47291) doit pouvoir le lire
// via fetch() pour en extraire le nom de fichier.
function respondFile(res, status, buffer, contentType, filename) {
  res.writeHead(status, {
    'Content-Type': contentType,
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Length': buffer.length,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Expose-Headers': 'Content-Disposition',
  })
  res.end(buffer)
}

// ── Lecture des données utilisateur — factorisé (servait déjà GET /data,
// sert maintenant aussi à /data/search et /reports/*) ──────────────────────────
function loadUserData(username) {
  const dataPath = auth.getUserDataPath(documentsPath, username)
  if (!fs.existsSync(dataPath)) return null
  try {
    return JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
  } catch (e) {
    return null
  }
}

// Aplatit data.months en une liste { id, monthKey, amount, description, category, date }
function flattenExpenses(data) {
  const out = []
  const months = data?.months || {}
  for (const monthKey of Object.keys(months)) {
    for (const e of months[monthKey] || []) {
      out.push({
        id: String(e.id),
        monthKey,
        amount: e.amount,
        description: e.description,
        category: e.category,
        date: e.date,
      })
    }
  }
  return out
}

// ── CSV ────────────────────────────────────────────────────────────────────────
function csvEscape(field) {
  const s = String(field ?? '')
  if (s.includes(';') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function buildCsv(expenses) {
  const header = ['Date', 'Catégorie', 'Description', 'Montant (F CFA)'].join(';')
  const rows = expenses.map(e => {
    const d = new Date(e.date)
    const dateStr = isNaN(d.getTime()) ? e.date : d.toLocaleDateString('fr-FR')
    return [dateStr, e.category, e.description, Math.round(e.amount)]
      .map(csvEscape).join(';')
  })
  const total = expenses.reduce((s, e) => s + Math.round(e.amount), 0)
  rows.push(['', '', 'TOTAL', total].map(csvEscape).join(';'))
  // BOM UTF-8 en tête — sans ça Excel sous Windows affiche les accents
  // français ("Catégorie") comme des caractères corrompus.
  return '\uFEFF' + [header, ...rows].join('\r\n')
}

// ── PDF — généré à la main en syntaxe PDF 1.4, sans dépendance ────────────────
function escapePdfText(s) {
  return String(s ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function buildPdf(title, expenses) {
  const fmt = (n) => Math.round(n).toLocaleString('fr-FR') + ' F'
  const truncate = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

  const lines = expenses.map(e => {
    const d = new Date(e.date)
    const dateStr = isNaN(d.getTime()) ? e.date : d.toLocaleDateString('fr-FR')
    const desc = truncate(e.description || '', 38).padEnd(38, ' ')
    const cat = truncate(e.category || '', 16).padEnd(16, ' ')
    const amt = fmt(e.amount).padStart(12, ' ')
    return `${dateStr}   ${cat}${desc}${amt}`
  })
  const total = expenses.reduce((s, e) => s + Math.round(e.amount), 0)
  lines.push('') // ligne vide avant le total
  lines.push(`TOTAL${' '.repeat(56)}${fmt(total).padStart(12, ' ')}`)

  const LINES_PER_PAGE_FIRST = 40 // moins de lignes sur la 1ère page (place prise par le titre)
  const LINES_PER_PAGE_NEXT = 48
  const pages = []
  let i = 0
  if (lines.length === 0) {
    pages.push([])
  } else {
    pages.push(lines.slice(0, LINES_PER_PAGE_FIRST))
    i = LINES_PER_PAGE_FIRST
    while (i < lines.length) {
      pages.push(lines.slice(i, i + LINES_PER_PAGE_NEXT))
      i += LINES_PER_PAGE_NEXT
    }
  }

  // ── Numérotation des objets PDF ──
  let objNum = 1
  const catalogNum = objNum++
  const pagesNum = objNum++
  const fontNum = objNum++
  const fontBoldNum = objNum++
  const pageNums = []
  const contentNums = []
  for (let p = 0; p < pages.length; p++) {
    pageNums.push(objNum++)
    contentNums.push(objNum++)
  }
  const maxObjNum = objNum - 1

  const objStrings = {}
  const kids = pageNums.map(n => `${n} 0 R`).join(' ')
  objStrings[catalogNum] = `<< /Type /Catalog /Pages ${pagesNum} 0 R >>`
  objStrings[pagesNum] = `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`
  objStrings[fontNum] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`
  objStrings[fontBoldNum] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`

  pages.forEach((pageLines, idx) => {
    const pageNum = pageNums[idx]
    const contentNum = contentNums[idx]
    objStrings[pageNum] =
      `<< /Type /Page /Parent ${pagesNum} 0 R ` +
      `/Resources << /Font << /F1 ${fontNum} 0 R /F2 ${fontBoldNum} 0 R >> >> ` +
      `/MediaBox [0 0 595 842] /Contents ${contentNum} 0 R >>`

    let stream = 'BT\n'
    if (idx === 0) {
      stream += `/F2 16 Tf\n50 800 Td\n(${escapePdfText(title)}) Tj\n`
      stream += `/F1 8 Tf\n0 -28 Td\n`
    } else {
      stream += `/F1 8 Tf\n50 800 Td\n`
    }
    pageLines.forEach((line, i) => {
      if (i > 0) stream += '0 -13 Td\n'
      stream += `(${escapePdfText(line)}) Tj\n`
    })
    stream += 'ET'

    const streamLen = Buffer.byteLength(stream, 'latin1')
    objStrings[contentNum] = `<< /Length ${streamLen} >>\nstream\n${stream}\nendstream`
  })

  // ── Sérialisation avec table xref à offsets exacts ──
  const header = '%PDF-1.4\n'
  let body = ''
  const offsets = [0]
  let cursor = Buffer.byteLength(header, 'latin1')

  for (let n = 1; n <= maxObjNum; n++) {
    offsets[n] = cursor
    const objStr = `${n} 0 obj\n${objStrings[n]}\nendobj\n`
    body += objStr
    cursor += Buffer.byteLength(objStr, 'latin1')
  }

  const xrefStart = cursor
  let xref = `xref\n0 ${maxObjNum + 1}\n0000000000 65535 f \n`
  for (let n = 1; n <= maxObjNum; n++) {
    xref += `${String(offsets[n]).padStart(10, '0')} 00000 n \n`
  }
  const trailer = `trailer\n<< /Size ${maxObjNum + 1} /Root ${catalogNum} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`

  return Buffer.from(header + body + xref + trailer, 'latin1')
}

// ── Filtrage par période (mois ou année) — partagé par les 2 endpoints reports ──
function filterByPeriod(expenses, period) {
  if (period.month) return expenses.filter(e => e.monthKey === period.month)
  if (period.year) return expenses.filter(e => e.monthKey.startsWith(period.year))
  return expenses
}

function periodLabel(period) {
  if (period.month) return period.month
  if (period.year) return period.year
  return 'toutes-periodes'
}

async function handleRequest(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') { respond(res, 200, {}); return }

  const [urlPath, queryString] = req.url.split('?')
  const url    = urlPath
  const method = req.method
  const query  = new URLSearchParams(queryString || '')
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
    const data = loadUserData(username)
    respond(res, 200, { data, username })
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

  // ── GET /data/search ── — recherche globale à travers tous les mois
  if (method === 'GET' && url === '/data/search') {
    const data = loadUserData(username)
    let results = flattenExpenses(data)

    const q = (query.get('q') || '').trim().toLowerCase()
    const year = (query.get('year') || '').trim()
    const monthParam = (query.get('month') || '').trim()
    const category = (query.get('category') || '').trim()

    if (q) results = results.filter(e => (e.description || '').toLowerCase().includes(q))
    if (year) results = results.filter(e => e.monthKey.startsWith(year))
    if (monthParam) results = results.filter(e => e.monthKey === monthParam)
    if (category) results = results.filter(e => e.category === category)

    results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    respond(res, 200, { results: results.slice(0, 300) })
    return
  }

  // ── GET /reports/csv ──
  if (method === 'GET' && url === '/reports/csv') {
    const data = loadUserData(username)
    const period = { month: query.get('month') || undefined, year: query.get('year') || undefined }
    const expenses = filterByPeriod(flattenExpenses(data), period)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const csv = buildCsv(expenses)
    const buffer = Buffer.from(csv, 'utf-8')
    respondFile(res, 200, buffer, 'text/csv; charset=utf-8', `depenses-${periodLabel(period)}.csv`)
    return
  }

  // ── GET /reports/pdf ──
  if (method === 'GET' && url === '/reports/pdf') {
    const data = loadUserData(username)
    const period = { month: query.get('month') || undefined, year: query.get('year') || undefined }
    const expenses = filterByPeriod(flattenExpenses(data), period)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const title = `Rapport de dépenses — ${periodLabel(period)}`
    const buffer = buildPdf(title, expenses)
    respondFile(res, 200, buffer, 'application/pdf', `rapport-${periodLabel(period)}.pdf`)
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
    server = http.createServer((req, res) => {
      handleRequest(req, res).catch((e) => {
        console.error('BudgetTracker request error:', e)
        respond(res, 500, { error: 'Erreur interne' })
      })
    })

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